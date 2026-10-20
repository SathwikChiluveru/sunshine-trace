"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileUploadArea } from "@/components/file-upload-area"
import { UploadedFilesList } from "@/components/uploaded-files-list"
import { Button } from "@/components/ui/button"
import { parseLogFile } from "@/lib/log-parser"
import type { ParsedLogData } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { SunshineLogo } from "@/components/sunshine-logo"
import { extractZipFile, type ExtractedFile } from "@/lib/zip-utils"
import { ZipFileExplorer } from "@/components/zip-file-explorer"
import RulesSection from "@/components/sections/rules-section"
import { Terminal, Check, ArrowRight, BarChart3, AlertTriangle, Shield, Lightbulb, Construction } from "lucide-react"

type FeatureType = "logging-quality" | "error-flow" | "sensitive-data" | "recommendations"

export default function Home() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [pastedLogs, setPastedLogs] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const API_BASE = ""
  const MAX_PASTE_CHARS = 200_000

  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonFiles, setComparisonFiles] = useState<File[]>([])
  const [comparisonPastedLogs, setComparisonPastedLogs] = useState("")
  const [comparisonExtractedFiles, setComparisonExtractedFiles] = useState<ExtractedFile[]>([])
  const [showComparisonZipExplorer, setShowComparisonZipExplorer] = useState(false)
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>([])
  const [includeInAI, setIncludeInAI] = useState<boolean[]>([])

  // ZIP handling state
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([])
  const [showZipExplorer, setShowZipExplorer] = useState(false)

  const handleFilesAdded = async (newFiles: File[]) => {
    const zipFiles = newFiles.filter((f) => f.name.endsWith(".zip"))
    const regularFiles = newFiles.filter((f) => !f.name.endsWith(".zip"))

    setFiles((prev) => [...prev, ...regularFiles])
    setIncludeInAI((prev) => [...prev, ...regularFiles.map(() => true)])

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
    setIncludeInAI((prev) => prev.filter((_, i) => i !== index))
  }

  const handleToggleIncludeAI = (index: number) => {
    setIncludeInAI((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  const handleAnalyze = async () => {
    if (files.length === 0 && !pastedLogs.trim() && extractedFiles.filter((f) => f.selected).length === 0) return

    setIsAnalyzing(true)

    // Clear previous analysis to ensure fresh results
    try {
      localStorage.removeItem("debugReportData")
      localStorage.removeItem("aiAnalysisResults")
      localStorage.removeItem("aiZipResults")
      console.log("[Analysis] Cleared previous analysis data - generating fresh results")
    } catch {}

    // Persist user's selected analysis types so the report page can render conditionally
    try {
      localStorage.setItem("selectedAnalysisTypes", JSON.stringify(selectedAnalysisTypes))
    } catch {}

    let parsedData: ParsedLogData | null = null
    let aiAnalysisResults: any = null

    try {
      // 🧠 Case 1: pasted logs
      if (pastedLogs.trim()) {
        parsedData = parseLogFile(pastedLogs)

        // Only send AI request for logs if relevant analysis types were chosen
        if (selectedAnalysisTypes.length > 0) {
          try {
            const response = await fetch(`${API_BASE}/api/analyze/file`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: pastedLogs,
                fileName: "pasted-logs.txt",
                fileType: "log",
                selectedTypes: selectedAnalysisTypes,
              }),
            })
            if (response.ok) {
              aiAnalysisResults = await response.json()
            }
          } catch (err) {
            console.warn("AI analysis failed for pasted logs:", err)
          }
        }

        localStorage.setItem("debugReportData", JSON.stringify(parsedData))
        if (aiAnalysisResults) {
          localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
        }
      }

      // 🧠 Case 2: extracted files from ZIP (selected ones)
      const selectedExtracted = extractedFiles.filter((f) => f.selected && f.content)
      if (selectedExtracted.length > 0) {
        // Handle log files
        const selectedLogs = selectedExtracted
          .filter((f) => f.path.endsWith(".log") || f.path.endsWith(".txt"))
        
        if (selectedLogs.length > 0) {
          const combinedLogs = selectedLogs
            .map((f) => f.content)
            .join("\n")

          parsedData = parseLogFile(combinedLogs)
          localStorage.setItem("debugReportData", JSON.stringify(parsedData))

          if (selectedAnalysisTypes.length > 0) {
            try {
              const response = await fetch(`${API_BASE}/api/analyze/file`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: combinedLogs,
                  fileName: "combined-logs.txt",
                  fileType: "log",
                  selectedTypes: selectedAnalysisTypes,
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

        // Handle code files - NEW: Send selected code files to AI
        const selectedCodeFiles = selectedExtracted
          .filter((f) => 
            /\.(js|ts|tsx|py|java|go|rb|php|cs|json|md)$/i.test(f.path)
          )
          .map((f) => ({
            fileName: f.path.split("/").pop() || f.path,
            fileType: (f.path.split(".").pop() || "unknown").toLowerCase(),
            content: f.content as string,
          }))

        if (selectedAnalysisTypes.length > 0 && selectedCodeFiles.length > 0) {
          try {
            console.log(`[ZIP] Sending ${selectedCodeFiles.length} selected code files to AI:`, 
              selectedCodeFiles.map(f => f.fileName))
            
            const response = await fetch(`${API_BASE}/api/analyze/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                files: selectedCodeFiles, 
                selectedTypes: selectedAnalysisTypes 
              }),
            })
            
            if (response.ok) {
              const aiZipCodeResults = await response.json()
              console.log("[ZIP] AI analysis completed for selected code files:", aiZipCodeResults)
              
              // Merge with existing AI results if any
              if (aiAnalysisResults) {
                aiAnalysisResults = {
                  ...aiAnalysisResults,
                  zipCodeAnalysis: aiZipCodeResults
                }
              } else {
                aiAnalysisResults = aiZipCodeResults
              }
              localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
            }
          } catch (err) {
            console.warn("AI analysis failed for selected ZIP code files:", err)
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

        const validFilesAll = filesToAnalyze.filter((f): f is { fileName: string; fileType: string; content: string } => f.content !== null)
        // Filter files sent to AI by includeInAI toggles
        const validFiles = validFilesAll.filter((_, i) => includeInAI[i] !== false)

        if (validFilesAll.length > 0) {
          const logFiles = validFilesAll.filter((f) => f.fileType === "log" || f.fileType === "txt")
          if (logFiles.length > 0) {
            const combined = logFiles.map((f) => f.content).join("\n")
            if (combined.trim()) {
              parsedData = parseLogFile(combined)
              localStorage.setItem("debugReportData", JSON.stringify(parsedData))
            }
          }

          if (selectedAnalysisTypes.length > 0 && validFiles.length > 0) {
            try {
              const response = await fetch(`${API_BASE}/api/analyze/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: validFiles, selectedTypes: selectedAnalysisTypes }),
              })
              if (response.ok) {
                aiAnalysisResults = await response.json()
                localStorage.setItem("aiAnalysisResults", JSON.stringify(aiAnalysisResults))
              }
            } catch (aiError) {
              console.warn("AI analysis failed on batch:", aiError)
            }
          }
        }

        // Extra ZIP-level AI endpoint for uploaded ZIPs
        const zip = files.find((f) => f.name.toLowerCase().endsWith(".zip"))
        if (zip) {
          if (selectedAnalysisTypes.length > 0) {
            try {
              const buf = await zip.arrayBuffer()
              const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
              const response = await fetch(`${API_BASE}/api/analyze/zip`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ zipBase64: base64, selectedTypes: selectedAnalysisTypes }),
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
      id: "recommendations" as FeatureType,
      icon: Lightbulb,
      title: "Code Recommendations",
      description: "Analyze recurring issues to prevent repetitive fixes and enhance software stability",
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
    <div className="landing-page min-h-screen bg-background flex flex-col">
      <div className="hackathon-corner">
        <p className="hackathon-ribbon">
          <span className="flex items-center justify-center gap-1.5 font-bold"><Construction className="size-3 shrink-0" aria-hidden="true" />No longer supported</span>
          <span className="block">Internal company information removed</span>
        </p>
      </div>
      {/* Header */}
      <header className="landing-header border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3">
            <SunshineLogo className="size-10" />
            <span className="font-semibold text-lg tracking-tight">Sunshine Trace</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-7">
          <div className="landing-intro text-center space-y-5 mb-12">
            <div className="hero-logo inline-flex items-center justify-center">
              <SunshineLogo className="size-20" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-balance leading-[1.14]">Illuminate Your Code <span className="hero-title-tail">with AI</span></h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-balance">
              Upload your log files or zipped codebase to get intelligent insights on errors,
              logging quality, sensitive data exposure, and more.
            </p>
          </div>

          <div className="space-y-6">
            <div className="terminal-panel">
              <div className="terminal-toolbar">
                <label htmlFor="paste-logs" className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="size-4 text-muted-foreground" /> Paste Logs from Terminal
                </label>
                <span className="text-xs text-muted-foreground hidden sm:block">{pastedLogs.length.toLocaleString("en-US")} / 200,000 characters</span>
              </div>
              <Textarea
                id="paste-logs"
                placeholder={"Paste your logs here...\n\n[INFO] Application started\n[WARN] Request took longer than expected\n[ERROR] Connection timeout"}
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
                className="log-input min-h-[200px] font-mono text-sm resize-y"
              />
              {pastedLogs.trim() && (
                <p className="px-5 pb-4 text-xs text-muted-foreground" aria-live="polite">
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
                  <span className="bg-background px-4 text-muted-foreground tracking-wider text-[10px] font-medium">Or upload files</span>
                </div>
              </div>
            )}
          </div>

          {/* File Upload and Team Rules Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_280px] gap-5 items-stretch">
            {/* File Upload Area */}
            <div className="min-w-0">
              {files.length === 0 && (
                <FileUploadArea onFilesAdded={handleFilesAdded} />
              )}

              {/* Uploaded Files */}
              {files.length > 0 && (
                <UploadedFilesList 
                  files={files} 
                  onRemoveFile={handleRemoveFile}
                  includeInAI={includeInAI}
                  onToggleIncludeAI={handleToggleIncludeAI}
                />
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
            </div>

            {/* Team Rules - Outside and to the right */}
            <div className="min-w-0">
              <RulesSection />
            </div>
          </div>

          <div className="analysis-heading flex items-center justify-between gap-4 pt-5">
            <h2 className="text-lg font-semibold tracking-tight">Select Analysis Types</h2>
            <span className="text-xs text-muted-foreground" aria-live="polite">{selectedAnalysisTypes.length ? `${selectedAnalysisTypes.length} selected` : "Choose your focus"}</span>
          </div>

          <div className="analysis-options grid grid-cols-1 md:grid-cols-2">
            {features.map(({ id, icon: Icon, title, description, iconColor }) => {
              const isSelected = selectedAnalysisTypes.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleAnalysisTypeSelection(id)}
                  className={`analysis-option relative flex items-start gap-3 cursor-pointer text-left ${isSelected ? "is-selected" : ""}`}
                >
                  <Icon className={`size-[18px] shrink-0 mt-0.5 ${iconColor}`} />
                  <span className="flex-1 min-w-0 space-y-1">
                    <span className="block font-semibold text-sm text-foreground">{title}</span>
                    <span className="block text-sm leading-relaxed text-muted-foreground">{description}</span>
                  </span>
                  <span className={`selection-indicator size-[18px] shrink-0 mt-0.5 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"}`} aria-hidden="true">
                    {isSelected && <Check className="size-3" />}
                  </span>
                </button>
              )
            })}
          </div>

            <div className="analysis-actions flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                {!hasInput ? "Add logs or files to get started." : pastedLogs.trim()
                  ? `${pastedLogs.split("\n").filter((line) => line.trim()).length} log lines ready`
                  : extractedFiles.filter((f) => f.selected).length > 0
                  ? `${extractedFiles.filter((f) => f.selected).length} files selected from ZIP`
                  : `${files.length} ${files.length === 1 ? "file" : "files"} ready`}{" "}
                {hasInput && "for analysis"}
              </p>
              <Button size="lg" onClick={handleAnalyze} disabled={!hasInput || isAnalyzing} className="gap-3">
                {isAnalyzing ? (
                  <>
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Generate Report
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
        </div>
      </main>
      <footer className="mx-auto w-full max-w-4xl border-t border-border px-5 py-6 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><SunshineLogo className="size-5" /> Sunshine Trace</span>
        <span>AI-powered debugging insights</span>
      </footer>
    </div>
  )
}
