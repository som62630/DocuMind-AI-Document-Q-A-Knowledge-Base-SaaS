'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DocumentRecord {
  id: string
  organization_id: string
  name: string
  file_path: string
  size_bytes: number
  mime_type: string
  status: 'queued' | 'processing' | 'ready' | 'failed'
  error_reason?: string | null
  created_at: string
  updated_at: string
}

/**
 * Handles file upload to Supabase Storage and creates a document row with status = 'queued'.
 */
export async function uploadDocumentAction(formData: FormData) {
  const { orgId, userId } = auth()

  if (!userId || !orgId) {
    return { success: false, error: 'Unauthorized. An active organization is required.' }
  }

  const file = formData.get('file') as File | null

  if (!file) {
    return { success: false, error: 'No file selected for upload.' }
  }

  // File size validation (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds maximum limit of 10MB.' }
  }

  // Allowed MIME types
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]

  if (!allowedMimeTypes.includes(file.type) && !file.name.endsWith('.txt')) {
    return { success: false, error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' }
  }

  try {
    const supabase = createAdminClient()
    const documentId = crypto.randomUUID()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${orgId}/${documentId}/${sanitizedFileName}`

    // 1. ArrayBuffer conversion
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Upload file to Supabase Storage bucket 'documents'
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return { success: false, error: `Storage upload failed: ${storageError.message}` }
    }

    // 3. Create document record in database
    const { data: docData, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        organization_id: orgId,
        name: file.name,
        file_path: filePath,
        size_bytes: file.size,
        mime_type: file.type || 'text/plain',
        status: 'queued',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      return { success: false, error: `Database record creation failed: ${dbError.message}` }
    }

    // 4. Trigger async processing pipeline endpoint without blocking response
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    fetch(`${baseUrl}/api/documents/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: docData.id,
        orgId,
      }),
    }).catch((err) => {
      console.error('Failed to trigger background ingestion job:', err)
    })

    revalidatePath('/app/documents')
    return { success: true, document: docData }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during upload.'
    console.error('Upload exception:', err)
    return { success: false, error: errorMsg }
  }
}

/**
 * Fetches all documents scoped to the active organization.
 */
export async function getDocumentsAction(): Promise<{ success: boolean; documents?: DocumentRecord[]; error?: string }> {
  const { orgId } = auth()

  if (!orgId) {
    return { success: false, error: 'No organization selected.' }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, documents: data as DocumentRecord[] }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch documents'
    return { success: false, error: errorMsg }
  }
}

/**
 * Deletes a document and its associated storage file and chunks.
 */
export async function deleteDocumentAction(documentId: string) {
  const { orgId } = auth()

  if (!orgId) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const supabase = createAdminClient()

    // 1. Fetch document record to get file_path
    const { data: doc, error: fetchErr } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('organization_id', orgId)
      .single()

    if (fetchErr || !doc) {
      return { success: false, error: 'Document not found.' }
    }

    // 2. Remove file from Supabase Storage
    await supabase.storage.from('documents').remove([doc.file_path])

    // 3. Delete database row (cascades to document_chunks)
    const { error: deleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('organization_id', orgId)

    if (deleteErr) {
      return { success: false, error: deleteErr.message }
    }

    revalidatePath('/app/documents')
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete document'
    return { success: false, error: errorMsg }
  }
}
