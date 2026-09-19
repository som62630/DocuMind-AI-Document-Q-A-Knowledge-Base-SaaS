import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractTextFromBuffer } from '@/lib/ingestion/extract'
import { chunkPages } from '@/lib/ingestion/chunker'
import { generateEmbeddings } from '@/lib/ingestion/embeddings'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  let docId: string | null = null

  try {
    const body = await req.json()
    const documentId: string = body.documentId
    const orgId: string = body.orgId
    docId = documentId

    if (!documentId || !orgId) {
      return NextResponse.json({ error: 'Missing documentId or orgId' }, { status: 400 })
    }

    // 1. Fetch document record
    const { data: doc, error: fetchErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', orgId)
      .single()

    if (fetchErr || !doc) {
      return NextResponse.json({ error: 'Document record not found' }, { status: 404 })
    }

    // 2. Mark as processing
    await supabase
      .from('documents')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', documentId)

    // 3. Download from storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('documents')
      .download(doc.file_path)

    if (downloadErr || !fileData) {
      const reason = `Storage download failed: ${downloadErr?.message || 'File not found'}`
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', documentId)
      return NextResponse.json({ error: reason }, { status: 500 })
    }

    // 4. Extract text
    const arrayBuffer = await fileData.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const extractionResult = await extractTextFromBuffer(fileBuffer, doc.mime_type, doc.name)

    if (extractionResult.errorReason || extractionResult.isScannedPdf) {
      const reason = extractionResult.errorReason || 'Unable to extract text from document.'
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', documentId)
      return NextResponse.json({ success: false, status: 'failed', error: reason })
    }

    // 5. Chunk the text
    const chunks = chunkPages(extractionResult.pages, { chunkSize: 2000, chunkOverlap: 300 })

    if (chunks.length === 0) {
      const reason = 'Document contained no valid text segments after chunking.'
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', documentId)
      return NextResponse.json({ success: false, status: 'failed', error: reason })
    }

    // 6. Generate embeddings
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await generateEmbeddings(chunkTexts)

    // 7. Insert chunks sequentially in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE).map((chunk, j) => ({
        document_id: documentId,
        organization_id: orgId,
        content: chunk.content,
        embedding: embeddings[i + j],
        page_number: chunk.pageNumber,
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata,
      }))

      const { error: insertErr } = await supabase.from('document_chunks').insert(batch)
      if (insertErr) {
        throw new Error(`Chunk insert failed: ${insertErr.message}`)
      }
    }

    // 8. Mark as ready
    await supabase
      .from('documents')
      .update({ status: 'ready', error_reason: null, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    return NextResponse.json({ success: true, status: 'ready', chunksProcessed: chunks.length })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Pipeline runtime exception occurred'
    console.error('Ingestion pipeline error:', err)

    if (docId) {
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: errorMsg, updated_at: new Date().toISOString() })
        .eq('id', docId)
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
