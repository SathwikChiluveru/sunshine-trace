"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadAreaProps {
  onFilesAdded: (files: File[]) => void
}

export function FileUploadArea({ onFilesAdded }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles)
      }
    },
    [onFilesAdded],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      if (selectedFiles.length > 0) {
        onFilesAdded(selectedFiles)
      }
      e.target.value = ""
    },
    [onFilesAdded],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      const files = items
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)

      if (files.length > 0) {
        onFilesAdded(files)
      }
    },
    [onFilesAdded],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={cn(
        "upload-area relative h-full rounded-xl border border-dashed bg-card transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/50",
      )}
    >
      <input
        type="file"
        id="file-upload"
        multiple
        onChange={handleFileInput}
        className="sr-only"
        accept=".log,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.rb,.go,.php,.swift,.kt,.rs,.zip"
      />
      <label htmlFor="file-upload" className="flex h-full flex-col items-center justify-center px-6 py-8 cursor-pointer">
        <div className="flex items-center justify-center size-11 rounded-xl bg-muted mb-4">
          {isDragging ? (
            <FileText className="size-5 text-primary" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm font-semibold mb-2">{isDragging ? "Drop files here" : "Upload your files"}</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Drag and drop files here, paste from clipboard, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-3">Supports .log, .txt, .zip, and source code files</p>
      </label>
    </div>
  )
}
