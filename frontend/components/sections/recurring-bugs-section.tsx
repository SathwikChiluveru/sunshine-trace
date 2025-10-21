import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowRight } from "lucide-react"
import { TimelineChart } from "@/components/timeline-chart"
import type { ParsedLogData } from "@/lib/types"

interface RecurringBugsSectionProps {
  data: ParsedLogData | null
}

export function RecurringBugsSection({ data }: RecurringBugsSectionProps) {
  const bugs = data
    ? (data.recurringProblems || data.errorPatterns).map((ep, idx) => ({
        id: `BUG-${String(idx + 1).padStart(3, "0")}`,
        signature: ep.signature || ep.errorType,
        firstSeen: ep.firstSeen || "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
        lastSeen: ep.lastSeen || "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
        count: ep.count || 1,
        modules: ep.services || ["EpisodeService", "PatientService", "PaymentGateway"], // HARDCODED - from debug report
      }))
    : [
        {
          id: "BUG-001",
          signature: "#-#-# #:#:# ERROR EpisodeService - NullPointerException at EpisodeService.java:#",
          firstSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          lastSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          count: 1, // HARDCODED - from debug report
          modules: ["EpisodeService"], // HARDCODED - from debug report
        },
        {
          id: "BUG-002",
          signature: "#-#-# #:#:# FATAL EpisodeService - System crashed due to null dischargeType",
          firstSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          lastSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          count: 1, // HARDCODED - from debug report
          modules: ["EpisodeService"], // HARDCODED - from debug report
        },
        {
          id: "BUG-003",
          signature: "#-#-# #:#:# ERROR PatientService - Database connection timeout at PatientService.java:#",
          firstSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          lastSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          count: 1, // HARDCODED - from debug report
          modules: ["PatientService"], // HARDCODED - from debug report
        },
        {
          id: "BUG-004",
          signature: "#-#-# #:#:# ERROR PaymentGateway - Transaction failed for ID TXN-#",
          firstSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          lastSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          count: 1, // HARDCODED - from debug report
          modules: ["PaymentGateway"], // HARDCODED - from debug report
        },
        {
          id: "BUG-005",
          signature: "#-#-# #:#:# ERROR PaymentGateway - Second failure for transaction TXN-#",
          firstSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          lastSeen: "2025-10-16T06:02:19.903Z", // HARDCODED - from debug report
          count: 1, // HARDCODED - from debug report
          modules: ["PaymentGateway"], // HARDCODED - from debug report
        },
      ]

  const topBug = bugs.length > 0 ? bugs[0] : null
  const correlations = data?.errorCorrelations || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Recurring Bug Patterns</h2>
        <p className="text-muted-foreground text-pretty">Identify repeat offenders and patterns in your error logs</p>
      </div>

      {topBug && topBug.count > 5 && (
        <Alert className="border-error/20 bg-error/5">
          <AlertCircle className="h-4 w-4" style={{ color: "var(--error)" }} />
          <AlertDescription>
            <span className="font-semibold">{topBug.id}</span> has occurred {topBug.count} times - {topBug.signature}
          </AlertDescription>
        </Alert>
      )}

      {correlations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Error Cascades Detected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These errors trigger other failures within {correlations[0]?.timeWindow || 5} seconds
          </p>
          <div className="space-y-3">
            {correlations.slice(0, 5).map((correlation, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">
                      Trigger
                    </Badge>
                    <code className="text-xs font-mono">{correlation.trigger}</code>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {correlation.cascades.map((cascade, cIdx) => (
                        <code
                          key={cIdx}
                          className="text-xs font-mono bg-background px-2 py-1 rounded border border-border"
                        >
                          {cascade}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Issue Frequency Timeline</h3>
        <TimelineChart />
      </Card>

      {bugs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No recurring error patterns detected.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Bug ID</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Signature</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">First Seen</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Last Seen</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Count</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Modules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <code className="font-mono text-sm font-semibold">{bug.id}</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="font-mono text-xs">{bug.signature}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{bug.firstSeen}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{bug.lastSeen}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className="border-0"
                        style={{
                          backgroundColor: "var(--error)/0.1",
                          color: "var(--error)",
                        }}
                      >
                        {bug.count}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {bug.modules.map((module) => (
                          <Badge key={module} variant="secondary" className="text-xs">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
