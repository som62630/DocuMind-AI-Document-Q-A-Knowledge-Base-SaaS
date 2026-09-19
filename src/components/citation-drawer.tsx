'use client'

import React from 'react'
import { FileText, X, BookOpen } from 'lucide-react'
import { CitationItem } from '@/lib/actions/chat'

interface CitationDrawerProps {
  citation: CitationItem | null
  onClose: () => void
}

export function CitationDrawer({ citation, onClose }: CitationDrawerProps) {
  if (!citation) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-zinc-950 border-l border-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-semibold">Citation {citation.citationIndex}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Metadata */}
        <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/40">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">{citation.documentName}</p>
              <div className="flex items-center gap-2 mt-1">
                {citation.pageNumber !== null && (
                  <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400">
                    Page {citation.pageNumber}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  Chunk {citation.chunkIndex + 1}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Excerpt Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Source Excerpt
          </h3>
          <div className="relative">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500/40 rounded-full" />
            <blockquote className="pl-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
              {citation.contentSnippet}
              {citation.contentSnippet.length >= 300 && (
                <span className="text-zinc-600 not-italic font-sans"> …[excerpt truncated]</span>
              )}
            </blockquote>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-900">
          <p className="text-xs text-zinc-600 text-center">
            This excerpt was retrieved via cosine similarity search and used as context for the AI response.
          </p>
        </div>
      </div>
    </>
  )
}
