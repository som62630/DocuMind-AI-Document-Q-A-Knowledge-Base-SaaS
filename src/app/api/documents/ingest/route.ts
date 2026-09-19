import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractTextFromBuffer } from '@/lib/ingestion/extract'
import { chunkPages } from '@/lib/ingestion/chunker'
import { generateEmbeddings } from '@/lib/ingestion/embeddings'

export const maxDuration = 60 // Allow up to 60 seconds for execution on Vercel

export async function POST(req: NextRequest) {
  let docId: string | null = null

  try {
    const { documentId, orgId } = await req.json()
    docId = documentId

    if (!documentId || !orgId) {
      return NextResponse.json({ error: 'Missing documentId or orgId' }, { status: 400 })
    }

    const supabase = createAdminClient()

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

    // 2. Mark document as 'processing'
    await supabase
      .from('documents')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', documentId)

    // 3. Download document file from Supabase Storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('documents')
      .download(doc.file_path)

    if (downloadErr || !fileData) {
      const errorReason = `Storage download failed: ${downloadErr?.message || 'File not found'}`
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: errorReason, updated_at: new Date().toISOString() })
        .eq('id', documentId)

      return NextResponse.json({ error: errorReason }, { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // 4. Text extraction phase
    const extractionResult = await extractTextFromBuffer(fileBuffer, doc.mime_type, doc.name)

    if (extractionResult.errorReason || extractionResult.isScannedPdf) {
      const reason = extractionResult.errorReason || 'Unable to extract text from document.'
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', documentId)

      return NextResponse.json({ success: false, status: 'failed', error: reason })
    }

    // 5. Chunking phase
    const chunks = chunkPages(extractionResult.pages, {
      chunkSize: 2000,
      chunkOverlap: 300,
    })

    if (chunks.length === 0) {
      const reason = 'Document contained no valid text segments after chunking.'
      await supabase
        .from('documents')
        .update({ status: 'failed', error_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', documentId)

      return NextResponse.json({ success: false, status: 'failed', error: reason })
    }

    // 6. Embedding generation phase
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await generateEmbeddings(chunkTexts)

    // 7. Store document chunks with vectors and metadata
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: documentId,
      organization_id: orgId,
      content: chunk.content,
      embedding: embeddings[index],
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      metadata: chunk.metadata,
    }))

    // Insert chunks in batches of 50 in parallel
    const CHUNK_INSERT_BATCH = 50
    const insertPromises: Promise<void>[] = []

    for (let i = 0; i < chunkRecords.length; i += CHUNK_INSERT_BATCH) {
      const batch = chunkRecords.slice(i, i + CHUNK_INSERT_BATCH)
      insertPromises.push(
        supabase
          .from('document_chunks')
          .insert(batch)
          .then(({ error: chunkInsertErr }) => {
            if (chunkInsertErr) {
              throw new Error(`Failed to insert document chunks into database: ${chunkInsertErr.message}`)
            }
          })
      )
    }
    
    await Promise.all(insertPromises)

    // 8. Mark document as 'ready'
    await supabase
      .from('documents')
      .update({
        status: 'ready',
        error_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return NextResponse.json({
      success: true,
      status: 'ready',
      chunksProcessed: chunks.length,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Pipeline runtime exception occurred'
    console.error('Ingestion pipeline exception:', err)

    if (docId) {
      const supabase = createAdminClient()
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          error_reason: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
