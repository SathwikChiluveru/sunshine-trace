import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heatmap } from "@/components/heatmap";
import { MiniChart } from "@/components/mini-chart";
import type { ParsedLogData } from "@/lib/types";

interface SummarySectionProps {
  data: ParsedLogData | null;
  executiveSummary: string | null;  
  riskHeatmapData: Array<{ name: string; score: number }>; 
}

export function SummarySection({
  data,
  executiveSummary,
  riskHeatmapData,
}: SummarySectionProps) {
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true)
  const issueStats = data
    ? [
        { label: "Total Logs", count: data.summary.totalLogs, color: "info" },
        { label: "Errors", count: data.summary.errorCount, color: "error" },
        { label: "Warnings", count: data.summary.warningCount, color: "warning" },
        { label: "Sensitive Data", count: data.sensitiveData.length, color: "error" },
      ]
    : [
        { label: "Missing Logs", count: 47, color: "warning" },
        { label: "Crashes", count: 12, color: "error" },
        { label: "Info Overload", count: 23, color: "info" },
        { label: "Sensitive Info", count: 8, color: "error" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Summary</h2>
        <p className="text-muted-foreground text-pretty">
          {executiveSummary || "Quick overview of your codebase health and logging quality"}
        </p>
        {data && data.summary.timeRange.start && (
          <p className="text-sm text-muted-foreground mt-2">
            Log period: {data.summary.timeRange.start} to {data.summary.timeRange.end}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {issueStats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <Badge
                variant="outline"
                className="border-0"
                style={{
                  backgroundColor: `var(--${stat.color})/0.1`,
                  color: `var(--${stat.color})`,
                }}
              >
                {stat.count}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stat.count}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
      <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Module Health Heatmap</h3>
            <button
              onClick={() => setIsHeatmapVisible(!isHeatmapVisible)} // Toggle heatmap visibility
              className="text-sm text-blue-500 hover:text-blue-700 focus:outline-none"
            >
              {isHeatmapVisible ? "Collapse" : "Expand"}
            </button>
          </div>
          {isHeatmapVisible && <Heatmap data={riskHeatmapData} />} {/* Conditionally render heatmap */}
        </Card>
      </div>
    </div>
  );
}
