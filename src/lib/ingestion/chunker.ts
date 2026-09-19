import { ExtractedPage } from './extract'

export interface DocumentChunkInput {
  content: string
  pageNumber: number | null
  chunkIndex: number
  metadata: {
    startChar: number
    endChar: number
    wordCount: number
  }
}

export interface ChunkerOptions {
  chunkSize?: number // Max characters per chunk (default ~2000 chars / ~500 tokens)
  chunkOverlap?: number // Overlap in characters (default ~300 chars / ~15% overlap)
  separators?: string[]
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', '']
const DEFAULT_CHUNK_SIZE = 2000
const DEFAULT_CHUNK_OVERLAP = 300

/**
 * Splits extracted document pages into semantic chunks with overlap.
 */
export function chunkPages(
  pages: ExtractedPage[],
  options: ChunkerOptions = {}
): DocumentChunkInput[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP
  const separators = options.separators || DEFAULT_SEPARATORS

  const chunks: DocumentChunkInput[] = []
  let globalChunkIndex = 0

  for (const page of pages) {
    const pageText = page.text.trim()
    if (!pageText) continue

    const pageChunks = splitTextRecursively(pageText, chunkSize, chunkOverlap, separators)

    for (const chunkText of pageChunks) {
      if (!chunkText.trim()) continue
      chunks.push({
        content: chunkText.trim(),
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        metadata: {
          startChar: 0,
          endChar: chunkText.length,
          wordCount: chunkText.trim().split(/\s+/).length,
        },
      })
    }
  }

  return chunks
}

/**
 * Recursive character splitter implementation.
 */
function splitTextRecursively(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  separators: string[]
): string[] {
  const finalChunks: string[] = []

  if (text.length <= chunkSize) {
    return [text]
  }

  // Find the highest priority separator present in the text
  let selectedSeparator = separators[separators.length - 1]
  for (const s of separators) {
    if (s === '' || text.includes(s)) {
      selectedSeparator = s
      break
    }
  }

  // Split text by the chosen separator
  const splits = selectedSeparator === '' ? text.split('') : text.split(selectedSeparator)

  let currentChunk: string[] = []
  let currentLength = 0

  for (let i = 0; i < splits.length; i++) {
    const piece = splits[i]
    const pieceLength = piece.length + selectedSeparator.length

    if (currentLength + pieceLength > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(selectedSeparator)
      finalChunks.push(chunkText)

      // Calculate overlap: keep end pieces from currentChunk up to chunkOverlap length
      const overlapPieces: string[] = []
      let overlapLen = 0

      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const p = currentChunk[j]
        if (overlapLen + p.length <= chunkOverlap) {
          overlapPieces.unshift(p)
          overlapLen += p.length + selectedSeparator.length
        } else {
          break
        }
      }

      currentChunk = overlapPieces
      currentLength = overlapLen
    }

    currentChunk.push(piece)
    currentLength += pieceLength
  }

  if (currentChunk.length > 0) {
    finalChunks.push(currentChunk.join(selectedSeparator))
  }

  return finalChunks
}
