"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { SummarySection } from "@/components/sections/summary-section"
import { AiSummarySection } from "@/components/sections/ai-summary-section"
import { LoggingQualitySection } from "@/components/sections/logging-quality-section"
import { ErrorFlowSection } from "@/components/sections/error-flow-section"
import { SensitiveDataSection } from "@/components/sections/sensitive-data-section"
import { AISensitiveDataSection } from "@/components/sections/ai-sensitive-data-section"
import { AIVulnerabilitySection } from "@/components/sections/ai-vulnerability-section"
import { RecurringBugsSection } from "@/components/sections/recurring-bugs-section"
import { CodeImprovementsSection } from "@/components/sections/code-improvements-section"
import { RecommendationsSection } from "@/components/sections/recommendations-section"
import type { ParsedLogData } from "@/lib/types"

export default function DebugReport() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
  console.log("[Report] API_BASE:", API_BASE)
  const [activeSection, setActiveSection] = useState("summary")
  const [logData, setLogData] = useState<ParsedLogData | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [findingsData, setFindingsData] = useState<any>(null)
  const [riskHeatmapData, setRiskHeatmapData] = useState<any>(null)
  const [recurringProblems, setRecurringProblems] = useState<any>(null)
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any>(null)
  const [aiZipResults, setAiZipResults] = useState<any>(null)
  const [hasDynamicSummary, setHasDynamicSummary] = useState(false)
  const [hasDynamicFindings, setHasDynamicFindings] = useState(false)
  const [hasLocalParsed, setHasLocalParsed] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false
      return !!localStorage.getItem('debugReportData')
    } catch { return false }
  })
  const summaryReqId = useRef(0)
  const findingsReqId = useRef(0)
  useEffect(() => {
    // Try to load parsed log data from localStorage
    const storedData = localStorage.getItem("debugReportData")
    console.log("[Report] localStorage.debugReportData bytes:", storedData ? storedData.length : 0)
    if (storedData) {
      setHasLocalParsed(true)
      try {
        const parsed = JSON.parse(storedData)
        setLogData(parsed)
        console.log("[Report] Parsed logData entries:", parsed?.entries?.length || 0)
        // Build a dynamic summary from the pasted logs to avoid static fallback
        if (parsed?.summary) {
          const s = parsed.summary
          setSummaryData({
            executive_summary: `Analyzed ${s.totalLogs} log lines from ${s.timeRange.start || 'N/A'} to ${s.timeRange.end || 'N/A'}. Errors: ${s.errorCount}, Warnings: ${s.warningCount}, Fatals: ${s.fatalCount}.`,
            top_risks: [],
            recommended_actions: [],
          })
          setHasDynamicSummary(true)
          console.log("[Report] Using dynamic summary from pasted logs")
        }

        // Build dynamic findings (logging quality, error flows, sensitive data) from parsed logs
        try {
          const loggingScores = Array.isArray(parsed?.serviceQuality)
            ? parsed.serviceQuality.map((sq: any) => ({
                module: sq.service,
                score: sq.score,
                gaps: [],
              }))
            : []

          const piiFindings = Array.isArray(parsed?.sensitiveData)
            ? parsed.sensitiveData.map((m: any) => ({
                type: m.type,
                file: m.logEntry?.service || 'logs',
                line: m.logEntry?.lineNumber || 0,
                sample: m.value,
                action: m.suggestion || 'mask',
              }))
            : []

          const errorFlows = Array.isArray(parsed?.errorCorrelations)
            ? parsed.errorCorrelations.map((c: any) => ({
                path: [c.trigger, ...(c.cascades || [])],
                stackTop: c.trigger,
              }))
            : []

          const riskHeatmap = loggingScores.map((m: any) => ({
            module: m.module,
            risk: Math.max(0, 100 - (m.score || 0)),
          }))

          const dynamicFindings = { loggingScores, piiFindings, errorFlows, riskHeatmap }
          setFindingsData(dynamicFindings)
          setRiskHeatmapData(riskHeatmap.map((module: any) => ({
            name: module.module.split("\\").pop() || module.module,
            score: module.risk,
          })))
          setHasDynamicFindings(true)
          console.log("[Report] Built dynamic findings:", {
            loggingScores: loggingScores.length,
            piiFindings: piiFindings.length,
            errorFlows: errorFlows.length,
            riskHeatmap: riskHeatmap.length,
          })
        } catch (e) {
          console.warn('Failed to build dynamic findings from parsed logs:', e)
        }
      } catch (error) {
        console.error("Error parsing stored log data:", error)
      }
    }

    // Try to load AI analysis results from localStorage
    const aiData = localStorage.getItem("aiAnalysisResults")
    if (aiData) {
      try {
        const parsed = JSON.parse(aiData)
        setAiAnalysisResults(parsed)
      } catch (error) {
        console.error("Error parsing AI analysis results:", error)
      }
    }

    // Try to load AI zip results
    const zipData = localStorage.getItem("aiZipResults")
    if (zipData) {
      try {
        const parsed = JSON.parse(zipData)
        setAiZipResults(parsed)
      } catch (error) {
        console.error("Error parsing AI zip results:", error)
      }
    }
  }, [])

  useEffect(() => {
    // If we already have any summary, do not fetch
    if (summaryData) {
      console.log("[Report] Skipping remote summary fetch; summaryData already set")
      return
    }
    if (aiZipResults?.summary) {
      setSummaryData(aiZipResults.summary)
      setHasDynamicSummary(true)
      console.log("[Report] Using AI zip summary")
      return
    }
    if (hasLocalParsed) {
      console.log("[Report] Skipping remote summary fetch; local parsed is present")
      return
    }
    if (hasDynamicSummary) {
      console.log("[Report] Skipping remote summary fetch; dynamic already set")
      return
    }
    const localId = ++summaryReqId.current
    const ctrl = new AbortController()
    fetch(`${API_BASE}/api/summary`, { signal: ctrl.signal })
      .then((response) => response.json())
      .then((data) => {
        if (localId !== summaryReqId.current) return
        if (!hasDynamicSummary && !summaryData) setSummaryData(data)
        console.log("[Report] Fetched remote summary (fallback)")
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error("Error fetching summary data:", error)
      })
    return () => ctrl.abort()
  }, [summaryData, aiZipResults, API_BASE, hasDynamicSummary, hasLocalParsed])

  useEffect(() => {
    // Prefer dynamic riskHeatmap from AI zip results if available
    if (aiZipResults?.riskHeatmap) {
      const data = { loggingScores: [], ...aiZipResults, riskHeatmap: aiZipResults.riskHeatmap }
      setFindingsData(data)
      const heatmapData = aiZipResults.riskHeatmap.map((module: any) => ({
        name: module.module.split("\\").pop() || module.module, // Extract module name
        score: module.risk, // Risk score
      }))
      setRiskHeatmapData(heatmapData) // Set this data for heatmap
      setHasDynamicFindings(true)
      console.log("[Report] Using AI zip findings (heatmap)")
      return
    }
    if (hasLocalParsed) {
      console.log("[Report] Skipping remote findings fetch; local parsed is present")
      return
    }
    // If no dynamic results, fetch the static findings
    if (hasDynamicFindings) {
      console.log("[Report] Skipping remote findings fetch; dynamic already set")
      return
    }
    const localId = ++findingsReqId.current
    const ctrl = new AbortController()
    fetch(`${API_BASE}/api/findings`, { signal: ctrl.signal })
      .then((response) => response.json())
      .then((data) => {
        if (localId !== findingsReqId.current) return
        if (hasDynamicFindings) return
        setFindingsData(data)
        setRecurringProblems(data.recurringProblems)
        const heatmapData = data.riskHeatmap.map((module: any) => ({
          name: module.module.split("\\").pop() || module.module, // Extract module name
          score: module.risk, // Risk score
        }))
        if (!hasDynamicFindings) setRiskHeatmapData(heatmapData)
        console.log("[Report] Fetched remote findings (fallback)")
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error("Error fetching findings data:", error)
      })
    return () => ctrl.abort()
  }, [aiZipResults, API_BASE, hasDynamicFindings, hasLocalParsed])

  return (
    <div className="min-h-screen bg-background">
      <Header overallScore={logData?.summary.overallScore} logData={logData} />
      <div className="flex">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 ml-64 pt-20 px-8 pb-16">
          <div className="max-w-7xl mx-auto space-y-12">
            <section id="summary">
            {summaryData && (
                <SummarySection
                  data={logData}
                  executiveSummary={summaryData.executive_summary}
                  riskHeatmapData={riskHeatmapData} 
                />
              )}
            </section>
            {/* <section id="ai-summary">
              <AiSummarySection data={logData} />
            </section> */}
            <section id="logging-quality">
              {findingsData && <LoggingQualitySection data={findingsData} />}
            </section>
            <section id="error-flows">
              {findingsData && <ErrorFlowSection data={findingsData} />}
            </section>
            <section id="sensitive-data">
              {findingsData && <SensitiveDataSection data={findingsData} />}
            </section>
            <section id="ai-sensitive-data">
              {aiAnalysisResults && <AISensitiveDataSection data={aiAnalysisResults} />}
            </section>
            <section id="ai-vulnerabilities">
              {aiAnalysisResults && <AIVulnerabilitySection data={aiAnalysisResults} />}
            </section>
            {/* <section id="recurring-bugs">
              <RecurringBugsSection data={logData} />
            </section> */}
            {/* <section id="code-improvements">
            {findingsData && <CodeImprovementsSection data={recurringProblems} />}
            </section> */}
            <section id="recommendations">
             {summaryData && <RecommendationsSection data={summaryData} />}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
