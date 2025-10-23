"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Eye, AlertTriangle, CheckCircle } from "lucide-react"

interface AISensitiveDataSectionProps {
  data: {
    analysis?: {
      sensitiveData?: {
        detections: Array<{
          type: string;
          value: string;
          confidence: number;
          context: string;
          suggestion: string;
        }>;
        summary: string;
      };
    };
  };
}

export function AISensitiveDataSection({ data }: AISensitiveDataSectionProps) {
  const sensitiveData = data?.analysis?.sensitiveData;

  if (!sensitiveData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5 text-red-500" />
            AI-Powered Sensitive Data Detection
          </CardTitle>
          <CardDescription>
            No AI analysis results available. Upload files to get AI-powered sensitive data detection.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { detections = [], summary = "" } = sensitiveData || {} as any;
  const highConfidenceDetections = (detections || []).filter(d => d?.confidence > 0.8);
  const mediumConfidenceDetections = (detections || []).filter(d => d?.confidence > 0.5 && d?.confidence <= 0.8);
  const lowConfidenceDetections = (detections || []).filter(d => (d?.confidence ?? 0) <= 0.5);

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "destructive";
    if (confidence > 0.5) return "default";
    return "secondary";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence > 0.8) return <AlertTriangle className="size-4" />;
    if (confidence > 0.5) return <Eye className="size-4" />;
    return <CheckCircle className="size-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-red-500" />
          AI-Powered Sensitive Data Detection
        </CardTitle>
        <CardDescription>
          Advanced AI analysis of your logs and code for sensitive information exposure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <Alert>
          <Shield className="size-4" />
          <AlertDescription>
            <strong>AI Analysis Summary:</strong> {summary}
          </AlertDescription>
        </Alert>

        {/* Detection Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <span className="text-sm font-medium">High Confidence</span>
              </div>
              <div className="text-2xl font-bold text-red-500">{highConfidenceDetections.length}</div>
              <p className="text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-yellow-500" />
                <span className="text-sm font-medium">Medium Confidence</span>
              </div>
              <div className="text-2xl font-bold text-yellow-500">{mediumConfidenceDetections.length}</div>
              <p className="text-xs text-muted-foreground">Review recommended</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                <span className="text-sm font-medium">Low Confidence</span>
              </div>
              <div className="text-2xl font-bold text-green-500">{lowConfidenceDetections.length}</div>
              <p className="text-xs text-muted-foreground">Likely false positives</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Detections */}
        {(detections?.length ?? 0) > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detailed Detections</h3>
            <div className="space-y-3">
              {detections.map((detection, index) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getConfidenceIcon(detection.confidence)}
                          <Badge variant={getConfidenceColor(detection.confidence)}>
                            {detection.type}
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(detection.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm">
                            <strong>Value:</strong> <code className="bg-muted px-1 rounded">{detection.value}</code>
                          </p>
                          <p className="text-sm">
                            <strong>Context:</strong> {detection.context}
                          </p>
                          <p className="text-sm">
                            <strong>AI Suggestion:</strong> {detection.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        {(detections?.length ?? 0) > 0 && (
          <Alert>
            <Shield className="size-4" />
            <AlertDescription>
              <strong>AI Recommendations:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Implement data masking for sensitive fields in logging</li>
                <li>• Use environment variables for configuration instead of hardcoded values</li>
                <li>• Add input validation to prevent sensitive data from being logged</li>
                <li>• Consider implementing a data classification system</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
