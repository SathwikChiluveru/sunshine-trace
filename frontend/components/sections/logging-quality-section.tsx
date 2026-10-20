import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import type { ParsedLogData } from "@/lib/types"

  interface LoggingQualitySectionProps {
    data: any
  }

  export function LoggingQualitySection({ data }: LoggingQualitySectionProps) {
    // Prefer dynamic loggingScores; fallback to serviceQuality
    const fromScores = Array.isArray(data?.loggingScores) ? data.loggingScores : []
    const fromServices = Array.isArray(data?.serviceQuality) ? data.serviceQuality.map((sq: any) => ({ module: sq.service, score: sq.score, gaps: sq.issues || [] })) : []
    const merged = fromScores.length > 0 ? fromScores : fromServices
    const modules = merged.map((sq: any) => ({
      name: sq.module || sq.service,
      score: sq.score ?? 0,
      missingLogs: Math.max(0, 100 - (sq.score ?? 0)) / 5,
      verboseLogs: Array.isArray(sq.gaps) ? sq.gaps.length * 2 : (Array.isArray(sq.issues) ? sq.issues.length * 2 : 0),
      suggestions: Array.isArray(sq.gaps) && sq.gaps.length > 0
        ? sq.gaps[0]
        : (Array.isArray(sq.issues) && sq.issues.length > 0 ? sq.issues[0] : "No issues found"),
    }))

    const getScoreColor = (score: number) => {
      if (score >= 80) return "success"
      if (score >= 60) return "warning"
      return "error"
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-balance mb-2">Logging Quality</h2>
          <p className="text-muted-foreground text-pretty">Analyze observability strength across your modules</p>
        </div>

        <Card className="report-table overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Module</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Score</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Missing Logs</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Verbose Logs</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Suggestions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modules.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">No module quality results are available for this analysis.</td></tr>}
                {modules.map((module: any) => (
                  <tr key={module.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <code className="font-mono text-sm">{module.name}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Progress
                          value={module.score}
                          className="w-24 h-2"
                          style={{
                            ["--progress-background" as string]: `var(--${getScoreColor(module.score)})`,
                          }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: `var(--${getScoreColor(module.score)})` }}
                        >
                          {module.score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{module.missingLogs}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{module.verboseLogs}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{module.suggestions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }
