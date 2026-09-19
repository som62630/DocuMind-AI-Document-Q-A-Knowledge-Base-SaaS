import OpenAI from 'openai'

const BATCH_SIZE = 20
const MAX_RETRIES = 3

/**
 * Initializes the OpenAI client.
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('sk-placeholder')) {
    return null
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  })
}

/**
 * Generates vector embeddings for a list of text strings in batches with exponential backoff retries.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const openai = getOpenAIClient()

  // If no OpenAI key is set, fallback to generating valid 1536-dimensional mock vectors for local testing
  if (!openai) {
    console.warn(
      'OPENAI_API_KEY is missing or placeholder. Generating mock 1536-dim embeddings.'
    )
    return texts.map((t) => generateMockEmbedding(t, 1536))
  }

  const batchPromises: Promise<number[][]>[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    batchPromises.push(generateBatchWithRetry(openai, batch))
  }

  const allBatchEmbeddings = await Promise.all(batchPromises)
  return allBatchEmbeddings.flat()
}

/**
 * Helper to execute embedding API call with exponential backoff retries.
 */
async function generateBatchWithRetry(
  openai: OpenAI,
  batchTexts: string[],
  attempt = 1
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batchTexts,
      encoding_format: 'float',
    })

    return response.data.map((item) => item.embedding)
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (attempt < MAX_RETRIES) {
      const delayMs = 1000 * Math.pow(2, attempt)
      console.warn(`Embedding API call failed (attempt ${attempt}). Retrying in ${delayMs}ms...`)
      await new Promise((res) => setTimeout(res, delayMs))
      return generateBatchWithRetry(openai, batchTexts, attempt + 1)
    }
    throw new Error(`Embedding generation failed after ${MAX_RETRIES} attempts: ${errorMsg}`)
  }
}

/**
 * Fallback helper generating deterministic normalized vectors for testing without API keys.
 */
function generateMockEmbedding(text: string, dimensions = 1536): number[] {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  const vec: number[] = []
  let sumSq = 0

  for (let d = 0; d < dimensions; d++) {
    const val = Math.sin(hash + d * 0.1)
    vec.push(val)
    sumSq += val * val
  }

  // Normalize vector to length 1.0 for cosine similarity matching
  const magnitude = Math.sqrt(sumSq)
  return vec.map((v) => v / magnitude)
}
