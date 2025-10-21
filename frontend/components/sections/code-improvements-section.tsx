"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CodeImprovementsSectionProps {
  data: any
}

interface RecurringProblem {
  signature: string;
  count: number;
  rootCauseHint: string;
  recommendedFix: string;
}

export function CodeImprovementsSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null); // Track which problem is expanded

  const [recurringProblems, setRecurringProblems] = useState<RecurringProblem[]>([]);

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "error";
    if (severity === "high") return "warning";
    return "info";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Recurring Problems</h2>
        <p className="text-muted-foreground text-pretty">
          List of recurring issues in your application with suggested fixes.
        </p>
      </div>

      <div className="space-y-4">
        {recurringProblems.map((problem, index) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full p-6 text-left hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-balance">{problem.signature}</h3>
                    <Badge variant="outline" className="border-0" style={{ backgroundColor: "var(--warning)/0.1", color: "var(--warning)" }}>
                      {problem.count}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty mb-2">{problem.rootCauseHint}</p>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Suggested Fix
                  </Badge>
                </div>
                <div className="ml-4">
                  {expandedIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {expandedIndex === index && (
              <div className="border-t border-border">
                <div className="p-6 bg-accent/5 border-t border-border">
                  <h4 className="font-semibold text-sm mb-3">Suggested Fix</h4>
                  <p className="text-sm text-pretty">{problem.recommendedFix}</p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}