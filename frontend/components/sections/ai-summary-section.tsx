import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, AlertTriangle, Lightbulb } from "lucide-react"
import type { ParsedLogData } from "@/lib/types"

interface AiSummarySectionProps {
  data: ParsedLogData | null
}

export function AiSummarySection({ data }: AiSummarySectionProps) {
  const aiSummary = data?.aiSummary

  if (!aiSummary) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">AI Executive Summary</h2>
        <p className="text-muted-foreground text-pretty">
          AI-generated analysis of your system's health and recommendations
        </p>
      </div>

      {/* Executive Summary */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Brain className="size-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
            <p className="text-muted-foreground text-pretty leading-relaxed">
              {aiSummary.executive_summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Top Risks */}
      {aiSummary.top_risks && aiSummary.top_risks.length > 0 && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3">Top Risks</h3>
              <div className="space-y-2">
                {aiSummary.top_risks.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <Badge variant="destructive" className="text-xs mt-0.5">
                      {index + 1}
                    </Badge>
                    <p className="text-sm text-pretty">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommended Actions */}
      {aiSummary.recommended_actions && aiSummary.recommended_actions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Lightbulb className="size-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3">Recommended Actions</h3>
              <div className="space-y-3">
                {aiSummary.recommended_actions.map((action, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="size-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm text-pretty">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
