"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, Moon, Sun, FileJson, FileText, Printer, ChevronDown } from "lucide-react"
import { exportAsHTML, exportAsJSON, exportAsPDF } from "@/lib/export-utils"
import type { ParsedLogData } from "@/lib/types"
import { SunshineLogo } from "./sunshine-logo"
import Link from "next/link"

interface HeaderProps {
  overallScore?: number
  logData?: ParsedLogData | null
}

export function Header({ logData = null }: HeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    setGeneratedAt(new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    }))
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

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
    <header className="report-header fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
        <Link
  className="flex items-center gap-3"
  href="/"
>
  <SunshineLogo className="size-7" />
  <h1 className="text-xl font-semibold text-balance">Sunshine Trace</h1>
</Link>
          <div className="report-meta flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Report workspace</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Opened:{" "}
              {generatedAt ?? "Loading report…"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={!logData}><Download className="size-3.5" /> Export <ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("html")}><FileText className="size-4 mr-2" />HTML report</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}><FileJson className="size-4 mr-2" />JSON data</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}><Printer className="size-4 mr-2" />Print / PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
