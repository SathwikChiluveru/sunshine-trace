"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileUploadArea } from "@/components/file-upload-area"
import { UploadedFilesList } from "@/components/uploaded-files-list"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { parseLogFile } from "@/lib/log-parser"
import type { ParsedLogData } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { SunshineLogo } from "@/components/sunshine-logo"
import { extractZipFile, type ExtractedFile } from "@/lib/zip-utils"
import { ZipFileExplorer } from "@/components/zip-file-explorer"
import { Upload, BarChart3, AlertTriangle, Shield, RefreshCw } from "lucide-react"

type FeatureType = "logging-quality" | "error-flow" | "sensitive-data" | "bug-patterns"

export default function Home() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [pastedLogs, setPastedLogs] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
  const MAX_PASTE_CHARS = 200_000

  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonFiles, setComparisonFiles] = useState<File[]>([])
  const [comparisonPastedLogs, setComparisonPastedLogs] = useState("")
  const [comparisonExtractedFiles, setComparisonExtractedFiles] = useState<ExtractedFile[]>([])
  const [showComparisonZipExplorer, setShowComparisonZipExplorer] = useState(false)
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>([])

  // ZIP handling state
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([])
  const [showZipExplorer, setShowZipExplorer] = useState(false)

  const handleFilesAdded = async (newFiles: File[]) => {
    const zipFiles = newFiles.filter((f) => f.name.endsWith(".zip"))
    const regularFiles = newFiles.filter((f) => !f.name.endsWith(".zip"))

    setFiles((prev) => [...prev, ...regularFiles])

    // Extract ZIPs and show explorer
    if (zipFiles.length > 0) {
      for (const zipFile of zipFiles) {
        const extracted = await extractZipFile(zipFile)
        setExtractedFiles((prev) => [...prev, ...extracted])
        setShowZipExplorer(true)
      }
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    if (files.length === 0 && !pastedLogs.trim() && extractedFiles.filter((f) => f.selected).length === 0) return

    setIsAnalyzing(true)

    let parsedData: ParsedLogData | null = null
    let aiAnalysisResults: any = null

    try {
      // 🧠 Case 1: pasted logs
      if (pastedLogs.trim()) {
        parsedData = parseLogFile(pastedLogs)

        try {
          const response = await fetch(`${API_BASE}/api/analyze/file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: pastedLogs,
              fileName: "pasted-logs.txt",
              fileType: "log",
            }),
          })
          if (response.ok) {
            aiAnalysisResults = await response.json()
          }
        } catch (err) {
          console.warn("AI analysis failed for pasted logs:", err)
        }

        localStorage.setItem("debugReportData", JSON.stringify(parsedData))
        if (aiAnalysisResults) {
          localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
        }
      }

      // 🧠 Case 2: extracted files from ZIP (selected ones)
      const selectedExtracted = extractedFiles.filter((f) => f.selected && f.content)
      if (selectedExtracted.length > 0) {
        const combinedLogs = selectedExtracted
          .filter((f) => f.path.endsWith(".log") || f.path.endsWith(".txt"))
          .map((f) => f.content)
          .join("\n")

        if (combinedLogs) {
          parsedData = parseLogFile(combinedLogs)
          localStorage.setItem("debugReportData", JSON.stringify(parsedData))

          try {
            const response = await fetch(`${API_BASE}/api/analyze/file`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: combinedLogs,
                fileName: "combined-logs.txt",
                fileType: "log",
              }),
            })
            if (response.ok) {
              aiAnalysisResults = await response.json()
              localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
            }
          } catch (err) {
            console.warn("AI analysis failed for ZIP logs:", err)
          }
        }
      }

      // 🧠 Case 3: uploaded files
      if (files.length > 0) {
        const filesToAnalyze = files.map((f) => ({
          fileName: f.name,
          fileType: f.name.split(".").pop() || "unknown",
          content: null as string | null,
        }))

        for (let i = 0; i < files.length; i++) {
          try {
            filesToAnalyze[i].content = await files[i].text()
          } catch (error) {
            console.error(`Error reading file ${files[i].name}:`, error)
          }
        }

        const validFiles = filesToAnalyze.filter((f): f is { fileName: string; fileType: string; content: string } => f.content !== null)

        if (validFiles.length > 0) {
          const logFiles = validFiles.filter((f) => f.fileType === "log" || f.fileType === "txt")
          if (logFiles.length > 0) {
            parsedData = parseLogFile(logFiles[0].content)
            localStorage.setItem("debugReportData", JSON.stringify(parsedData))
          }

          try {
            const response = await fetch(`${API_BASE}/api/analyze/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ files: validFiles }),
            })
            if (response.ok) {
              aiAnalysisResults = await response.json()
              localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
            }
          } catch (aiError) {
            console.warn("AI analysis failed on batch:", aiError)
          }
        }

        // Extra ZIP-level AI endpoint for uploaded ZIPs
        const zip = files.find((f) => f.name.toLowerCase().endsWith(".zip"))
        if (zip) {
          try {
            const buf = await zip.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
            const response = await fetch(`${API_BASE}/api/analyze/zip`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ zipBase64: base64 }),
            })
            if (response.ok) {
              const zipResults = await response.json()
              localStorage.setItem("aiZipResults", JSON.stringify(zipResults))
            }
          } catch (e) {
            console.warn("Zip analysis failed:", e)
          }
        }
      }
    } catch (error) {
      console.error("Error during analysis:", error)
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
    router.push("/report")
  }

  const handleAnalysisTypeSelection = (type: string) => {
    setSelectedAnalysisTypes((prevSelected) => {
      if (prevSelected.includes(type)) {
        return prevSelected.filter((t) => t !== type) // Deselect the type
      } else {
        return [...prevSelected, type] // Select the type
      }
    })
  }

  const features = [
    {
      id: "logging-quality" as FeatureType,
      icon: BarChart3,
      title: "Logging Quality Score",
      description: "Analyze your logging coverage and identify modules that need better observability",
      color: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      id: "error-flow" as FeatureType,
      icon: AlertTriangle,
      title: "Error-Flow Mapping",
      description: "Visualize how warnings escalate into crashes through your call chain",
      color: "bg-red-50 dark:bg-red-950",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-200 dark:border-red-800",
    },
    {
      id: "sensitive-data" as FeatureType,
      icon: Shield,
      title: "Sensitive Data Detection",
      description: "Automatically detect and flag sensitive information like tokens or passwords in logs",
      color: "bg-amber-50 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-800",
    },
    {
      id: "bug-patterns" as FeatureType,
      icon: RefreshCw,
      title: "Recurring Bug Patterns",
      description: "Identify patterns in your logs to prevent fixing the same issue repeatedly",
      color: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800",
    },
  ]

  const hasInput =
    files.length > 0 ||
    pastedLogs.trim().length > 0 ||
    extractedFiles.filter((f) => f.selected).length > 0

    

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <SunshineLogo className="size-8" />
            <span className="font-semibold text-lg">Sunshine Trace</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-8">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 mb-4">
              <SunshineLogo className="size-12" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Illuminate Your Code with AI</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
              Upload your log files or zipped codebase to get intelligent insights on errors,
              logging quality, sensitive data exposure, and more.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="paste-logs" className="text-sm font-medium">
                Paste Logs from Terminal
              </label>
              <Textarea
                id="paste-logs"
                placeholder="Paste your logs here..."
                value={pastedLogs}
                onChange={(e) => {
                  const v = e.target.value
                  if (v.startsWith("UEsDB")) {
                    alert("Detected zipped content. Please upload the .zip file instead.")
                    return
                  }
                  if (v.length > MAX_PASTE_CHARS) {
                    alert("Pasted content is too large. Please upload as a file.")
                    return
                  }
                  setPastedLogs(v)
                }}
                className="min-h-[200px] font-mono text-sm resize-y"
              />
              {pastedLogs.trim() && (
                <p className="text-xs text-muted-foreground">
                  {pastedLogs.split("\n").filter((line) => line.trim()).length} log lines detected
                </p>
              )}
            </div>

            {!hasInput && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or upload files</span>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          {files.length === 0 && (
          <FileUploadArea onFilesAdded={handleFilesAdded} />
          )}

          {/* Uploaded Files */}
          {files.length > 0 && (
            <UploadedFilesList files={files} onRemoveFile={handleRemoveFile} />
          )}

          {/* ZIP Explorer */}
          {showZipExplorer && extractedFiles.length > 0 && (
            <div className="max-w-full overflow-hidden rounded-xl border border-border/50 bg-background p-1">
              <ZipFileExplorer
                files={extractedFiles}
                onFilesChange={setExtractedFiles}
                onClose={() => setShowZipExplorer(false)}
              />
            </div>
          )}


          <h3 className="text-lg font-semibold text-foreground mb-4">
              Select Analysis Types {selectedAnalysisTypes.length > 0 && `(${selectedAnalysisTypes.length} selected)`}
          </h3>

          {/* Feature Selection (Styled like the image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map(({ id, icon: Icon, title, description, color, iconColor, borderColor }) => {
              const isSelected = selectedAnalysisTypes.includes(id)
              return (
                <div
                  key={id}
                  onClick={() => handleAnalysisTypeSelection(id)}
                  className={`relative rounded-lg p-6 space-y-2 cursor-pointer border-1 
                    ${isSelected ? `border-black ring-2 ring-black` : `border-gray-300`}`}        
                >
                  <div className={`size-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                    <Icon className={`size-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded-full bg-black text-white p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {hasInput && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {pastedLogs.trim()
                  ? `${pastedLogs.split("\n").filter((line) => line.trim()).length} log lines ready`
                  : extractedFiles.filter((f) => f.selected).length > 0
                  ? `${extractedFiles.filter((f) => f.selected).length} files selected from ZIP`
                  : `${files.length} ${files.length === 1 ? "file" : "files"} ready`}{" "}
                for analysis
              </p>
              <Button size="lg" onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                {isAnalyzing ? (
                  <>
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}