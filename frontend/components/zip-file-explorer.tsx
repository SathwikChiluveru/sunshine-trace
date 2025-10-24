"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, FolderOpen, ChevronRight, ChevronDown } from "lucide-react"
import type { ExtractedFile } from "@/lib/zip-utils"
import { formatFileSize } from "@/lib/zip-utils"
import { Badge } from "@/components/ui/badge"

interface ZipFileExplorerProps {
  files: ExtractedFile[]
  onFilesChange: (files: ExtractedFile[]) => void
  onClose: () => void
}

interface IndeterminateCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: () => void
}

export function IndeterminateCheckbox({ checked, indeterminate, onCheckedChange }: IndeterminateCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate ?? false
    }
  }, [indeterminate])

  return (
    <Checkbox
      ref={checkboxRef}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  )
}

interface FileTreeNode {
  name: string
  path: string
  children: Map<string, FileTreeNode>
  file?: ExtractedFile
  isExpanded: boolean
}

export function ZipFileExplorer({ files, onFilesChange, onClose }: ZipFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Build file tree structure
  const buildFileTree = (): FileTreeNode => {
    const root: FileTreeNode = {
      name: "root",
      path: "",
      children: new Map(),
      isExpanded: true,
    }

    files.forEach((file) => {
      const parts = file.path.split("/")
      let currentNode = root

      parts.forEach((part, index) => {
        if (!currentNode.children.has(part)) {
          currentNode.children.set(part, {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            children: new Map(),
            file: index === parts.length - 1 ? file : undefined,
            isExpanded: false,
          })
        }
        currentNode = currentNode.children.get(part)!
      })
    })

    return root
  }

  const fileTree = buildFileTree()

  const getDescendantFiles = (node: FileTreeNode): ExtractedFile[] => {
    const descendants: ExtractedFile[] = []

    if (node.file) {
      descendants.push(node.file)
    }

    for (const child of node.children.values()) {
      descendants.push(...getDescendantFiles(child))
    }

    return descendants
  }

  const getFolderSelectionState = (node: FileTreeNode): "all" | "some" | "none" => {
    const descendants = getDescendantFiles(node)
    if (descendants.length === 0) return "none"

    const selectedCount = descendants.filter((f) => f.selected).length

    if (selectedCount === 0) return "none"
    if (selectedCount === descendants.length) return "all"
    return "some"
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const toggleFolderSelection = (node: FileTreeNode) => {
    const descendants = getDescendantFiles(node)
    const currentState = getFolderSelectionState(node)
    const newSelectedState = currentState !== "all" // If not all selected, select all; otherwise deselect all

    const descendantPaths = new Set(descendants.map((f) => f.path))
    const updatedFiles = files.map((f) => (descendantPaths.has(f.path) ? { ...f, selected: newSelectedState } : f))
    onFilesChange(updatedFiles)
  }

  const toggleFile = (filePath: string) => {
    const updatedFiles = files.map((f) => (f.path === filePath ? { ...f, selected: !f.selected } : f))
    onFilesChange(updatedFiles)
  }

  const toggleAll = (selected: boolean) => {
    const updatedFiles = files.map((f) => ({ ...f, selected }))
    onFilesChange(updatedFiles)
  }

  const renderNode = (node: FileTreeNode, depth = 0): React.ReactNode => {
    const selectionState = getFolderSelectionState(node)

    if (node.file) {
      // Render file
      return (
        <div
          key={node.path}
          className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          <IndeterminateCheckbox 
            checked={node.file.selected} 
            indeterminate={selectionState === "some" ? true : undefined} 
            onCheckedChange={() => toggleFile(node.path)} 
          />
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-sm truncate">{node.name}</span>
          <span className="text-xs text-muted-foreground">{formatFileSize(node.file.size)}</span>
        </div>
      )
    }

    // Render folder
    const isExpanded = expandedFolders.has(node.path) || depth === 0
    const childNodes = Array.from(node.children.values())

    return (
      <div key={node.path}>
        {depth > 0 && (
          <div
            className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors"
            style={{ paddingLeft: `${depth * 20 + 12}px` }}
          >
            <IndeterminateCheckbox
              checked={selectionState === "all"}
              indeterminate={selectionState === "some" ? true : undefined} 
              onCheckedChange={() => toggleFolderSelection(node)}
            />
            <button onClick={() => toggleFolder(node.path)} className="flex items-center gap-2 flex-1 text-left">
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
              <FolderOpen className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">({childNodes.length})</span>
            </button>
          </div>
        )}
        {isExpanded && <div className="space-y-0.5">{childNodes.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
    )
  }

  const selectedCount = files.filter((f) => f.selected).length
  const totalCount = files.length

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">ZIP File Contents</h3>
            <p className="text-sm text-muted-foreground mt-1">Select files to include in the analysis</p>
          </div>
          <Badge variant="secondary">
            {selectedCount} / {totalCount} selected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
            Deselect All
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <ScrollArea className="max-h-[400px]">
        <div className="p-3 space-y-0.5">{renderNode(fileTree)}</div>
      </ScrollArea>
    </div>
  )
}
