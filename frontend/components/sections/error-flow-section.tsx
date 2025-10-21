"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { CallChainDiagram } from "@/components/call-chain-diagram"

interface ErrorFlowSectionProps {
  data: any
}

export function ErrorFlowSection({ data }: ErrorFlowSectionProps) {
  // Make sure errorFlows exist and fall back to an empty array if they do not
  const errorFlows = data?.errorFlows || []

  const [expandedFlow, setExpandedFlow] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Error Flow Visualizer</h2>
        <p className="text-muted-foreground text-pretty">
          Understand how warnings and errors escalate through your call chain
        </p>
      </div>

      <div className="space-y-4">
        {errorFlows.map((flow: any, index: number) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => setExpandedFlow(expandedFlow === flow.stackTop ? null : flow.stackTop)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expandedFlow === flow.stackTop ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-balance">{flow.stackTop}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: "var(--error)/0.1",
                        color: "var(--error)",
                      }}
                    >
                      {flow.stackTop.includes("FATAL") ? "critical" : "high"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{new Date().toISOString()}</span> {/* Add a real timestamp if available */}
                    <span>•</span>
                    <span>{flow.path.length} occurrences</span> {/* Assuming occurrences are length of path */}
                  </div>
                </div>
              </div>
            </button>

            {expandedFlow === flow.stackTop && (
              <div className="px-6 pb-6 space-y-4 border-t border-border">
                <div className="pt-4">
                  <h4 className="text-sm font-semibold mb-3">Call Chain</h4>
                  <CallChainDiagram
                    flowId={flow.stackTop} 
                    errorFlow={{ path: flow.path, stackTop: flow.stackTop }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Raw Logs</h4>
                    <Button variant="ghost" size="sm">
                      Copy
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-4 font-mono text-xs overflow-x-auto">
                    {flow.path.map((log: string, idx: number) => (
                      <div key={idx} className="text-muted-foreground">
                        [{new Date().toISOString()}] <span style={{ color: "var(--warning)" }}>{log}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-3 bg-info/5 border border-info/20 rounded-md">
                    <p className="text-sm" style={{ color: "var(--info)" }}>
                      💡 <span className="font-semibold">Recommendation:</span> Add connection retry logic with exponential backoff
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}