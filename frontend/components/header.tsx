"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, Moon, Sun, FileJson, FileText, Printer, ChevronDown } from "lucide-react"
import { exportAsHTML, exportAsJSON, exportAsPDF } from "@/lib/export-utils"
import type { ParsedLogData } from "@/lib/types"
import { SunshineLogo } from "./sunshine-logo"

interface HeaderProps {
  overallScore?: number
  logData?: ParsedLogData | null
}

export function Header({ overallScore = 68, logData = null }: HeaderProps) {
  const [isDark, setIsDark] = useState(true)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { grade: "A", color: "success" }
    if (score >= 80) return { grade: "B", color: "info" }
    if (score >= 70) return { grade: "C", color: "warning" }
    if (score >= 60) return { grade: "D", color: "warning" }
    return { grade: "F", color: "error" }
  }

  const { grade, color } = getGradeInfo(overallScore)

  const handleExport = (format: "html" | "json" | "pdf") => {
    switch (format) {
      case "html":
        exportAsHTML(logData)
        break
      case "json":
        exportAsJSON(logData)
        break
      case "pdf":
        exportAsPDF(logData)
        break
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <SunshineLogo className="size-7" />
            <h1 className="text-xl font-semibold text-balance">Sunshine Trace</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Healthcare API Service</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Generated:{" "}
              {new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Overall Health:</span>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${color}/10 border border-${color}/20`}
              style={{ backgroundColor: `var(--${color})/0.1`, borderColor: `var(--${color})/0.2` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `var(--${color})` }} />
              <span className="text-sm font-semibold" style={{ color: `var(--${color})` }}>
                {grade} ({Math.round(overallScore)}%)
              </span>
            </div>
          </div> */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
