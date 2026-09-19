'use client'

import React, { useState, useRef } from 'react'
import { UploadCloud, FileText, Loader2 } from 'lucide-react'
import { uploadDocumentAction } from '@/lib/actions/documents'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DocumentUploaderProps {
  onUploadSuccess?: () => void
}

export function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowed.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Only PDF, DOCX, and TXT files are supported')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await uploadDocumentAction(formData)
      if (res.success) {
        toast.success(`Successfully uploaded ${selectedFile.name}. Ingestion pipeline queued.`)
        setSelectedFile(null)
        if (onUploadSuccess) onUploadSuccess()
      } else {
        toast.error(res.error || 'Failed to upload document')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected upload error occurred'
      toast.error(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
          }
        }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : selectedFile
            ? 'border-zinc-800 bg-zinc-950/80 cursor-default'
            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/40'
        }`}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-full">
              <FileText className="h-8 w-8 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-zinc-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                }}
                disabled={isUploading}
              >
                Change
              </Button>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Queuing...
                </>
              ) : (
                'Start Document Ingestion'
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="font-semibold text-white">Drag and drop your file here, or browse</p>
            <p className="text-xs text-zinc-400 mt-1">Supports PDF, DOCX, and TXT (Max 10MB)</p>
          </div>
        )}
      </div>
    </div>
  )
}
