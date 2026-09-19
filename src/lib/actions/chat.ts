'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ConversationRecord {
  id: string
  organization_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface CitationItem {
  citationIndex: number
  documentId: string
  documentName: string
  pageNumber: number | null
  chunkIndex: number
  contentSnippet: string
}

export interface MessageRecord {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  citations: CitationItem[]
  created_at: string
}

/**
 * Creates a new conversation thread scoped to the active organization.
 */
export async function createConversationAction(title?: string) {
  const { orgId, userId } = auth()

  if (!userId || !orgId) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        organization_id: orgId,
        user_id: userId,
        title: title || 'New Conversation',
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/chat')
    return { success: true, conversation: data as ConversationRecord }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create conversation'
    return { success: false, error: msg }
  }
}

/**
 * Fetches all conversations scoped to the active organization.
 */
export async function getConversationsAction() {
  const { orgId } = auth()

  if (!orgId) {
    return { success: false, error: 'No organization selected.' }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, conversations: data as ConversationRecord[] }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations'
    return { success: false, error: msg }
  }
}

/**
 * Fetches all messages for a specific conversation.
 */
export async function getMessagesAction(conversationId: string) {
  const { orgId } = auth()

  if (!orgId) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const supabase = createAdminClient()

    // 1. Verify conversation belongs to org
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single()

    if (convErr || !conv) {
      return { success: false, error: 'Conversation not found.' }
    }

    // 2. Fetch messages
    const { data: msgs, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgErr) {
      return { success: false, error: msgErr.message }
    }

    return { success: true, messages: msgs as MessageRecord[] }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages'
    return { success: false, error: msg }
  }
}

/**
 * Deletes a conversation thread and its messages.
 */
export async function deleteConversationAction(conversationId: string) {
  const { orgId } = auth()

  if (!orgId) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('organization_id', orgId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/chat')
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete conversation'
    return { success: false, error: msg }
  }
}
