'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { DocumentRecord, getDocumentsAction, deleteDocumentAction } from '@/lib/actions/documents'
import { FileText, Loader2, CheckCircle2, AlertCircle, Trash2, RefreshCw, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface DocumentListProps {
  initialDocuments?: DocumentRecord[]
}

export function DocumentList({ initialDocuments = [] }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    const res = await getDocumentsAction()
    if (res.success && res.documents) {
      setDocuments(res.documents)
    }
  }, [])

  // Auto-polling: If any document is in 'queued' or 'processing' status, poll every 3 seconds
  useEffect(() => {
    const hasActiveJob = documents.some(
      (doc) => doc.status === 'queued' || doc.status === 'processing'
    )

    if (!hasActiveJob) return

    const interval = setInterval(() => {
      fetchDocuments()
    }, 3000)

    return () => clearInterval(interval)
  }, [documents, fetchDocuments])

  const handleDelete = async (docId: string, docName: string) => {
    setDeletingId(docId)
    try {
      const res = await deleteDocumentAction(docId)
      if (res.success) {
        toast.success(`Deleted ${docName}`)
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
      } else {
        toast.error(res.error || 'Failed to delete document')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting document'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderStatusBadge = (doc: DocumentRecord) => {
    switch (doc.status) {
      case 'queued':
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 gap-1.5 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Queued
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 gap-1.5 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing Chunks
          </Badge>
        )
      case 'ready':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 py-1">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        )
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 gap-1.5 py-1 cursor-pointer">
                  <AlertCircle className="h-3 w-3" />
                  Failed
                  <Info className="h-3 w-3 ml-0.5 opacity-70" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-rose-300 max-w-xs p-3">
                <p className="text-xs">{doc.error_reason || 'Unknown ingestion error occurred.'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Your Documents</h3>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={async () => {
            setIsLoading(true)
            await fetchDocuments()
            setIsLoading(false)
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
        <Table>
          <TableHeader className="bg-zinc-900/50 border-zinc-900">
            <TableRow className="border-zinc-900">
              <TableHead className="text-zinc-400">Document Name</TableHead>
              <TableHead className="text-zinc-400">Size</TableHead>
              <TableHead className="text-zinc-400">Processing Status</TableHead>
              <TableHead className="text-zinc-400">Uploaded At</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow className="border-zinc-900">
                <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-zinc-400">No documents found</p>
                  <p className="text-xs text-zinc-600 mt-1">Upload a file above to start embedding knowledge.</p>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className="border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">{formatSize(doc.size_bytes)}</TableCell>
                  <TableCell>{renderStatusBadge(doc)}</TableCell>
                  <TableCell className="text-zinc-400 text-sm">{formatDate(doc.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0"
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
