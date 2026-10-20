"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface MetricData { loggingQuality: number; errorFlows: number; sensitiveData: number; recommendations: number }
interface HistoricalEntry { id: string; timestamp: Date; fileName: string; metrics: MetricData }
interface HistoricalTrendsProps { currentMetrics: MetricData; history: HistoricalEntry[] }

export function HistoricalTrends({ currentMetrics, history }: HistoricalTrendsProps) {
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Analysis</TableHead><TableHead className="text-right">Logging quality</TableHead><TableHead className="text-right">Error flows</TableHead><TableHead className="text-right">Sensitive data</TableHead><TableHead className="text-right">Recommendations</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        <TableRow className="report-current-row"><TableCell><span className="font-medium">Current analysis</span><span className="block text-xs text-muted-foreground">This report</span></TableCell><TableCell className="text-right">{currentMetrics.loggingQuality}</TableCell><TableCell className="text-right">{currentMetrics.errorFlows}</TableCell><TableCell className="text-right">{currentMetrics.sensitiveData}</TableCell><TableCell className="text-right">{currentMetrics.recommendations}</TableCell></TableRow>
        {history.map(entry => <TableRow key={entry.id}>
          <TableCell><span className="font-medium">{entry.fileName || "Previous analysis"}</span><time className="block text-xs text-muted-foreground" dateTime={entry.timestamp.toISOString()}>{entry.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time></TableCell>
          <TableCell className="text-right">{entry.metrics.loggingQuality}</TableCell><TableCell className="text-right">{entry.metrics.errorFlows}</TableCell><TableCell className="text-right">{entry.metrics.sensitiveData}</TableCell><TableCell className="text-right">{entry.metrics.recommendations}</TableCell>
        </TableRow>)}
        {!history.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No previous analyses to compare yet.</TableCell></TableRow>}
      </TableBody>
    </Table>
  )
}
