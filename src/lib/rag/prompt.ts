import { ScoredChunk } from './reranker'

/**
 * Builds the system prompt with anti-hallucination guardrails and context chunks.
 */
export function buildSystemPrompt(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) {
    return `You are DocuMind, an accurate, cited AI document assistant.

CRITICAL NOTICE:
No relevant context chunks were found in the uploaded documents for this query.

INSTRUCTION:
Respond politely and inform the user: "I don't have enough information in the uploaded documents to answer this question." Do NOT attempt to guess or answer from general knowledge.`
  }

  const contextFormatted = chunks
    .map((chunk, index) => {
      const citationIndex = index + 1
      const pageInfo = chunk.page_number ? `Page ${chunk.page_number}` : 'N/A'
      return `--- CONTEXT CHUNK [Citation ${citationIndex}] ---
Source Document: ${chunk.document_name}
Page: ${pageInfo}
Content:
${chunk.content}
------------------------------------`
    })
    .join('\n\n')

  return `You are DocuMind, an accurate, cited AI document assistant. Your task is to answer the user's question strictly using the provided Context Chunks.

STRICT GUARDRAIL RULES:
1. ONLY answer using the information contained in the Context Chunks below. Do NOT use outside knowledge, assumptions, or external facts.
2. If the Context Chunks do not contain enough information to fully answer the question, explicitly state: "I don't have enough information in the uploaded documents to answer this question."
3. You MUST cite your source statements using bracketed citations, e.g. [Citation 1], [Citation 2]. Every statement of fact must have at least one citation.
4. Format citations strictly as [Citation X] (where X is the number of the context chunk).

PROVIDED CONTEXT CHUNKS:
${contextFormatted}`
}

/**
 * Helper to build a query reformulation prompt for multi-turn conversations.
 */
export function buildQueryReformulationPrompt(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentQuestion: string
): string {
  const recentHistory = history
    .slice(-4) // Take last 4 messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n')

  return `Given the following conversation history and a follow-up question, rephrase the follow-up question into a standalone, clear search query that includes all necessary context.

CONVERSATION HISTORY:
${recentHistory}

FOLLOW-UP QUESTION:
${currentQuestion}

Output ONLY the reformulated standalone search query as plain text. Do not add quotes or explanations.`
}
