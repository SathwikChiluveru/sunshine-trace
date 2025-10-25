"use client"

import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

interface UploadedFilesListProps {
  files: File[]
  onRemoveFile: (index: number) => void
  includeInAI?: boolean[]
  onToggleIncludeAI?: (index: number) => void
}

export function UploadedFilesList({ files, onRemoveFile, includeInAI, onToggleIncludeAI }: UploadedFilesListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="border-b border-border/50 px-6 py-4">
        <h3 className="font-semibold">Uploaded Files</h3>
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="divide-y divide-border/50">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            {includeInAI && onToggleIncludeAI && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={includeInAI[index] ?? true}
                  onCheckedChange={() => onToggleIncludeAI(index)}
                />
                Include in AI scan
              </label>
            )}
              <Button variant="ghost" size="icon" onClick={() => onRemoveFile(index)} className="shrink-0">
                <X className="size-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
