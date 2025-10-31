import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistoricalTrends } from "@/components/historical-trends";
import { MiniChart } from "@/components/mini-chart";
import type { ParsedLogData } from "@/lib/types";

interface SummarySectionProps {
  data: ParsedLogData | null;
  executiveSummary: string | null;  
  riskHeatmapData: Array<{ name: string; score: number }>;
  summaryData?: any; // Add summaryData to access logStatistics
  findingsData?: {
    loggingScores?: Array<unknown>;
    piiFindings?: Array<unknown>;
    aiRecommendations?: Array<unknown>;
  };
}

export function SummarySection({
  data,
  executiveSummary,
  riskHeatmapData,
  summaryData,
  findingsData,
}: SummarySectionProps) {
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true);
  const [metricsData, setMetricsData] = useState<{ currentMetrics: any; history: any[] }>({
    currentMetrics: {},
    history: [],
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/summary/metrics");
        const json = await res.json();
        setMetricsData(json);
      } catch (err) {
        console.error("Error fetching metrics:", err);
      }
    };
    fetchMetrics();
  }, []);
  const getLogStats = () => {
    if (data?.summary) {
      // From pasted logs
      return {
        totalLogs: data.summary.totalLogs || 0,
        errorCount: data.summary.errorCount || 0,
        warningCount: data.summary.warningCount || 0,
        sensitiveDataCount: data.sensitiveData?.length || 0
      };
    } else if (summaryData?.logStatistics) {
      // From AI zip results
      return {
        totalLogs: summaryData.logStatistics.totalLogs || 0,
        errorCount: summaryData.logStatistics.errorCount || 0,
        warningCount: summaryData.logStatistics.warningCount || 0,
        sensitiveDataCount: 0 // Will be calculated separately
      };
    }
    return null;
  };

  const logStats = getLogStats();
  const loggingQualityCount =
    findingsData?.loggingScores?.length ??
    (Array.isArray(riskHeatmapData) ? riskHeatmapData.length : 0);
  const sensitiveDataCount =
    findingsData?.piiFindings?.length ??
    (Array.isArray(data?.sensitiveData) ? data.sensitiveData.length : 0);
  const guidanceCount =
    Array.isArray(summaryData?.ai_recommendations)
      ? summaryData.ai_recommendations.length
      : Array.isArray(summaryData?.recommended_actions)
        ? summaryData.recommended_actions.length
        : 0;
  const codeFixCount = Array.isArray(summaryData?.code_fixes) ? summaryData.code_fixes.length : 0;
  const aiRecommendationCount =
    findingsData?.aiRecommendations?.length ??
    guidanceCount + codeFixCount;
  
  const issueStats = logStats
    ? [
        { label: "Logging Quality", count: loggingQualityCount, color: "info" },
        { label: "Sensitive Data Detection", count: sensitiveDataCount, color: "error" },
        { label: "AI Recommendations", count: aiRecommendationCount, color: "warning" },
      ]
    : [
        { label: "Logging Quality", count: loggingQualityCount, color: "info" },
        { label: "Sensitive Data Detection", count: sensitiveDataCount, color: "error" },
        { label: "AI Recommendations", count: aiRecommendationCount, color: "warning" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Summary</h2>
        <p className="text-muted-foreground text-pretty">
        </p>
        {data && data.summary.timeRange.start && (
          <p className="text-sm text-muted-foreground mt-2">
            Log period: {data.summary.timeRange.start} to {data.summary.timeRange.end}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <h3 className="text-lg font-semibold">Historical Trends</h3>
             <button
              onClick={() => setIsHeatmapVisible(!isHeatmapVisible)} 
              className="text-sm text-blue-500 hover:text-blue-700 focus:outline-none"
            >
              {isHeatmapVisible ? "Collapse" : "Expand"}
            </button>
          </div>
         {isHeatmapVisible && (
  <HistoricalTrends
    currentMetrics={{
      loggingQuality: loggingQualityCount,
      errorFlows: metricsData.currentMetrics?.errorFlows || 0,
      sensitiveData: sensitiveDataCount,
      recommendations: aiRecommendationCount,
    }}
    history={metricsData.history.map((h) => ({
      ...h,
      timestamp: new Date(h.timestamp),
    }))}
  />
)}
        </Card>
      </div>
    </div>
  );
}