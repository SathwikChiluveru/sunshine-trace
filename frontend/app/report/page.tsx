"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { SummarySection } from "@/components/sections/summary-section"
import { AiSummarySection } from "@/components/sections/ai-summary-section"
import { LoggingQualitySection } from "@/components/sections/logging-quality-section"
import { ErrorFlowSection } from "@/components/sections/error-flow-section"
import { SensitiveDataSection } from "@/components/sections/sensitive-data-section"
import { AISensitiveDataSection } from "@/components/sections/ai-sensitive-data-section"
import { AIVulnerabilitySection } from "@/components/sections/ai-vulnerability-section"
import { RecurringBugsSection } from "@/components/sections/recurring-bugs-section"
import { CodeImprovementsSection } from "@/components/sections/code-improvements-section"
import { RecommendationsSection } from "@/components/sections/recommendations-section"
import type { ParsedLogData } from "@/lib/types"

export default function DebugReport() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
  console.log("[Report] API_BASE:", API_BASE)
  const [activeSection, setActiveSection] = useState("summary")
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[] | null>(null)
  const [logData, setLogData] = useState<ParsedLogData | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [findingsData, setFindingsData] = useState<any>(null)
  const [riskHeatmapData, setRiskHeatmapData] = useState<any>(null)
  const [recurringProblems, setRecurringProblems] = useState<any>(null)
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any>(null)
  const [aiZipResults, setAiZipResults] = useState<any>(null)
  const [hasDynamicSummary, setHasDynamicSummary] = useState(false)
  const [hasDynamicFindings, setHasDynamicFindings] = useState(false)
  const [hasLocalParsed, setHasLocalParsed] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false
      return !!localStorage.getItem('debugReportData')
    } catch { return false }
  })
  const summaryReqId = useRef(0)
  const findingsReqId = useRef(0)

  // Safely extract a JSON object from an AI response that may contain markdown
  function extractJsonBlock(text: string): any | null {
    try {
      if (!text || typeof text !== 'string') return null
      console.log(`[Report] extractJsonBlock input length: ${text.length}`)
      console.log(`[Report] extractJsonBlock input preview: ${text.substring(0, 200)}...`)
      
      // Prefer ```json fenced blocks
      const fenceJson = text.match(/```json\s*([\s\S]*?)\s*```/i)
      if (fenceJson?.[1]) {
        console.log(`[Report] Found JSON fence, parsing...`)
        return JSON.parse(fenceJson[1])
      }
      // Accept generic fenced blocks
      const fenceAny = text.match(/```\s*([\s\S]*?)\s*```/)
      if (fenceAny?.[1]) {
        console.log(`[Report] Found generic fence, parsing...`)
        return JSON.parse(fenceAny[1])
      }
      
      // Look for JSON array pattern in the text
      const jsonArrayMatch = text.match(/\[[\s\S]*?\]/)
      if (jsonArrayMatch) {
        console.log(`[Report] Found JSON array pattern, parsing...`)
        return JSON.parse(jsonArrayMatch[0])
      }
      
      // Look for JSON object pattern in the text
      const jsonObjectMatch = text.match(/\{[\s\S]*?\}/)
      if (jsonObjectMatch) {
        console.log(`[Report] Found JSON object pattern, parsing...`)
        return JSON.parse(jsonObjectMatch[0])
      }
      
      // Last resort: attempt to parse the whole string
      console.log(`[Report] Trying to parse entire string as JSON...`)
      return JSON.parse(text)
    } catch (error) {
      console.log(`[Report] extractJsonBlock failed:`, error)
      return null
    }
  }
  useEffect(() => {
    // Load selected analysis types from localStorage to control rendering and fetching
    try {
      const sel = localStorage.getItem("selectedAnalysisTypes")
      if (sel) setSelectedAnalysisTypes(JSON.parse(sel))
    } catch {}

    // Try to load parsed log data from localStorage
    const storedData = localStorage.getItem("debugReportData")
    console.log("[Report] localStorage.debugReportData bytes:", storedData ? storedData.length : 0)
    if (storedData) {
      setHasLocalParsed(true)
      try {
        const parsed = JSON.parse(storedData)
        setLogData(parsed)
        console.log("[Report] Parsed logData entries:", parsed?.entries?.length || 0)
        // Build a dynamic summary from the pasted logs to avoid static fallback
        if (parsed?.summary) {
          const s = parsed.summary
          
          // Calculate system health indicators
          const totalLogs = s.totalLogs || 0
          const errorRate = totalLogs > 0 ? (s.errorCount + s.fatalCount) / totalLogs : 0
          const criticalIssues = s.fatalCount > 0
          const highErrorRate = errorRate > 0.1 // 10% error rate threshold
          
          // Assess logging quality from serviceQuality
          const avgLoggingScore = Array.isArray(parsed?.serviceQuality) && parsed.serviceQuality.length > 0
            ? parsed.serviceQuality.reduce((sum: number, sq: any) => sum + (sq.score || 0), 0) / parsed.serviceQuality.length
            : 0
          const poorLogging = avgLoggingScore < 50
          
          // Assess security concerns
          const hasPii = Array.isArray(parsed?.sensitiveData) && parsed.sensitiveData.length > 0
          const hasErrorFlows = Array.isArray(parsed?.errorCorrelations) && parsed.errorCorrelations.length > 0
          
          // Generate meaningful executive summary
          let healthStatus = "HEALTHY"
          if (criticalIssues) healthStatus = "CRITICAL"
          else if (highErrorRate || poorLogging) healthStatus = "DEGRADED"
          else if (hasPii || hasErrorFlows) healthStatus = "NEEDS_ATTENTION"
          
          setSummaryData({
            executive_summary: `System Status: ${healthStatus}. ${criticalIssues ? 'CRITICAL: System crashes detected.' : ''} ${highErrorRate ? `High error rate (${Math.round(errorRate*100)}%).` : ''} ${poorLogging ? 'Poor logging practices detected.' : ''} ${hasPii ? 'Sensitive data exposure found.' : ''} ${hasErrorFlows ? 'Error cascade patterns identified.' : ''} ${totalLogs > 0 ? `Analyzed ${totalLogs} log entries.` : 'No log data available.'}`,
            top_risks: [
              ...(criticalIssues ? [{ risk: "System Crashes", severity: "CRITICAL", description: `${s.fatalCount} fatal errors detected` }] : []),
              ...(highErrorRate ? [{ risk: "High Error Rate", severity: "HIGH", description: `${Math.round(errorRate*100)}% of logs are errors` }] : []),
              ...(poorLogging ? [{ risk: "Poor Logging Quality", severity: "MEDIUM", description: `Average logging score: ${Math.round(avgLoggingScore)}/100` }] : []),
              ...(hasPii ? [{ risk: "Data Privacy", severity: "HIGH", description: `${parsed.sensitiveData.length} sensitive data instances found` }] : []),
              ...(hasErrorFlows ? [{ risk: "Error Cascades", severity: "MEDIUM", description: `${parsed.errorCorrelations.length} error flow patterns detected` }] : [])
            ],
            recommended_actions: [
              ...(criticalIssues ? ["Immediately investigate and fix fatal errors", "Implement circuit breakers to prevent cascading failures"] : []),
              ...(highErrorRate ? ["Review error handling patterns", "Add monitoring and alerting for error spikes"] : []),
              ...(poorLogging ? ["Implement structured logging with correlation IDs", "Add error codes and context to log messages"] : []),
              ...(hasPii ? ["Mask or remove sensitive data from logs", "Implement data classification and handling policies"] : []),
              ...(hasErrorFlows ? ["Review error handling chains", "Add proper error boundaries and recovery mechanisms"] : []),
              ...(totalLogs === 0 ? ["Add comprehensive logging to monitor system health"] : [])
            ],
          })
          setHasDynamicSummary(true)
          console.log("[Report] Using dynamic summary from pasted logs")
        }

        // Build dynamic findings (logging quality, error flows, sensitive data) from parsed logs
        try {
          const loggingScores = Array.isArray(parsed?.serviceQuality)
            ? parsed.serviceQuality.map((sq: any) => ({
                module: sq.service,
                score: sq.score,
                gaps: [],
              }))
            : []

          const piiFindings = Array.isArray(parsed?.sensitiveData)
            ? parsed.sensitiveData.map((m: any) => ({
                type: m.type,
                file: m.logEntry?.service || 'logs',
                line: m.logEntry?.lineNumber || 0,
                sample: m.value,
                action: m.suggestion || 'mask',
              }))
            : []

          const errorFlows = Array.isArray(parsed?.errorCorrelations)
            ? parsed.errorCorrelations.map((c: any) => ({
                path: [c.trigger, ...(c.cascades || [])],
                stackTop: c.trigger,
              }))
            : []

          const riskHeatmap = loggingScores.map((m: any) => ({
            module: m.module,
            risk: Math.max(0, 100 - (m.score || 0)),
          }))

          const dynamicFindings = { loggingScores, piiFindings, errorFlows, riskHeatmap }
          setFindingsData(dynamicFindings)
          setRiskHeatmapData(riskHeatmap.map((module: any) => ({
            name: module.module.split("\\").pop() || module.module,
            score: module.risk,
          })))
          setHasDynamicFindings(true)
          console.log("[Report] Built dynamic findings:", {
            loggingScores: loggingScores.length,
            piiFindings: piiFindings.length,
            errorFlows: errorFlows.length,
            riskHeatmap: riskHeatmap.length,
          })
        } catch (e) {
          console.warn('Failed to build dynamic findings from parsed logs:', e)
        }
      } catch (error) {
        console.error("Error parsing stored log data:", error)
      }
    }

    // Try to load AI analysis results from localStorage
    const aiData = localStorage.getItem("aiAnalysisResults")
    if (aiData) {
      try {
        const parsed = JSON.parse(aiData)
        setAiAnalysisResults(parsed)
        
        // Process AI analysis results for individual file uploads
        if (parsed?.results && Array.isArray(parsed.results)) {
          console.log("[Report] Processing AI analysis results from individual files:", parsed.results.length, "files")
          
          // Extract logging quality scores from code quality analysis
          const loggingScores: any[] = []
          const piiFindings: any[] = []
          const errorFlows: any[] = []
          const aiRecommendations: string[] = []
          const codeFixes: Array<{title: string, code: string, description: string}> = []
          
          for (const result of parsed.results) {
            // Process vulnerability analysis results for AI recommendations
            if (result.vulnerabilities && !result.vulnerabilities.error) {
              try {
                const vulnerabilityData = typeof result.vulnerabilities === 'string'
                  ? extractJsonBlock(result.vulnerabilities)
                  : result.vulnerabilities
                
                console.log(`[Report] Processing vulnerabilities for ${result.fileName}:`, {
                  hasVulnerabilityData: !!vulnerabilityData,
                  vulnerabilityDataKeys: vulnerabilityData ? Object.keys(vulnerabilityData) : [],
                  vulnerabilities: vulnerabilityData?.vulnerabilities?.length || 0,
                  fullVulnerabilityData: vulnerabilityData
                })
                
                // Extract AI-generated recommendations from vulnerability analysis
                if (vulnerabilityData?.vulnerabilities && Array.isArray(vulnerabilityData.vulnerabilities)) {
                  vulnerabilityData.vulnerabilities.forEach((vuln: any) => {
                    if (vuln.fix && typeof vuln.fix === 'string') {
                      aiRecommendations.push(vuln.fix)
                    }
                  })
                }
                
                // Also extract summary recommendations if available
                if (vulnerabilityData?.summary && typeof vulnerabilityData.summary === 'string') {
                  // Extract actionable recommendations from summary
                  const summaryLines = vulnerabilityData.summary.split('\n').filter((line: string) => 
                    line.trim().length > 0 && 
                    (line.includes('recommend') || line.includes('suggest') || line.includes('should') || line.includes('implement'))
                  )
                  summaryLines.forEach((line: string) => {
                    if (line.trim().length > 10) { // Only add substantial recommendations
                      aiRecommendations.push(line.trim())
                    }
                  })
                }
                
                // If no structured data found, try to extract from the raw response text
                if (aiRecommendations.length === 0 && result.vulnerabilities && typeof result.vulnerabilities === 'string') {
                  console.log(`[Report] No structured recommendations found, extracting from raw text for ${result.fileName}`)
                  const rawText = result.vulnerabilities
                  
                  // Debug: Show what code blocks we found
                  const allBlocks = rawText.match(/```[\s\S]*?```/g)
                  console.log(`[Report] Found ${allBlocks?.length || 0} code blocks in AI response`)
                  if (allBlocks) {
                    allBlocks.forEach((block: string, index: number) => {
                      const preview = block.substring(0, 100).replace(/\n/g, ' ')
                      console.log(`[Report] Code block ${index + 1}: ${preview}...`)
                    })
                  }
                  
                  // Look for "Fix:" patterns in the text
                  const fixMatches = rawText.match(/- \*\*Fix:\*\* ([^\n]+)/g)
                  if (fixMatches) {
                    fixMatches.forEach((match: string) => {
                      const fix = match.replace(/- \*\*Fix:\*\* /, '').trim()
                      if (fix.length > 10) {
                        aiRecommendations.push(fix)
                      }
                    })
                  }
                  
                  // Extract JavaScript code blocks specifically (not JSON)
                  const jsCodeBlocks = rawText.match(/```javascript[\s\S]*?```/gi)
                  if (jsCodeBlocks) {
                    jsCodeBlocks.forEach((block: string) => {
                      const cleanCode = block.replace(/```javascript\n?/i, '').replace(/```$/, '').trim()
                      
                      if (cleanCode.length > 20 && !cleanCode.startsWith('{')) { // Skip JSON blocks
                        let title = ''
                        let description = ''
                        
                        if (cleanCode.includes('bcrypt') && cleanCode.includes('compare')) {
                          title = 'Secure Password Authentication with bcrypt'
                          description = 'Replace your current authentication logic with this secure bcrypt implementation'
                        } else if (cleanCode.includes('validate') && cleanCode.includes('username')) {
                          title = 'Input Validation Function'
                          description = 'Add this validation function to check username and password inputs'
                        } else if (cleanCode.includes('hash') && cleanCode.includes('username')) {
                          title = 'Secure Logging with Hashed Usernames'
                          description = 'Update your logging functions to hash sensitive data before logging'
                        } else if (cleanCode.includes('timestamp') && cleanCode.includes('ISO')) {
                          title = 'Enhanced Logging with Timestamps'
                          description = 'Improve your logging functions with proper timestamps and structure'
                        } else if (cleanCode.includes('function') || cleanCode.includes('const') || cleanCode.includes('async')) {
                          title = 'Code Fix Implementation'
                          description = 'Apply this code to fix the identified security issue'
                        } else {
                          title = 'Code Fix'
                          description = 'Apply this code fix to resolve the identified issue'
                        }
                        
                        codeFixes.push({
                          title,
                          code: cleanCode,
                          description
                        })
                        
                        // Also add a text recommendation
                        aiRecommendations.push(`${title}: ${description}`)
                      }
                    })
                  }
                  
                  // If no JavaScript blocks found, look for any code blocks that aren't JSON
                  if (codeFixes.length === 0) {
                    const allCodeBlocks = rawText.match(/```[\s\S]*?```/g)
                    if (allCodeBlocks) {
                      allCodeBlocks.forEach((block: string) => {
                        const cleanCode = block.replace(/```\w*\n?/, '').replace(/```$/, '').trim()
                        
                        // Skip JSON blocks and only process actual code
                        if (cleanCode.length > 20 && 
                            !cleanCode.startsWith('{') && 
                            !cleanCode.startsWith('[') &&
                            (cleanCode.includes('function') || cleanCode.includes('const') || cleanCode.includes('async') || cleanCode.includes('require'))) {
                          
                          let title = ''
                          let description = ''
                          
                          if (cleanCode.includes('bcrypt')) {
                            title = 'Secure Password Authentication with bcrypt'
                            description = 'Replace your current authentication logic with this secure bcrypt implementation'
                          } else if (cleanCode.includes('validate')) {
                            title = 'Input Validation Function'
                            description = 'Add this validation function to check username and password inputs'
                          } else if (cleanCode.includes('hash') || cleanCode.includes('anonymize')) {
                            title = 'Secure Logging with Hashed Usernames'
                            description = 'Update your logging functions to hash sensitive data before logging'
                          } else if (cleanCode.includes('timestamp')) {
                            title = 'Enhanced Logging with Timestamps'
                            description = 'Improve your logging functions with proper timestamps and structure'
                          } else {
                            title = 'Code Fix Implementation'
                            description = 'Apply this code to fix the identified security issue'
                          }
                          
                          codeFixes.push({
                            title,
                            code: cleanCode,
                            description
                          })
                          
                          aiRecommendations.push(`${title}: ${description}`)
                        }
                      })
                    }
                  }
                  
                  // Look for specific recommendation patterns
                  const recommendationPatterns = [
                    /Use `bcrypt` to hash passwords during registration and compare them securely during authentication/gi,
                    /Implement input validation to ensure `username` and `password` meet expected formats/gi,
                    /Hash or anonymize sensitive fields like `username` before logging/gi,
                    /Remove sensitive error codes from log messages or use a more generic error message in production/gi
                  ]
                  
                  recommendationPatterns.forEach((pattern) => {
                    const matches = rawText.match(pattern)
                    if (matches) {
                      matches.forEach((match: string) => {
                        if (!aiRecommendations.includes(match)) {
                          aiRecommendations.push(match)
                        }
                      })
                    }
                  })
                }
              } catch (parseError) {
                console.warn(`[Report] Failed to parse vulnerabilities for ${result.fileName}:`, parseError)
              }
            }

            // Process code quality results for logging scores
            if (result.codeQuality && !result.codeQuality.error) {
              try {
                const qualityData = typeof result.codeQuality === 'string' 
                  ? extractJsonBlock(result.codeQuality) 
                  : result.codeQuality
                
                console.log(`[Report] Processing code quality for ${result.fileName}:`, {
                  hasQualityData: !!qualityData,
                  qualityDataKeys: qualityData ? Object.keys(qualityData) : [],
                  metrics: qualityData?.metrics,
                  qualityScore: qualityData?.quality_score,
                  fullQualityData: qualityData
                })
                
                // Extract logging score from code quality analysis
                let loggingScore = 0
                let gaps = []
                
                if (qualityData?.metrics?.logging) {
                  loggingScore = qualityData.metrics.logging
                  console.log(`[Report] Found logging score in metrics: ${loggingScore}`)
                } else if (qualityData?.quality_score) {
                  // Use overall quality score as fallback
                  loggingScore = qualityData.quality_score
                  console.log(`[Report] Using overall quality score as fallback: ${loggingScore}`)
                } else if (qualityData?.issues) {
                  // Calculate score based on logging-related issues
                  const loggingIssues = qualityData.issues.filter((issue: any) => 
                    issue.description?.toLowerCase().includes('log') ||
                    issue.type?.toLowerCase().includes('log')
                  )
                  loggingScore = Math.max(0, 100 - (loggingIssues.length * 20))
                  gaps = loggingIssues.map((issue: any) => issue.description)
                  console.log(`[Report] Calculated logging score from issues: ${loggingScore}`)
                }
                
                if (loggingScore > 0) {
                  loggingScores.push({
                    module: result.fileName,
                    score: loggingScore,
                    gaps: gaps
                  })
                  console.log(`[Report] Added logging score for ${result.fileName}: ${loggingScore}`)
                } else {
                  console.log(`[Report] No logging score found for ${result.fileName}`)
                }
              } catch (parseError) {
                console.warn(`[Report] Failed to parse code quality for ${result.fileName}:`, parseError)
              }
            }
            
            // Process sensitive data results
            if (result.sensitiveData && !result.sensitiveData.error) {
              try {
                const sensitiveData = typeof result.sensitiveData === 'string'
                  ? extractJsonBlock(result.sensitiveData)
                  : result.sensitiveData
                
                if (sensitiveData.detections && Array.isArray(sensitiveData.detections)) {
                  sensitiveData.detections.forEach((detection: any) => {
                    piiFindings.push({
                      type: detection.type || 'UNKNOWN',
                      file: result.fileName,
                      line: 0,
                      sample: detection.value || 'detected',
                      action: detection.suggestion || 'mask/hash',
                      confidence: detection.confidence || 0.8
                    })
                    
                    // Extract AI suggestions as recommendations
                    if (detection.suggestion && typeof detection.suggestion === 'string') {
                      aiRecommendations.push(detection.suggestion)
                    }
                  })
                }
                
                // Also extract recommendations from sensitive data summary
                if (sensitiveData.summary && typeof sensitiveData.summary === 'string') {
                  const summaryLines = sensitiveData.summary.split('\n').filter((line: string) => 
                    line.trim().length > 0 && 
                    (line.includes('recommend') || line.includes('suggest') || line.includes('should') || line.includes('implement') || line.includes('mask') || line.includes('hash'))
                  )
                  summaryLines.forEach((line: string) => {
                    if (line.trim().length > 10) {
                      aiRecommendations.push(line.trim())
                    }
                  })
                }
              } catch (parseError) {
                console.warn(`[Report] Failed to parse sensitive data for ${result.fileName}:`, parseError)
              }
            }

            // Process error flow results collected by backend batch heuristics
            if (Array.isArray(result.errorFlows) && result.errorFlows.length > 0) {
              try {
                result.errorFlows.forEach((flow: any) => {
                  errorFlows.push({
                    path: Array.isArray(flow.path) ? flow.path : [],
                    stackTop: flow.stackTop || (Array.isArray(flow.path) && flow.path.length > 0 ? flow.path[flow.path.length - 1] : 'Unknown')
                  })
                })
              } catch (efParse) {
                console.warn(`[Report] Failed to process error flows for ${result.fileName}:`, efParse)
              }
            }
          }
          
          // Build risk heatmap from logging scores
          const riskHeatmap = loggingScores.map(score => ({
            module: score.module,
            risk: Math.max(0, 100 - score.score)
          }))
          
          // Set the findings data
          const findingsData = {
            loggingScores,
            piiFindings,
            errorFlows,
            riskHeatmap
          }
          
          setFindingsData(findingsData)
          setRiskHeatmapData(riskHeatmap.map((module: any) => ({
            name: module.module.split("\\").pop() || module.module,
            score: module.risk,
          })))
          setHasDynamicFindings(true)
          
          console.log("[Report] Built findings from AI analysis results:", {
            loggingScores: loggingScores.length,
            piiFindings: piiFindings.length,
            errorFlows: errorFlows.length,
            riskHeatmap: riskHeatmap.length
          })
          
          // Generate dynamic summary from AI results
          if (loggingScores.length > 0 || piiFindings.length > 0 || aiRecommendations.length > 0) {
            const avgLoggingScore = loggingScores.length > 0 
              ? loggingScores.reduce((sum, score) => sum + score.score, 0) / loggingScores.length 
              : 0
            
            const poorLogging = avgLoggingScore < 50
            const hasPii = piiFindings.length > 0
            const hasAiRecommendations = aiRecommendations.length > 0
            
            let healthStatus = "HEALTHY"
            if (poorLogging) healthStatus = "NEEDS_ATTENTION"
            if (hasPii) healthStatus = "NEEDS_ATTENTION"
            if (hasAiRecommendations) healthStatus = "NEEDS_ATTENTION"
            
            // Combine AI-generated recommendations with basic recommendations
            const combinedRecommendations = [
              ...aiRecommendations, // AI-generated recommendations from vulnerability analysis
              ...(poorLogging ? ["Implement structured logging with correlation IDs", "Add error codes and context to log messages"] : []),
              ...(hasPii ? ["Mask or remove sensitive data from logs", "Implement data classification and handling policies"] : [])
            ]
            
            // Remove duplicates and limit to reasonable number
            const uniqueRecommendations = [...new Set(combinedRecommendations)].slice(0, 10)
            
            const aiSummary = {
              executive_summary: `AI Analysis Complete. System Status: ${healthStatus}. ${poorLogging ? `Poor logging practices detected (avg score: ${Math.round(avgLoggingScore)}/100).` : ''} ${hasPii ? `${piiFindings.length} sensitive data instances found.` : ''} ${hasAiRecommendations ? `${aiRecommendations.length} AI-generated recommendations available.` : ''} ${codeFixes.length > 0 ? `${codeFixes.length} copy-paste ready code fixes available.` : ''} Analyzed ${parsed.results.length} file(s).`,
              top_risks: [
                ...(poorLogging ? [{ risk: "Poor Logging Quality", severity: "MEDIUM", description: `Average logging score: ${Math.round(avgLoggingScore)}/100` }] : []),
                ...(hasPii ? [{ risk: "Data Privacy", severity: "HIGH", description: `${piiFindings.length} sensitive data instances found` }] : []),
                ...(hasAiRecommendations ? [{ risk: "Security Vulnerabilities", severity: "HIGH", description: `${aiRecommendations.length} AI-identified issues require attention` }] : [])
              ],
              recommended_actions: uniqueRecommendations,
              code_fixes: codeFixes
            }
            
            setSummaryData(aiSummary)
            setHasDynamicSummary(true)
            console.log("[Report] Generated AI-based summary from individual file analysis with", aiRecommendations.length, "AI recommendations")
            console.log("[Report] AI Recommendations:", aiRecommendations)
            console.log("[Report] Code Fixes Found:", codeFixes.length)
            console.log("[Report] Code Fixes:", codeFixes)
            console.log("[Report] Final combined recommendations:", uniqueRecommendations)
          }
        }
      } catch (error) {
        console.error("Error parsing AI analysis results:", error)
      }
    }

    // Try to load AI zip results
    const zipData = localStorage.getItem("aiZipResults")
    if (zipData) {
      try {
        const parsed = JSON.parse(zipData)
        console.log("[Report] Loaded AI zip results from localStorage:", {
          riskHeatmap: parsed.riskHeatmap?.length || 0,
          loggingScores: parsed.loggingScores?.length || 0,
          piiFindings: parsed.piiFindings?.length || 0,
          errorFlows: parsed.errorFlows?.length || 0,
          summary: parsed.summary ? 'present' : 'missing'
        });
        
        // Extract log statistics from AI zip results if available
        if (parsed.logStatistics) {
          console.log("[Report] Found log statistics in AI zip results:", parsed.logStatistics);
          // Store log statistics in the summary object for compatibility
          if (parsed.summary && typeof parsed.summary === 'object') {
            parsed.summary.logStatistics = parsed.logStatistics;
          }
        } else if (parsed.summary && typeof parsed.summary === 'object') {
          const summary = parsed.summary;
          if (summary.executive_summary) {
            // Fallback: Extract log statistics from executive summary text
            const summaryText = summary.executive_summary;
            const totalLogsMatch = summaryText.match(/(\d+)\s+log\s+entries?/i);
            const errorMatch = summaryText.match(/(\d+)\s+errors?/i);
            const warningMatch = summaryText.match(/(\d+)\s+warnings?/i);
            const fatalMatch = summaryText.match(/(\d+)\s+fatals?/i);
            
            if (totalLogsMatch || errorMatch || warningMatch || fatalMatch) {
              const logStats = {
                totalLogs: totalLogsMatch ? parseInt(totalLogsMatch[1]) : 0,
                errorCount: errorMatch ? parseInt(errorMatch[1]) : 0,
                warningCount: warningMatch ? parseInt(warningMatch[1]) : 0,
                fatalCount: fatalMatch ? parseInt(fatalMatch[1]) : 0
              };
              console.log("[Report] Extracted log statistics from AI zip summary text:", logStats);
              // Store log statistics in the summary object
              parsed.summary.logStatistics = logStats;
            }
          }
        }
        
        setAiZipResults(parsed)
      } catch (error) {
        console.error("Error parsing AI zip results:", error)
      }
    }
  }, [])

  useEffect(() => {
    // If we already have any summary, do not fetch
    if (summaryData) {
      console.log("[Report] Skipping remote summary fetch; summaryData already set")
      return
    }
    // Summary is always allowed; heatmap/summary are always shown regardless of selection
    if (aiZipResults?.summary) {
      setSummaryData(aiZipResults.summary)
      setHasDynamicSummary(true)
      console.log("[Report] Using AI zip summary")
      return
    }
    if (hasLocalParsed) {
      console.log("[Report] Skipping remote summary fetch; local parsed is present")
      return
    }
    if (hasDynamicSummary) {
      console.log("[Report] Skipping remote summary fetch; dynamic already set")
      return
    }
    const localId = ++summaryReqId.current
    const ctrl = new AbortController()
    fetch(`${API_BASE}/api/summary`, { signal: ctrl.signal })
      .then((response) => response.json())
      .then((data) => {
        if (localId !== summaryReqId.current) return
        if (!hasDynamicSummary && !summaryData) setSummaryData(data)
        console.log("[Report] Fetched remote summary (fallback)")
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error("Error fetching summary data:", error)
      })
    return () => ctrl.abort()
  }, [summaryData, aiZipResults, API_BASE, hasDynamicSummary, hasLocalParsed])

  useEffect(() => {
    // Prefer dynamic riskHeatmap from AI zip results if available
    if (aiZipResults?.riskHeatmap) {
      console.log("[Report] Processing AI zip results:", {
        riskHeatmap: aiZipResults.riskHeatmap?.length || 0,
        loggingScores: aiZipResults.loggingScores?.length || 0,
        piiFindings: aiZipResults.piiFindings?.length || 0,
        errorFlows: aiZipResults.errorFlows?.length || 0
      });
      
      // Gate findings payload by selected types; riskHeatmap always included
      const allowLogging = !selectedAnalysisTypes || selectedAnalysisTypes.includes('logging-quality')
      const allowErrors = !selectedAnalysisTypes || selectedAnalysisTypes.includes('error-flow')
      const allowSensitive = !selectedAnalysisTypes || selectedAnalysisTypes.includes('sensitive-data')
      const data = {
        loggingScores: allowLogging ? (aiZipResults.loggingScores || []) : [],
        piiFindings: allowSensitive ? (aiZipResults.piiFindings || []) : [],
        errorFlows: allowErrors ? (aiZipResults.errorFlows || []) : [],
        riskHeatmap: aiZipResults.riskHeatmap,
      }
      setFindingsData(data)
      const heatmapData = aiZipResults.riskHeatmap.map((module: any) => ({
        name: module.module.split("\\").pop() || module.module, // Extract module name
        score: module.risk, // Risk score
      }))
      setRiskHeatmapData(heatmapData) // Set this data for heatmap
      setHasDynamicFindings(true)
      console.log("[Report] Using AI zip findings (heatmap)")
      return
    }
    if (hasLocalParsed) {
      console.log("[Report] Skipping remote findings fetch; local parsed is present")
      return
    }
    // If no dynamic results, fetch the static findings
    if (hasDynamicFindings) {
      console.log("[Report] Skipping remote findings fetch; dynamic already set")
      return
    }
    const localId = ++findingsReqId.current
    const ctrl = new AbortController()
    fetch(`${API_BASE}/api/findings`, { signal: ctrl.signal })
      .then((response) => response.json())
      .then((data) => {
        if (localId !== findingsReqId.current) return
        if (hasDynamicFindings) return
        // Gate server-provided findings by selection; heatmap always processed
        const allowLogging = !selectedAnalysisTypes || selectedAnalysisTypes.includes('logging-quality')
        const allowErrors = !selectedAnalysisTypes || selectedAnalysisTypes.includes('error-flow')
        const allowSensitive = !selectedAnalysisTypes || selectedAnalysisTypes.includes('sensitive-data')
        const gated = {
          loggingScores: allowLogging ? (data.loggingScores || []) : [],
          piiFindings: allowSensitive ? (data.piiFindings || []) : [],
          errorFlows: allowErrors ? (data.errorFlows || []) : [],
          riskHeatmap: data.riskHeatmap || [],
        }
        setFindingsData(gated)
        setRecurringProblems(data.recurringProblems)
        const heatmapData = data.riskHeatmap.map((module: any) => ({
          name: module.module.split("\\").pop() || module.module, // Extract module name
          score: module.risk, // Risk score
        }))
        if (!hasDynamicFindings) setRiskHeatmapData(heatmapData)
        console.log("[Report] Fetched remote findings (fallback)")
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error("Error fetching findings data:", error)
      })
    return () => ctrl.abort()
  }, [aiZipResults, API_BASE, hasDynamicFindings, hasLocalParsed, selectedAnalysisTypes])

  return (
    <div className="min-h-screen bg-background">
      <Header overallScore={logData?.summary.overallScore} logData={logData} />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection}/>
        <main className="flex-1 ml-64 pt-20 px-8 pb-16">
          <div className="max-w-7xl mx-auto space-y-12">
            <section id="summary">
            {summaryData && (
                <SummarySection
                  data={logData}
                  executiveSummary={summaryData.executive_summary}
                  riskHeatmapData={riskHeatmapData}
                  summaryData={summaryData}
                />
              )}
            </section>
            {/* <section id="ai-summary">
              <AiSummarySection data={logData} />
            </section> */}
            {/* Conditionally render sections based on selection; if null (no selection saved), show all */}
            <section id="logging-quality">
              {findingsData && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('logging-quality')) && (
                <LoggingQualitySection data={findingsData} />
              )}
            </section>
            <section id="error-flows">
              {findingsData && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('error-flow')) && (
                <ErrorFlowSection data={findingsData} />
              )}
            </section>
            <section id="sensitive-data">
              {findingsData && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('sensitive-data')) && (
                <SensitiveDataSection data={findingsData} />
              )}
            </section>
            <section id="ai-sensitive-data">
              {aiAnalysisResults && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('sensitive-data')) && (
                <AISensitiveDataSection data={aiAnalysisResults} />
              )}
            </section>
            <section id="ai-vulnerabilities">
              {aiAnalysisResults && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('recommendations')) && (
                <AIVulnerabilitySection data={aiAnalysisResults} />
              )}
            </section>
            {/* <section id="recurring-bugs">
              <RecurringBugsSection data={logData} />
            </section> */}
            {/* <section id="code-improvements">
            {findingsData && <CodeImprovementsSection data={recurringProblems} />}
            </section> */}
            <section id="recommendations">
             {summaryData && (!selectedAnalysisTypes || selectedAnalysisTypes.includes('recommendations')) && (
               <RecommendationsSection data={summaryData} />
             )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
