export interface LogEntry {
  timestamp: string
  level: "INFO" | "ERROR" | "WARN" | "FATAL" | "DEBUG"
  service: string
  message: string
  lineNumber: number
  raw: string
}

export interface SensitiveDataMatch {
  type: "NRIC" | "EMAIL" | "PHONE" | "CREDIT_CARD" | "PATIENT_ID" | "API_KEY"
  value: string
  logEntry: LogEntry
  suggestion: string
}

export interface ErrorPattern {
  errorType: string
  count: number
  services: string[]
  firstSeen: string
  lastSeen: string
  examples: LogEntry[]
}

export interface ErrorCorrelation {
  trigger: string
  cascades: string[]
  timeWindow: number
}

export interface ServiceQuality {
  service: string
  totalLogs: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
  score: number
  issues: string[]
}

export interface ParsedLogData {
  entries: LogEntry[]
  errorPatterns: ErrorPattern[]
  sensitiveData: SensitiveDataMatch[]
  errorCorrelations?: ErrorCorrelation[]
  serviceQuality: ServiceQuality[]
  summary: {
    totalLogs: number
    errorCount: number
    warningCount: number
    fatalCount: number
    timeRange: { start: string; end: string }
    overallScore: number
  }
  // Additional data from debug report integration
  recurringProblems?: Array<{
    signature: string
    count: number
    rootCauseHint: string
    recommendedFix: string
  }>
  errorFlows?: Array<{
    path: string[]
    stackTop: string
  }>
  actionableFixes?: Array<{
    title: string
    owner: string
    diffHint: string
  }>
  aiSummary?: {
    executive_summary: string
    top_risks: string[]
    recommended_actions: string[]
  }
  // Additional data from findings.json
  riskHeatmap?: Array<{
    module: string
    risk: number
  }>
  loggingScores?: Array<{
    module: string
    score: number
    gaps: string[]
  }>
}
