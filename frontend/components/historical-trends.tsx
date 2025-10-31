"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface MetricData {
  loggingQuality: number
  errorFlows: number
  sensitiveData: number
  recommendations: number
}

interface HistoricalEntry {
  id: string
  timestamp: Date
  fileName: string
  metrics: MetricData
}

interface TrendIndicatorProps {
  current: number
  previous: number | null
}

function TrendIndicator({ current, previous }: TrendIndicatorProps) {
  if (previous === null) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm">No data</span>
      </div>
    )
  }

  const change = current - previous
  const percentChange = previous !== 0 ? ((change / previous) * 100).toFixed(1) : "0"

  if (change > 0) {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm font-medium">
          +{Math.abs(change)} ({percentChange}%)
        </span>
      </div>
    )
  } else if (change < 0) {
    return (
      <div className="flex items-center gap-1 text-green-500">
        <TrendingDown className="h-4 w-4" />
        <span className="text-sm font-medium">
          {change} ({percentChange}%)
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span className="text-sm">No change</span>
    </div>
  )
}

interface HistoricalTrendsProps {
  currentMetrics: MetricData
  history: HistoricalEntry[]
}

export function HistoricalTrends({ currentMetrics, history }: HistoricalTrendsProps) {
  const previousMetrics = history.length > 0 ? history[0].metrics : null

  const metricCards = [
    {
      label: "Logging Quality",
      current: currentMetrics.loggingQuality,
      previous: previousMetrics?.loggingQuality ?? null,
      color: "text-blue-600",
    },
    {
      label: "Error Flows",
      current: currentMetrics.errorFlows,
      previous: previousMetrics?.errorFlows ?? null,
      color: "text-orange-600",
    },
    {
      label: "Sensitive Data Detection",
      current: currentMetrics.sensitiveData,
      previous: previousMetrics?.sensitiveData ?? null,
      color: "text-red-600",
    },
    {
      label: "AI Recommendations",
      current: currentMetrics.recommendations,
      previous: previousMetrics?.recommendations ?? null,
      color: "text-amber-600",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Metric Cards with Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">{metric.label}</h3>
              <span className={`text-sm font-semibold ${metric.color}`}>{metric.current}</span>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{metric.current}</p>
              <TrendIndicator current={metric.current} previous={metric.previous} />
            </div>
          </Card>
        ))}
      </div>

      {/* Upload History Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upload History</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
  <TableRow>
    <TableHead>Timestamp</TableHead>
    <TableHead className="text-center">Logging Quality</TableHead>
    <TableHead className="text-center">Error Flows</TableHead>
    <TableHead className="text-center">Sensitive Data</TableHead>
    <TableHead className="text-center">Recommendations</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {history.length === 0 ? (
    <TableRow>
      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
        No previous uploads found
      </TableCell>
    </TableRow>
  ) : (
    history.map((entry) => (
      <TableRow key={entry.id}>
        <TableCell className="font-medium">
          {new Date(entry.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </TableCell>
        <TableCell className="text-center">{entry.metrics.loggingQuality}</TableCell>
        <TableCell className="text-center">{entry.metrics.errorFlows}</TableCell>
        <TableCell className="text-center">{entry.metrics.sensitiveData}</TableCell>
        <TableCell className="text-center">{entry.metrics.recommendations}</TableCell>
      </TableRow>
    ))
  )}
</TableBody>

          </Table>
        </div>
      </Card>
    </div>
  )
}
