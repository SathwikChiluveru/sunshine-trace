"use client"

import { useEffect, useState } from "react"
import { BarChart3, GitBranch, Shield, Lightbulb, ChevronDown, RefreshCw } from "lucide-react"
import { HistoricalTrends } from "@/components/historical-trends"
import { Button } from "@/components/ui/button"
import type { ParsedLogData } from "@/lib/types"

interface SummarySectionProps {
  data: ParsedLogData | null
  executiveSummary: string | null
  riskHeatmapData: Array<{ name: string; score: number }> | null
  summaryData?: any
  findingsData?: { loggingScores?: unknown[]; piiFindings?: unknown[]; aiRecommendations?: unknown[]; errorFlows?: unknown[] }
}

export function SummarySection({ data, executiveSummary, riskHeatmapData, summaryData, findingsData }: SummarySectionProps) {
  const [showHistory, setShowHistory] = useState(true)
  const [metrics, setMetrics] = useState<{ history: any[]; isSample?: boolean }>({ history: [] })
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setHistoryState("loading")
    async function loadHistory() {
      try {
        const response = await fetch("/api/summary/metrics", { signal: controller.signal })
        if (!response.ok) throw new Error("History unavailable")
        const result = await response.json()
        if (!Array.isArray(result.history)) throw new Error("Invalid history")
        const history = result.history.filter((entry: any) =>
          entry && typeof entry.id === "string" && entry.metrics && Number.isFinite(Date.parse(entry.timestamp)) &&
          ["loggingQuality", "errorFlows", "sensitiveData", "recommendations"].every(key => Number.isFinite(entry.metrics[key]))
        )
        if (!controller.signal.aborted) {
          setMetrics({ history, isSample: result.isSample === true })
          setHistoryState("ready")
        }
      } catch {
        if (!controller.signal.aborted) setHistoryState("error")
      }
    }
    loadHistory()
    return () => controller.abort()
  }, [retry])

  const loggingCount = findingsData?.loggingScores?.length ?? riskHeatmapData?.length ?? 0
  const sensitiveCount = findingsData?.piiFindings?.length ?? data?.sensitiveData?.length ?? 0
  const recommendationCount = findingsData?.aiRecommendations?.length ??
    (summaryData?.ai_recommendations?.length ?? summaryData?.recommended_actions?.length ?? 0) + (summaryData?.code_fixes?.length ?? 0)
  const errorCount = findingsData?.errorFlows?.length ?? data?.errorFlows?.length ?? data?.errorCorrelations?.length ?? 0
  const stats = [
    { label: "Modules reviewed", value: loggingCount, icon: BarChart3, color: "var(--info)" },
    { label: "Error flows", value: errorCount, icon: GitBranch, color: "var(--warning)" },
    { label: "Sensitive data findings", value: sensitiveCount, icon: Shield, color: "var(--error)" },
    { label: "Recommendations", value: recommendationCount, icon: Lightbulb, color: "var(--success)" },
  ]
  const logStats = data?.summary ?? summaryData?.logStatistics

  return (
    <div className="report-overview space-y-7">
      <div className="report-section-heading">
        <h2>Summary</h2>
        {logStats && <p>{logStats.totalLogs ?? 0} log entries · {logStats.errorCount ?? 0} errors · {logStats.warningCount ?? 0} warnings</p>}
      </div>
      <dl className="report-stat-strip">
        {stats.map(({ label, value, icon: Icon, color }) => <div key={label}>
          <dt><Icon className="size-4" style={{ color }} aria-hidden="true" />{label}</dt>
          <dd>{value.toLocaleString("en-US")}</dd>
        </div>)}
      </dl>
      {executiveSummary && <div className="report-executive">
        <h3>What the analysis found</h3>
        <p>{executiveSummary}</p>
        {data?.summary.timeRange?.start && <p className="report-period">Log period: {data.summary.timeRange.start} — {data.summary.timeRange.end}</p>}
      </div>}
      <div className="report-history">
        <div className="report-panel-heading">
          <div><h3>Analysis history</h3><p>{metrics.isSample ? "Sample history from the hackathon prototype." : "Compare findings across previous analyses."}</p></div>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory} aria-controls="report-history-content">
            {showHistory ? "Collapse" : "Expand"}<ChevronDown className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </Button>
        </div>
        {showHistory && <div id="report-history-content">
          {historyState === "loading" ? <p className="report-inline-state" role="status">Loading analysis history…</p>
            : historyState === "error" ? <div className="report-inline-state" role="status"><div><p className="font-medium text-foreground">History is unavailable</p><p>Your current analysis is still available. Try again when the report service is online.</p></div><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}><RefreshCw className="size-3.5" /> Retry</Button></div>
            : <HistoricalTrends currentMetrics={{ loggingQuality: loggingCount, errorFlows: errorCount, sensitiveData: sensitiveCount, recommendations: recommendationCount }} history={metrics.history.map(entry => ({ ...entry, timestamp: new Date(entry.timestamp) }))} />}
        </div>}
      </div>
    </div>
  )
}
