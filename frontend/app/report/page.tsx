"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { SummarySection } from "@/components/sections/summary-section"
import { AiSummarySection } from "@/components/sections/ai-summary-section"
import { LoggingQualitySection } from "@/components/sections/logging-quality-section"
import { ErrorFlowSection } from "@/components/sections/error-flow-section"
import { SensitiveDataSection } from "@/components/sections/sensitive-data-section"
import { RecurringBugsSection } from "@/components/sections/recurring-bugs-section"
import { CodeImprovementsSection } from "@/components/sections/code-improvements-section"
import { RecommendationsSection } from "@/components/sections/recommendations-section"
import type { ParsedLogData } from "@/lib/types"

export default function DebugReport() {
  const [activeSection, setActiveSection] = useState("summary")
  const [logData, setLogData] = useState<ParsedLogData | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [findingsData, setFindingsData] = useState<any>(null)
  const [riskHeatmapData, setRiskHeatmapData] = useState<any>(null)
  const [recurringProblems, setRecurringProblems] = useState<any>(null)
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
  }, [])

  useEffect(() => {
    // Fetch summary data from backend API
    fetch("https://sunshine-trace-u7fl.vercel.app/api/summary")
      .then((response) => response.json())
      .then((data) => setSummaryData(data))
      .catch((error) => console.error("Error fetching summary data:", error))
  }, [])

  useEffect(() => {
    // Fetch findings data from the correct API
    fetch("https://sunshine-trace-u7fl.vercel.app/api/findings")
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
