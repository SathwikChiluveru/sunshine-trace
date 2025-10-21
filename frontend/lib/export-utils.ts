import type { ParsedLogData } from "./types"

export type ExportFormat = "html" | "json" | "pdf"

export function exportAsHTML(logData: ParsedLogData | null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `sunshine-trace-report-${timestamp}.html`

  // Get the current page HTML
  const htmlContent = document.documentElement.outerHTML

  // Create a self-contained HTML file
  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export function exportAsJSON(logData: ParsedLogData | null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `sunshine-trace-report-${timestamp}.json`

  const data = {
    exportedAt: new Date().toISOString(),
    reportType: "Sunshine Trace Report",
    data: logData || { message: "No log data available" },
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export function exportAsPDF(logData: ParsedLogData | null) {
  // For PDF export, we'll use the browser's print functionality
  // which allows users to save as PDF
  window.print()
}
