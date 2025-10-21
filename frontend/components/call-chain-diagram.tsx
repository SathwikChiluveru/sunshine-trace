interface ChainNode {
  name: string
  severity: string
  time: string
}

interface CallChainDiagramProps {
  flowId: string
  errorFlow?: {
    path: string[]
    stackTop: string
  }
}

export function CallChainDiagram({ flowId, errorFlow }: CallChainDiagramProps) {
  // Use actual error flow data if available, otherwise fallback to hardcoded chains
  const chain: ChainNode[] = errorFlow 
    ? errorFlow.path.map((step: string, idx: number) => {
        const severity = step.includes("WARN") ? "warning" : 
                        step.includes("ERROR") ? "error" : 
                        step.includes("FATAL") ? "error" : "info"
        return {
          name: step.replace(/WARN|ERROR|FATAL/, "").trim() || step,
          severity,
          time: `06:02:19.${String(idx * 100 + 903).padStart(3, '0')}`, // HARDCODED - from debug report timestamp
        }
      })
    : (() => {
        const fallbackChains: Record<string, ChainNode[]> = {
          "flow-1": [
            { name: "EpisodeService", severity: "info", time: "06:02:19.903" }, // HARDCODED - from debug report
            { name: "NullPointerException", severity: "error", time: "06:02:19.904" }, // HARDCODED - from debug report
            { name: "System Crash", severity: "error", time: "06:02:19.905" }, // HARDCODED - from debug report
          ],
          "flow-2": [
            { name: "PatientService", severity: "info", time: "06:02:19.903" }, // HARDCODED - from debug report
            { name: "Database Timeout", severity: "error", time: "06:02:19.904" }, // HARDCODED - from debug report
          ],
          "flow-3": [
            { name: "PaymentGateway", severity: "info", time: "06:02:19.903" }, // HARDCODED - from debug report
            { name: "Transaction Failed", severity: "error", time: "06:02:19.904" }, // HARDCODED - from debug report
          ],
        }
        return fallbackChains[flowId] || [
          { name: "EpisodeService", severity: "info", time: "06:02:19.903" }, // HARDCODED - from debug report
          { name: "NullPointerException", severity: "error", time: "06:02:19.904" }, // HARDCODED - from debug report
          { name: "System Crash", severity: "error", time: "06:02:19.905" }, // HARDCODED - from debug report
        ]
      })()

  const getSeverityColor = (severity: string) => {
    if (severity === "error") return "var(--error)"
    if (severity === "warning") return "var(--warning)"
    return "var(--info)"
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2">
      {chain.map((node, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex flex-col items-center min-w-[140px]">
            <div
              className="w-full px-4 py-3 rounded-md border-2 text-center"
              style={{
                borderColor: getSeverityColor(node.severity),
                backgroundColor: `${getSeverityColor(node.severity)}15`,
              }}
            >
              <div className="font-semibold text-sm mb-1">{node.name}</div>
              <div className="text-xs font-mono text-muted-foreground">{node.time}</div>
            </div>
          </div>
          {index < chain.length - 1 && (
            <div
              className="w-8 h-0.5"
              style={{
                backgroundColor: getSeverityColor(chain[index + 1].severity),
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
