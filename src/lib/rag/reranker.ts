export interface CandidateChunk {
  id: string
  document_id: string
  document_name: string
  content: string
  page_number: number | null
  chunk_index: number
  similarity: number
  metadata?: Record<string, unknown>
}

export interface ScoredChunk extends CandidateChunk {
  score: number
  keywordScore: number
}

/**
 * Re-ranks candidate vector chunks using a hybrid similarity + term-frequency heuristic
 * and deduplicates consecutive redundant chunks.
 */
export function rerankChunks(
  query: string,
  candidates: CandidateChunk[],
  topK = 4
): ScoredChunk[] {
  if (candidates.length === 0) return []

  // Extract query keywords (alphanumeric terms with length > 2)
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2)

  const scored: ScoredChunk[] = candidates.map((chunk) => {
    const chunkTextLower = chunk.content.toLowerCase()

    let matchCount = 0
    if (queryTerms.length > 0) {
      for (const term of queryTerms) {
        if (chunkTextLower.includes(term)) {
          matchCount++
        }
      }
    }

    const keywordScore = queryTerms.length > 0 ? matchCount / queryTerms.length : 0

    // Hybrid score weighting: 70% vector similarity + 30% keyword match
    const hybridScore = chunk.similarity * 0.7 + keywordScore * 0.3

    return {
      ...chunk,
      score: hybridScore,
      keywordScore,
    }
  })

  // Sort candidates descending by hybrid score
  scored.sort((a, b) => b.score - a.score)

  // Deduplicate adjacent/duplicate chunks from the same document page
  const deduplicated: ScoredChunk[] = []
  const seenPages = new Set<string>()

  for (const chunk of scored) {
    const key = `${chunk.document_id}_p${chunk.page_number}_c${chunk.chunk_index}`
    if (!seenPages.has(key)) {
      seenPages.add(key)
      deduplicated.push(chunk)
    }
    if (deduplicated.length >= topK) break
  }

  return deduplicated
}
