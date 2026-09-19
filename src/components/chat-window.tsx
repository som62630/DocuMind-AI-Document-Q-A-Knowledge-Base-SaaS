'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, MessageSquare, Plus, Trash2, Bot, User } from 'lucide-react'
import { CitationItem, ConversationRecord, MessageRecord } from '@/lib/actions/chat'
import { CitationDrawer } from '@/components/citation-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  createConversationAction,
  deleteConversationAction,
} from '@/lib/actions/chat'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: CitationItem[]
}

interface ChatWindowProps {
  initialConversations: ConversationRecord[]
  initialMessages?: MessageRecord[]
  initialConversationId?: string
}

// ─── Citation Renderer ─────────────────────────────────────────────────────

function renderMessageContent(
  text: string,
  citations: CitationItem[] = [],
  onCitationClick: (c: CitationItem) => void
): React.ReactNode {
  if (!citations.length) return <span>{text}</span>

  const parts = text.split(/(\[Citation \d+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\[Citation (\d+)\]/)
        if (match) {
          const idx = parseInt(match[1], 10)
          const citation = citations.find((c) => c.citationIndex === idx)
          if (citation) {
            return (
              <button
                key={i}
                onClick={() => onCitationClick(citation)}
                className="inline-flex items-center gap-1 mx-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25 transition-colors cursor-pointer"
              >
                [{idx}]
              </button>
            )
          }
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Custom Streaming Hook ──────────────────────────────────────────────────

function useStreamingChat(conversationId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingCitations, setStreamingCitations] = useState<CitationItem[]>([])

  const sendMessage = useCallback(
    async (userText: string, activeConvId: string | undefined) => {
      if (!userText.trim() || isLoading) return

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userText,
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setStreamingCitations([])

      // Optimistically add streaming assistant bubble
      const assistantId = `asst-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ])

      try {
        const allMsgs = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMsgs,
            conversationId: activeConvId,
          }),
        })

        if (!res.ok) {
          const errBody = await res.text()
          throw new Error(errBody || `HTTP ${res.status}`)
        }

        // Parse citations from response header
        const citationsHeader = res.headers.get('X-Citations')
        const parsedCitations: CitationItem[] = citationsHeader
          ? JSON.parse(citationsHeader)
          : []
        setStreamingCitations(parsedCitations)

        // Stream the text body
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullText += decoder.decode(value, { stream: true })
            const snapshot = fullText
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: snapshot, citations: parsedCitations }
                  : m
              )
            )
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        toast.error(msg)
        // Remove the empty assistant bubble on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, messages]
  )

  const resetMessages = useCallback((initial: ChatMessage[] = []) => {
    setMessages(initial)
    setStreamingCitations([])
  }, [])

  return { messages, isLoading, streamingCitations, sendMessage, resetMessages }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ChatWindow({
  initialConversations,
  initialMessages = [],
  initialConversationId,
}: ChatWindowProps) {
  const [conversations, setConversations] =
    useState<ConversationRecord[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    initialConversationId
  )
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, isLoading, streamingCitations, sendMessage, resetMessages } =
    useStreamingChat(activeConversationId)

  // Load initial messages
  useEffect(() => {
    const initial: ChatMessage[] = initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: (m.citations as CitationItem[] | undefined) ?? [],
    }))
    resetMessages(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewConversation = async () => {
    setIsCreating(true)
    try {
      const res = await createConversationAction('New Conversation')
      if (res.success && res.conversation) {
        setConversations((prev) => [res.conversation!, ...prev])
        setActiveConversationId(res.conversation.id)
        resetMessages([])
      } else {
        toast.error(res.error || 'Failed to create conversation')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      const res = await deleteConversationAction(id)
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeConversationId === id) {
          setActiveConversationId(undefined)
          resetMessages([])
        }
      } else {
        toast.error(res.error || 'Failed to delete conversation')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    let convId = activeConversationId
    if (!convId) {
      const firstWords = inputValue.trim().split(' ').slice(0, 5).join(' ')
      const res = await createConversationAction(firstWords || 'New Conversation')
      if (res.success && res.conversation) {
        setConversations((prev) => [res.conversation!, ...prev])
        setActiveConversationId(res.conversation.id)
        convId = res.conversation.id
      }
    }

    const text = inputValue
    setInputValue('')
    await sendMessage(text, convId)
  }

  // Get latest citations: from the last assistant message, or currently streaming
  const getMessageCitations = (msg: ChatMessage): CitationItem[] => {
    if (msg.role !== 'assistant') return []
    if (msg.citations && msg.citations.length > 0) return msg.citations
    return streamingCitations
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl bg-zinc-950">
      {/* ─── Sidebar ─── */}
      <div className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-zinc-950">
        <div className="p-4 border-b border-zinc-900">
          <Button
            size="sm"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleNewConversation}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-6">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-indigo-600/15 border border-indigo-500/20 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="text-sm truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-rose-400 transition-all"
                    disabled={deletingId === conv.id}
                  >
                    {deletingId === conv.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-zinc-300 font-medium">RAG Chat Assistant</span>
          </div>
          <span className="text-xs text-zinc-600 hidden sm:block">
            Responses grounded to your uploaded documents
          </span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MessageSquare className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-white">Ask a question about your documents</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                  Every answer will include clickable citations showing the exact source excerpt.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((message) => {
                const isUser = message.role === 'user'
                const msgCitations = getMessageCitations(message)

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                        isUser
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-indigo-600/20 text-indigo-400'
                      }`}
                    >
                      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm'
                      }`}
                    >
                      {isUser ? (
                        message.content
                      ) : (
                        <>
                          {renderMessageContent(
                            message.content,
                            msgCitations,
                            setActiveCitation
                          )}
                          {/* Streaming cursor */}
                          {isLoading && message.content === '' && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                            </span>
                          )}
                        </>
                      )}

                      {/* Citation pills row */}
                      {!isUser && msgCitations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800">
                          <span className="text-xs text-zinc-500">Sources:</span>
                          {msgCitations.map((c) => (
                            <button
                              key={c.citationIndex}
                              onClick={() => setActiveCitation(c)}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                            >
                              [{c.citationIndex}] {c.documentName.slice(0, 20)}
                              {c.documentName.length > 20 ? '…' : ''}
                              {c.pageNumber ? `, p.${c.pageNumber}` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Panel */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-3xl mx-auto">
            <Input
              id="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about your documents…"
              className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus-visible:ring-indigo-500/50"
              disabled={isLoading}
            />
            <Button
              id="chat-send-btn"
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Citation Drawer */}
      <CitationDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  )
}
