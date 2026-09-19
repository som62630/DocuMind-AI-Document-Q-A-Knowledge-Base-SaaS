import { NextRequest } from 'next/server'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, generateText } from 'ai'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateEmbeddings } from '@/lib/ingestion/embeddings'
import { rerankChunks, CandidateChunk } from '@/lib/rag/reranker'
import { buildSystemPrompt, buildQueryReformulationPrompt } from '@/lib/rag/prompt'
import { CitationItem } from '@/lib/actions/chat'

const MATCH_THRESHOLD = 0.3
const MATCH_COUNT = 12
const TOP_K_AFTER_RERANK = 5

function getLLMProvider() {
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('placeholder')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return { provider: anthropic, model: anthropic('claude-sonnet-4-5') }
  }
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')) {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
    // Use grok-3-mini when pointing at xAI, otherwise gpt-4o-mini
    const modelName = (process.env.OPENAI_BASE_URL || '').includes('x.ai')
      ? 'grok-3-mini'
      : 'gpt-4o-mini'
    return { provider: openai, model: openai(modelName) }
  }
  throw new Error(
    'No LLM API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local'
  )
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = auth()

  if (!userId || !orgId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, conversationId, documentIds } = await req.json()

  if (!messages || messages.length === 0) {
    return new Response('No messages provided', { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Verify conversation belongs to this org
  if (conversationId) {
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single()

    if (error || !conv) {
      return new Response('Conversation not found', { status: 404 })
    }
  }

  const userMessage = messages[messages.length - 1].content as string
  const conversationHistory = messages.slice(0, -1) as Array<{
    role: 'user' | 'assistant'
    content: string
  }>

  try {
    const { model } = getLLMProvider()

    // 2. Multi-turn query reformulation for follow-up questions
    let searchQuery = userMessage
    if (conversationHistory.length >= 2) {
      const reformulationPrompt = buildQueryReformulationPrompt(
        conversationHistory,
        userMessage
      )
      try {
        const { text } = await generateText({
          model,
          prompt: reformulationPrompt,
          maxOutputTokens: 100,
        })
        searchQuery = text.trim() || userMessage
      } catch {
        // Fall back to original query if reformulation fails
        searchQuery = userMessage
      }
    }

    // 3. Embed the search query
    const [queryEmbedding] = await generateEmbeddings([searchQuery])

    // 4. Vector similarity search via pgvector RPC
    const { data: vectorResults, error: searchError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
        filter_organization_id: orgId,
        filter_document_ids: documentIds?.length > 0 ? documentIds : null,
      }
    )

    if (searchError) {
      console.error('Vector search error:', searchError)
    }

    const candidates: CandidateChunk[] = (vectorResults || []).map(
      (r: {
        id: string
        document_id: string
        document_name: string
        content: string
        page_number: number | null
        chunk_index: number
        similarity: number
        metadata: Record<string, unknown>
      }) => ({
        id: r.id,
        document_id: r.document_id,
        document_name: r.document_name,
        content: r.content,
        page_number: r.page_number,
        chunk_index: r.chunk_index,
        similarity: r.similarity,
        metadata: r.metadata,
      })
    )

    // 5. Hybrid re-ranking and deduplication
    const rankedChunks = rerankChunks(searchQuery, candidates, TOP_K_AFTER_RERANK)

    // 6. Build system prompt with context and guardrails
    const systemPrompt = buildSystemPrompt(rankedChunks)

    // 7. Persist user message before streaming
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        citations: [],
      })
    }

    // 8. Build citations metadata for the response
    const citations: CitationItem[] = rankedChunks.map((chunk, index) => ({
      citationIndex: index + 1,
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      pageNumber: chunk.page_number,
      chunkIndex: chunk.chunk_index,
      contentSnippet: chunk.content.slice(0, 300),
    }))

    // 9. Stream response using Vercel AI SDK
    const result = streamText({
      model,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
      ],
      maxOutputTokens: 1024,
      onFinish: async ({ text }) => {
        // 10. Persist assistant message and update conversation timestamp
        if (conversationId) {
          await Promise.all([
            supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: text,
              citations,
            }),
            supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId),
          ])
        }
      },
    })

    // Attach citation data as a custom header for the client to parse
    const response = result.toTextStreamResponse()
    const headers = new Headers(response.headers)
    headers.set('X-Citations', JSON.stringify(citations))
    headers.set('X-Conversation-Id', conversationId || '')
    headers.set('Access-Control-Expose-Headers', 'X-Citations, X-Conversation-Id')

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Chat pipeline failed'
    console.error('Chat API error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
