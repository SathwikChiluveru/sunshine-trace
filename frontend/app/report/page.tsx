"use client"

import { useState, useEffect } from "react"
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
  const [activeSection, setActiveSection] = useState("summary")
  const [logData, setLogData] = useState<ParsedLogData | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [findingsData, setFindingsData] = useState<any>(null)
  const [riskHeatmapData, setRiskHeatmapData] = useState<any>(null)
  const [recurringProblems, setRecurringProblems] = useState<any>(null)
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any>(null)
  const [aiZipResults, setAiZipResults] = useState<any>(null)
  useEffect(() => {
    // Try to load parsed log data from localStorage
    const storedData = localStorage.getItem("debugReportData")
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData)
        setLogData(parsed)
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
    // Fetch summary data from backend API
    // Prefer dynamic summary from AI zip results if available
    if (aiZipResults?.summary) {
      setSummaryData(aiZipResults.summary)
      return
    }
    fetch(`${API_BASE}/api/summary`)
      .then((response) => response.json())
      .then((data) => setSummaryData(data))
      .catch((error) => console.error("Error fetching summary data:", error))
  }, [])

  useEffect(() => {
    // Fetch findings data from the correct API
    // Prefer dynamic riskHeatmap from AI zip results if available
    if (aiZipResults?.riskHeatmap) {
      const data = { loggingScores: [], ...aiZipResults, riskHeatmap: aiZipResults.riskHeatmap }
      setFindingsData(data)
      const heatmapData = aiZipResults.riskHeatmap.map((module: any) => ({
        name: module.module.split("\\").pop() || module.module,
        score: module.risk,
      }))
      setRiskHeatmapData(heatmapData)
      return
    }
    fetch(`${API_BASE}/api/findings`)
      .then((response) => response.json())
      .then((data) => {
        setFindingsData(data);
        setRecurringProblems(data.recurringProblems);
        const heatmapData = data.riskHeatmap.map((module: any) => ({
          name: module.module.split("\\").pop() || module.module, // Extract module name
          score: module.risk, // Risk score
        }));
        setRiskHeatmapData(heatmapData); // Set this data for heatmap
      })
      .catch((error) => console.error("Error fetching findings data:", error))
  }, [])

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
              {findingsData && <LoggingQualitySection data={findingsData.loggingScores} />}
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
