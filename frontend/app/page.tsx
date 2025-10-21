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

export default function Home() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [pastedLogs, setPastedLogs] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    if (files.length === 0 && !pastedLogs.trim()) return

    setIsAnalyzing(true)

    let parsedData: ParsedLogData | null = null

    if (pastedLogs.trim()) {
      try {
        parsedData = parseLogFile(pastedLogs)
        localStorage.setItem("debugReportData", JSON.stringify(parsedData))
      } catch (error) {
        console.error("Error parsing pasted logs:", error)
      }
    } else if (files.length > 0) {
      const logFiles = files.filter((f) => f.name.endsWith(".log") || f.name.endsWith(".txt"))

      if (logFiles.length > 0) {
        try {
          const content = await logFiles[0].text()
          parsedData = parseLogFile(content)
          localStorage.setItem("debugReportData", JSON.stringify(parsedData))
        } catch (error) {
          console.error("Error parsing log file:", error)
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    router.push("/report")
  }

  const hasInput = files.length > 0 || pastedLogs.trim().length > 0

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
          {/* Hero Section */}
          {!hasInput && (
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 mb-4">
                <SunshineLogo className="size-12" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Illuminate Your Code with AI</h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
                Upload your log files and codebase to get intelligent insights on errors, logging quality, sensitive
                data exposure, and actionable recommendations.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="paste-logs" className="text-sm font-medium">
                Paste Logs from Terminal
              </label>
              <Textarea
                id="paste-logs"
                placeholder="Paste your logs here... (e.g., from terminal output)\n\n2025-10-16 14:10:21 INFO  UserService - User login successful\n2025-10-16 14:12:47 ERROR EpisodeService - NullPointerException at EpisodeService.java:231"
                value={pastedLogs}
                onChange={(e) => setPastedLogs(e.target.value)}
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

          {/* File Upload Area */}
          <FileUploadArea onFilesAdded={handleFilesAdded} />

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <UploadedFilesList files={files} onRemoveFile={handleRemoveFile} />

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {pastedLogs.trim()
                    ? `${pastedLogs.split("\n").filter((line) => line.trim()).length} log lines`
                    : `${files.length} ${files.length === 1 ? "file" : "files"}`}{" "}
                  ready for analysis
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
            </div>
          )}

          {pastedLogs.trim() && files.length === 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {pastedLogs.split("\n").filter((line) => line.trim()).length} log lines ready for analysis
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

          {/* Features */}
          {!hasInput && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
              <div className="rounded-lg border border-border/50 bg-card p-6 space-y-2">
                <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <svg className="size-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">Logging Quality Score</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze your logging coverage and identify modules that need better observability.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-card p-6 space-y-2">
                <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                  <svg className="size-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">Error Flow Mapping</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize how warnings escalate into crashes through your call chain.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-card p-6 space-y-2">
                <div className="size-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
                  <svg className="size-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">Sensitive Data Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically detect and flag sensitive information like NRIC or patient data in logs.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-card p-6 space-y-2">
                <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <svg className="size-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">Recurring Bug Patterns</h3>
                <p className="text-sm text-muted-foreground">
                  Identify patterns in past logs to prevent fixing the same bug repeatedly.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
