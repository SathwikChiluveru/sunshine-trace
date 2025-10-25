import type { LogEntry, ParsedLogData, ErrorPattern, SensitiveDataMatch, ServiceQuality } from "./types"

// Regex patterns for sensitive data (matching debug-report.js patterns)
const SENSITIVE_PATTERNS = {
  NRIC: /\b[STFG]\d{7}[A-Z]\b/g, // Updated to match debug-report.js exactly
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+65|65)?[689]\d{7}/g,
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  PATIENT_ID: /P\d{6,8}/g,
  API_KEY: /[Aa][Pp][Ii][-_]?[Kk][Ee][Yy][\s:=]+[\w-]{20,}/g,
}

// Real data from findings.json and summary.json for integration
const REAL_DEBUG_DATA = {
  recurringProblems: [
    {
      signature: "#-#-# #:#:# ERROR EpisodeService - NullPointerException at EpisodeService.java:#",
      count: 1,
      files: [],
      rootCauseHint: "Triage needed",
      recommendedFix: "Add guard / validate inputs"
    },
    {
      signature: "#-#-# #:#:# FATAL EpisodeService - System crashed due to null dischargeType",
      count: 1,
      files: [],
      rootCauseHint: "Triage needed", 
      recommendedFix: "Add guard / validate inputs"
    },
    {
      signature: "#-#-# #:#:# ERROR PatientService - Database connection timeout at PatientService.java:#",
      count: 1,
      files: [],
      rootCauseHint: "Triage needed",
      recommendedFix: "Add guard / validate inputs"
    },
    {
      signature: "#-#-# #:#:# ERROR PaymentGateway - Transaction failed for ID TXN-#",
      count: 1,
      files: [],
      rootCauseHint: "Triage needed",
      recommendedFix: "Add guard / validate inputs"
    },
    {
      signature: "#-#-# #:#:# ERROR PaymentGateway - Second failure for transaction TXN-#",
      count: 1,
      files: [],
      rootCauseHint: "Triage needed",
      recommendedFix: "Add guard / validate inputs"
    }
  ],
  errorFlows: [
    {
      path: ["WARN something", "ERROR something", "FATAL crash"],
      stackTop: "#-#-# #:#:# ERROR EpisodeService - NullPointerException at EpisodeService.java:#"
    },
    {
      path: ["WARN something", "ERROR something", "FATAL crash"],
      stackTop: "#-#-# #:#:# FATAL EpisodeService - System crashed due to null dischargeType"
    },
    {
      path: ["WARN something", "ERROR something", "FATAL crash"],
      stackTop: "#-#-# #:#:# ERROR PatientService - Database connection timeout at PatientService"
    },
    {
      path: ["WARN something", "ERROR something", "FATAL crash"],
      stackTop: "#-#-# #:#:# ERROR PaymentGateway - Transaction failed for ID TXN-#"
    },
    {
      path: ["WARN something", "ERROR something", "FATAL crash"],
      stackTop: "#-#-# #:#:# ERROR PaymentGateway - Second failure for transaction TXN-#"
    }
  ],
  sensitiveDataFindings: [
    {
      type: "NRIC",
      file: "app.log",
      line: 6,
      sample: "S1234567D",
      action: "mask last 4 chars"
    }
  ],
  actionableFixes: [
    {
      title: "Remove/Mask NRIC from logs",
      owner: "backend",
      diffHint: "logging middleware / filters"
    },
    {
      title: "Add correlationId to error logs",
      owner: "backend", 
      diffHint: "logging config"
    }
  ],
  aiSummary: {
    executive_summary: "The system analysis reveals high-risk dependencies in the node_modules directory, particularly within the async library and related utilities, with risk scores of 52 across multiple modules. Additionally, recurring errors such as NullPointerException, null dischargeType, database timeouts, and payment transaction failures indicate potential stability and input validation issues. Logging practices are inconsistent, with several modules scoring zero on logging quality, and sensitive information like NRIC numbers found in logs requiring masking. There is also a lack of correlation IDs in error logs which hampers debugging.",
    top_risks: [
      "High-risk dependencies in node_modules\\async and related modules with risk score 52",
      "Recurring NullPointerException and null dischargeType errors in EpisodeService",
      "Database connection timeouts in PatientService",
      "Payment gateway transaction failures in PaymentGateway",
      "Sensitive PII (NRIC) exposure in logs without masking",
      "Inconsistent logging quality with zero scores in many modules",
      "Missing correlation IDs in error logs"
    ],
    recommended_actions: [
      "Mask last four characters of NRIC numbers in logs using logging middleware or filters",
      "Add correlationId to all error logs for improved traceability",
      "Implement input validation and guards in services experiencing NullPointerException and null dischargeType",
      "Address database connection timeoutsuccess in PatientService by adding retry logic or connection pooling",
      "Improve logging consistency across modules with zero logging scores",
      "Review and enhance error handling in PaymentGateway for transaction failures"
    ]
  },
  // Additional data from findings.json
  riskHeatmap: [
    { module: "node_modules\\async\\all.js", risk: 52 },
    { module: "node_modules\\async\\allLimit.js", risk: 52 },
    { module: "node_modules\\async\\allSeries.js", risk: 52 },
    { module: "node_modules\\jake\\lib\\api.js", risk: 39 },
    { module: "node_modules\\jake\\lib\\jake.js", risk: 39 },
    { module: "node_modules\\jake\\lib\\program.js", risk: 39 },
    { module: "node_modules\\jake\\lib\\test_task.js", risk: 39 },
    { module: "packages\\debug-report-cli\\bin\\debug-report.js", risk: 67 }
  ],
  loggingScores: [
    { module: "node_modules\\async\\all.js", score: 0, gaps: [] },
    { module: "node_modules\\async\\allLimit.js", score: 0, gaps: [] },
    { module: "node_modules\\jake\\lib\\api.js", score: 33, gaps: [] },
    { module: "node_modules\\jake\\lib\\jake.js", score: 33, gaps: [] },
    { module: "packages\\debug-report-cli\\bin\\debug-report.js", score: 67, gaps: [] }
  ]
}

export function parseLogFile(content: string): ParsedLogData {
  const lines = content.split("\n").filter((line) => line.trim())
  const entries: LogEntry[] = []

  // Parse each log line
  lines.forEach((line, index) => {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(INFO|ERROR|WARN|FATAL|DEBUG)\s+(\S+)\s+-\s+(.+)$/,
    )

    if (match) {
      entries.push({
        timestamp: match[1],
        level: match[2] as LogEntry["level"],
        service: match[3],
        message: match[4],
        lineNumber: index + 1,
        raw: line,
      })
    }
  })

  // Detect error patterns
  const errorPatterns = detectErrorPatterns(entries)

  // Detect sensitive data
  const sensitiveData = detectSensitiveData(entries)

  // Detect error correlations
  const errorCorrelations = detectErrorCorrelations(entries)

  // Calculate service quality
  const serviceQuality = calculateServiceQuality(entries)

  // Calculate summary
  const summary = calculateSummary(entries)

  return {
    entries,
    errorPatterns,
    sensitiveData,
    errorCorrelations,
    serviceQuality,
    summary,
    // Only include static data in development mode to avoid interfering with real AI analysis
    ...(process.env.NODE_ENV === 'development' ? {
      recurringProblems: REAL_DEBUG_DATA.recurringProblems,
      errorFlows: REAL_DEBUG_DATA.errorFlows,
      actionableFixes: REAL_DEBUG_DATA.actionableFixes,
      aiSummary: REAL_DEBUG_DATA.aiSummary,
      riskHeatmap: REAL_DEBUG_DATA.riskHeatmap,
      loggingScores: REAL_DEBUG_DATA.loggingScores,
    } : {
      recurringProblems: [],
      errorFlows: [],
      actionableFixes: [],
      aiSummary: null,
      riskHeatmap: [],
      loggingScores: [],
    }),
  }
}

function detectErrorPatterns(entries: LogEntry[]): ErrorPattern[] {
  const errorMap = new Map<string, ErrorPattern>()

  entries
    .filter((entry) => entry.level === "ERROR" || entry.level === "FATAL")
    .forEach((entry) => {
      const errorSignature = normalizeErrorSignature(entry.message, entry.service)

      if (!errorMap.has(errorSignature)) {
        errorMap.set(errorSignature, {
          errorType: errorSignature,
          count: 0,
          services: [],
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
          examples: [],
        })
      }

      const pattern = errorMap.get(errorSignature)!
      pattern.count++
      pattern.lastSeen = entry.timestamp

      if (!pattern.services.includes(entry.service)) {
        pattern.services.push(entry.service)
      }

      if (pattern.examples.length < 3) {
        pattern.examples.push(entry)
      }
    })

  const patternsWithFrequency = Array.from(errorMap.values()).map((pattern) => {
    const occurrences = entries.filter(
      (e) =>
        (e.level === "ERROR" || e.level === "FATAL") &&
        normalizeErrorSignature(e.message, e.service) === pattern.errorType,
    )

    // Calculate average time between occurrences
    if (occurrences.length > 1) {
      const timestamps = occurrences.map((e) => new Date(e.timestamp).getTime())
      const intervals = []
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const avgMinutes = Math.round(avgInterval / 60000)

      // Add frequency info to error type display
      if (pattern.count > 2 && avgMinutes < 60) {
        pattern.errorType = `${pattern.errorType} (occurs ~every ${avgMinutes}min)`
      }
    }

    return pattern
  })

  return patternsWithFrequency.sort((a, b) => b.count - a.count)
}

function normalizeErrorSignature(message: string, service: string): string {
  let signature = message

  // Remove specific line numbers (e.g., "at Service.java:231" -> "at Service.java")
  signature = signature.replace(/\.java:\d+/g, ".java")
  signature = signature.replace(/\.py:\d+/g, ".py")
  signature = signature.replace(/line \d+/gi, "line X")

  // Remove specific IDs and transaction numbers
  signature = signature.replace(/TXN-\d+/g, "TXN-XXX")
  signature = signature.replace(/ID[:\s]+\w+/gi, "ID XXX")
  signature = signature.replace(/\b[A-Z0-9]{8,}\b/g, "HASH")

  // Remove timestamps within messages
  signature = signature.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, "TIMESTAMP")

  // Remove specific numeric values but keep the error type
  signature = signature.replace(/\b\d+\.\d+\.\d+\.\d+\b/g, "IP_ADDRESS") // IP addresses
  signature = signature.replace(/timeout after \d+ms/gi, "timeout after Xms")
  signature = signature.replace(/\d+ records?/gi, "X records")

  // Extract the core error type
  const errorType = extractErrorType(signature)

  // Combine service + error type + normalized message for unique signature
  return `${service}: ${errorType}`
}

function extractErrorType(message: string): string {
  // Extract exception type
  const exceptionMatch = message.match(/(\w+Exception|\w+Error)/i)
  if (exceptionMatch) return exceptionMatch[1]

  // Extract common error patterns
  if (message.includes("timeout")) return "Timeout Error"
  if (message.includes("connection")) return "Connection Error"
  if (message.includes("null")) return "Null Reference"
  if (message.includes("failed")) return "Operation Failed"
  if (message.includes("missing")) return "Missing Data"

  return "General Error"
}

function detectSensitiveData(entries: LogEntry[]): SensitiveDataMatch[] {
  const matches: SensitiveDataMatch[] = []

  entries.forEach((entry) => {
    // Check for NRIC (using exact pattern from debug-report.js)
    const nricMatches = entry.message.match(SENSITIVE_PATTERNS.NRIC)
    if (nricMatches) {
      nricMatches.forEach((value) => {
        matches.push({
          type: "NRIC",
          value,
          logEntry: entry,
          suggestion: "mask last 4 chars", // Updated to match debug report format
        })
      })
    }

    // Check for emails
    const emailMatches = entry.message.match(SENSITIVE_PATTERNS.EMAIL)
    if (emailMatches) {
      emailMatches.forEach((value) => {
        matches.push({
          type: "EMAIL",
          value,
          logEntry: entry,
          suggestion: `Hash email: logging.info(f"User email hash: {hashlib.sha256(email.encode()).hexdigest()[:8]}")`,
        })
      })
    }

    // Check for patient IDs
    const patientMatches = entry.message.match(SENSITIVE_PATTERNS.PATIENT_ID)
    if (patientMatches) {
      patientMatches.forEach((value) => {
        matches.push({
          type: "PATIENT_ID",
          value,
          logEntry: entry,
          suggestion: `Mask patient ID: logging.info(f"Patient ID: {patient_id[:2]}****")`,
        })
      })
    }
  })

  // Only use static data if no real data is found AND we're in demo mode
  // This prevents static data from interfering with real AI analysis
  if (matches.length === 0 && process.env.NODE_ENV === 'development' && REAL_DEBUG_DATA.sensitiveDataFindings.length > 0) {
    console.log("[LogParser] Using static demo data for sensitive data detection")
    // Convert findings.json format to our format
    REAL_DEBUG_DATA.sensitiveDataFindings.forEach((finding) => {
      matches.push({
        type: finding.type as SensitiveDataMatch["type"],
        value: finding.sample,
        logEntry: {
          timestamp: "2025-10-16T06:02:19.903Z", // From findings.json runMeta
          level: "INFO",
          service: "app.log", // From findings.json file field
          message: `Sample log entry containing ${finding.type}: ${finding.sample}`,
          lineNumber: finding.line,
          raw: `2025-10-16T06:02:19.903Z INFO app.log - Sample log entry containing ${finding.type}: ${finding.sample}`,
        },
        suggestion: finding.action,
      })
    })
  }

  return matches
}

function detectErrorCorrelations(entries: LogEntry[]): Array<{
  trigger: string
  cascades: string[]
  timeWindow: number
}> {
  const correlations: Array<{ trigger: string; cascades: string[]; timeWindow: number }> = []
  const errorEntries = entries.filter((e) => e.level === "ERROR" || e.level === "FATAL")

  // Look for errors that happen within 5 seconds of each other
  for (let i = 0; i < errorEntries.length - 1; i++) {
    const current = errorEntries[i]
    const currentTime = new Date(current.timestamp).getTime()
    const cascades: string[] = []

    for (let j = i + 1; j < errorEntries.length; j++) {
      const next = errorEntries[j]
      const nextTime = new Date(next.timestamp).getTime()
      const timeDiff = nextTime - currentTime

      // If within 5 seconds, consider it a potential cascade
      if (timeDiff <= 5000) {
        cascades.push(`${next.service}: ${extractErrorType(next.message)}`)
      } else {
        break // Stop looking once we're past the time window
      }
    }

    if (cascades.length > 0) {
      correlations.push({
        trigger: `${current.service}: ${extractErrorType(current.message)}`,
        cascades,
        timeWindow: 5,
      })
    }
  }

  return correlations
}

function calculateServiceQuality(entries: LogEntry[]): ServiceQuality[] {
  const serviceMap = new Map<string, ServiceQuality>()

  entries.forEach((entry) => {
    if (!serviceMap.has(entry.service)) {
      serviceMap.set(entry.service, {
        service: entry.service,
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        debugCount: 0,
        score: 0,
        issues: [],
      })
    }

    const quality = serviceMap.get(entry.service)!
    quality.totalLogs++

    switch (entry.level) {
      case "ERROR":
      case "FATAL":
        quality.errorCount++
        break
      case "WARN":
        quality.warningCount++
        break
      case "INFO":
        quality.infoCount++
        break
      case "DEBUG":
        quality.debugCount++
        break
    }
  })

  // Calculate scores and identify issues
  serviceMap.forEach((quality) => {
    const errorRate = quality.errorCount / quality.totalLogs
    const debugRate = quality.debugCount / quality.totalLogs
    const infoRate = quality.infoCount / quality.totalLogs

    // Score based on logging quality (0-100)
    let score = 100

    // Penalize high error rates
    if (errorRate > 0.3) {
      score -= 40
      quality.issues.push("High error rate")
    } else if (errorRate > 0.1) {
      score -= 20
      quality.issues.push("Elevated error rate")
    }

    // Penalize lack of debug logs
    if (debugRate < 0.1) {
      score -= 20
      quality.issues.push("Insufficient debug logging")
    }

    // Penalize lack of info logs
    if (infoRate < 0.2) {
      score -= 10
      quality.issues.push("Low info logging coverage")
    }

    quality.score = Math.max(0, score)
  })

  return Array.from(serviceMap.values()).sort((a, b) => a.score - b.score)
}

function calculateSummary(entries: LogEntry[]) {
  const errorCount = entries.filter((e) => e.level === "ERROR").length
  const warningCount = entries.filter((e) => e.level === "WARN").length
  const fatalCount = entries.filter((e) => e.level === "FATAL").length

  const timestamps = entries.map((e) => e.timestamp).sort()
  const timeRange = {
    start: timestamps[0] || "",
    end: timestamps[timestamps.length - 1] || "",
  }

  // Calculate overall score
  const errorRate = errorCount / entries.length
  const fatalRate = fatalCount / entries.length
  let overallScore = 100

  if (fatalRate > 0) overallScore -= 50
  if (errorRate > 0.2) overallScore -= 30
  else if (errorRate > 0.1) overallScore -= 15

  return {
    totalLogs: entries.length,
    errorCount,
    warningCount,
    fatalCount,
    timeRange,
    overallScore: Math.max(0, overallScore),
  }
}
