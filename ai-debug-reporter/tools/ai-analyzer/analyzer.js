#!/usr/bin/env node
// Enhanced AI analyzer for comprehensive code and log analysis
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Provider selection: prefer OpenRouter if key present, else a configured local model
const OR_ENABLED   = !!process.env.OPENROUTER_API_KEY;
const OR_BASE      = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
const OR_MODEL     = process.env.OPENROUTER_MODEL     || 'qwen/qwen3-30b-a3b-instruct-2507';
const OR_SITE_URL  = process.env.OPENROUTER_SITE_URL  || 'http://localhost:3000';
const OR_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'Sunshine Trace';

const LOCAL_BASE  = process.env.AI_API_BASE || 'http://localhost:11435/v1';
const LOCAL_MODEL = process.env.AI_MODEL    || 'Qwen/Qwen3-Coder-30B-A3B-Instruct';
const LOCAL_KEY   = process.env.AI_API_KEY  || 'local';

const PROVIDER     = OR_ENABLED ? 'openrouter' : 'local';
const API_BASE     = OR_ENABLED ? OR_BASE : LOCAL_BASE;
const MODEL        = OR_ENABLED ? OR_MODEL : LOCAL_MODEL;
const API_KEY      = OR_ENABLED ? process.env.OPENROUTER_API_KEY : LOCAL_KEY;

async function chat(system, user) {
  const url = `${API_BASE}/chat/completions`;
  const headers = OR_ENABLED
    ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': OR_SITE_URL,
        'X-Title': OR_SITE_NAME,
      }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      };
  
  console.log('[AI] ===== REQUEST START =====');
  console.log('[AI] Provider:', PROVIDER);
  console.log('[AI] URL:', url);
  console.log('[AI] Model:', MODEL);
  console.log('[AI] System Prompt Length:', system.length, 'characters');
  console.log('[AI] User Input Length:', user.length, 'characters');
  console.log('[AI] System Prompt Preview:', system.substring(0, 200) + '...');
  console.log('[AI] User Input Preview:', user.substring(0, 300) + '...');
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  
  if (!res.ok) {
    const t = await res.text();
    console.error('[AI] ===== REQUEST FAILED =====');
    console.error('[AI] Status:', res.status);
    console.error('[AI] Status Text:', res.statusText);
    console.error('[AI] Error Body:', t.slice(0, 500));
    throw new Error(`LLM error ${res.status}: ${res.statusText}`);
  }
  
  const j = await res.json();
  let response = j.choices?.[0]?.message?.content?.trim() || '';
  
  // Clean up response - remove markdown code blocks if present
  if (response.startsWith('```json')) {
    response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (response.startsWith('```')) {
    response = response.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  console.log('[AI] ===== RESPONSE RECEIVED =====');
  console.log('[AI] Response Length:', response.length, 'characters');
  console.log('[AI] Response Preview:', response.substring(0, 500) + '...');
  console.log('[AI] Full Response:', response);
  console.log('[AI] ===== REQUEST END =====');
  
  return response;
}

// 1. AI-Powered Log Analysis (Sensitive Data + Error Patterns)
async function analyzeSensitiveData(logContent) {
  const system = `You are a security expert and log analyst specializing in data privacy and system monitoring.
Analyze content for sensitive data exposure in both log files and code files:

1. SENSITIVE DATA DETECTION:
- Personal Identifiable Information (PII): names, emails, phone numbers, addresses
- Financial data: credit cards, bank accounts, transaction IDs
- Authentication data: passwords, tokens, API keys, session IDs, hardcoded credentials
- Medical data: patient IDs, medical records, health information
- Business data: internal IDs, proprietary information
- Code-specific sensitive data: hardcoded error codes, internal system identifiers, debug information
- Logging exposure: sensitive data being logged, error messages revealing system internals

2. ERROR PATTERN ANALYSIS:
- Count total log entries, errors, warnings, fatal errors
- Identify error flow patterns (WARN -> ERROR -> FATAL sequences)
- Detect error cascades and system failures
- Analyze error correlation and timing
- Code error handling: hardcoded error codes, error message exposure

3. SYSTEM HEALTH ASSESSMENT:
- Calculate error rates and system stability
- Identify critical issues and failure points
- Assess logging quality and completeness
- Code security: hardcoded values, error exposure, logging practices

Consider context - distinguish between real data and placeholders/test data.
For code files, focus on hardcoded values, error codes, and logging practices that could expose sensitive information.
IMPORTANT: Generate valid JSON only. All strings must use double quotes and escape any quotes inside them.

Return JSON with: {
  "detections": [{
    "type": "string", 
    "value": "string", 
    "confidence": "string", 
    "context": "string", 
    "suggestion": "Detailed remediation steps",
    "before_code": "The problematic code/log snippet (properly escaped for JSON)",
    "after_code": "The secure replacement code/logging approach (properly escaped for JSON)"
  }],
  "error_analysis": {
    "total_logs": number,
    "error_count": number,
    "warning_count": number,
    "fatal_count": number,
    "info_count": number,
    "error_rate": number
  },
  "error_flows": [{"trigger": "string", "cascade": "string", "stackTop": "string", "severity": "string"}],
  "summary": "Overall system health and security assessment"
}`
  
  const user = `Analyze this content comprehensively for sensitive data exposure:\n${logContent}`;
  return await chat(system, user);
}

// 2. AI Vulnerability Detection
async function analyzeVulnerabilities(codeContent, fileType) {
  const system = `You are a cybersecurity expert and code auditor.
Analyze code for security vulnerabilities including:
- Injection attacks (SQL, NoSQL, LDAP, OS command)
- Cross-site scripting (XSS)
- Authentication and authorization flaws
- Cryptographic issues
- Input validation problems
- Insecure direct object references
- Security misconfiguration
- Sensitive data exposure
- Components with known vulnerabilities
- Insufficient logging and monitoring

For each vulnerability found, provide:
1. A clear description of the issue
2. The exact location in the code
3. A complete, copy-paste ready code fix that can be directly implemented
4. The severity level

IMPORTANT: Generate valid JSON only. All strings must use double quotes and escape any quotes inside them.
Code examples in before_code and after_code must be properly escaped for JSON.

Return JSON with: {
  "vulnerabilities": [{
    "type": "string", 
    "severity": "string", 
    "description": "string", 
    "location": "string", 
    "fix": "Complete, copy-paste ready code solution with proper imports and implementation",
    "before_code": "The vulnerable code snippet (properly escaped for JSON)",
    "after_code": "The secure replacement code (properly escaped for JSON)"
  }], 
  "risk_score": number, 
  "summary": "string"
}`
  
  const user = `Analyze this ${fileType} code for security vulnerabilities and provide complete, copy-paste ready fixes:\n${codeContent}`;
  return await chat(system, user);
}

// 3. AI Code Quality Analysis
async function analyzeCodeQuality(codeContent, fileType) {
  const system = `You are a senior software engineer and code quality expert.
Evaluate code quality across multiple dimensions:
- Code complexity and maintainability
- Performance implications
- Best practices adherence
- Documentation quality
- Error handling
- Testing coverage
- Design patterns usage
- Code organization and structure
- LOGGING QUALITY: Assess logging practices including structured logging, error codes, correlation IDs, log levels, and observability

IMPORTANT: Generate valid JSON only. All strings must use double quotes and escape any quotes inside them.

Return JSON with: {
  "quality_score": number, 
  "metrics": {
    "complexity": number, 
    "maintainability": number, 
    "performance": number, 
    "documentation": number,
    "logging": number
  }, 
  "issues": [{
    "type": "string", 
    "severity": "string", 
    "description": "string", 
    "suggestion": "Detailed improvement suggestion",
    "before_code": "The problematic code snippet (properly escaped for JSON)",
    "after_code": "The improved code solution (properly escaped for JSON)"
  }], 
  "recommendations": ["Actionable improvement recommendations"]
}`
  
  const user = `Evaluate the quality of this ${fileType} code, paying special attention to logging practices:\n${codeContent}`;
  return await chat(system, user);
}

// 4. AI Risk Assessment
async function analyzeRisk(moduleData) {
  const system = `You are a risk assessment specialist for software systems.
Analyze the risk profile considering:
- Code complexity and maintainability
- Security vulnerabilities
- Error patterns and frequency
- Dependencies and external risks
- Business impact potential
- Compliance requirements
- Operational risks

Return JSON with: {risk_score, factors: [{category, impact, likelihood, description}], mitigation_strategies, priority_level}`
  
  const user = `Assess the risk profile for this module:\n${JSON.stringify(moduleData, null, 2)}`;
  return await chat(system, user);
}

// 5. AI Error Flow Analysis
async function analyzeErrorFlow(errorSequence) {
  const system = `You are a system reliability engineer specializing in error analysis.
Analyze error sequences to understand:
- Root cause identification
- Error propagation patterns
- Cascade effects
- Prevention strategies
- Monitoring recommendations
- Business impact assessment
- Recovery procedures

Return JSON with: {root_cause, flow_pattern, cascade_analysis, prevention_strategies, monitoring_points, business_impact}`
  
  const user = `Analyze this error sequence:\n${JSON.stringify(errorSequence, null, 2)}`;
  return await chat(system, user);
}

// 6. AI Codebase Analysis
async function analyzeCodebase(codebaseData) {
  const system = `You are a software architect and technical lead.
Perform comprehensive codebase analysis including:
- Overall architecture assessment
- Security posture evaluation
- Code quality metrics
- Performance bottlenecks
- Technical debt identification
- Compliance and standards adherence
- Scalability considerations
- Maintenance recommendations

Return JSON with: {architecture_score, security_score, quality_score, technical_debt, recommendations: [{category, priority, description, effort}], compliance_status}`
  
  const user = `Analyze this codebase:\n${JSON.stringify(codebaseData, null, 2)}`;
  return await chat(system, user);
}

// Helper function to normalize AI responses for different providers
function normalizeAIResponse(response, analysisType) {
  try {
    let parsedResponse;
    
    // Try to parse the response if it's a string
    if (typeof response === 'string') {
      // Clean up response - remove markdown code blocks if present
      let cleanResponse = response;
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      try {
        parsedResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.warn(`[AI] Failed to parse response as JSON:`, parseError.message);
        console.warn(`[AI] Problematic JSON at position ${parseError.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
        
        // Try to fix common JSON issues
        try {
          let fixedResponse = cleanResponse
            .replace(/([^\\])'/g, '$1\\\'')  // Escape unescaped single quotes
            .replace(/^'/g, "\\\'")          // Fix leading single quote
            .replace(/'([^,}\]]*[^\\])'/g, '"$1"')  // Convert single quotes to double quotes for strings
            .replace(/([^\\])'([^,}\]]*[^\\])'/g, '$1"$2"');  // More single quote fixes
          
          parsedResponse = JSON.parse(fixedResponse);
          console.log(`[AI] Successfully fixed JSON parsing issues`);
        } catch (fixError) {
          console.warn(`[AI] Could not fix JSON:`, fixError.message);
          console.warn(`[AI] Raw response:`, cleanResponse.substring(0, 1000));
          return { error: `Failed to parse AI response: ${parseError.message}` };
        }
      }
    } else {
      parsedResponse = response;
    }
    
    // Normalize based on analysis type and provider
    switch (analysisType) {
      case 'sensitive_data':
        return normalizeSensitiveDataResponse(parsedResponse);
        
      case 'vulnerabilities':
        return normalizeVulnerabilityResponse(parsedResponse);
        
      case 'code_quality':
        return normalizeCodeQualityResponse(parsedResponse);
        
      case 'risk_assessment':
        return normalizeRiskAssessmentResponse(parsedResponse);
        
      case 'error_flow':
        return normalizeErrorFlowResponse(parsedResponse);
        
      case 'codebase':
        return normalizeCodebaseResponse(parsedResponse);
        
      default:
        return parsedResponse;
    }
  } catch (error) {
    console.error(`[AI] Error normalizing response:`, error);
    return { error: error.message };
  }
}

// Normalize sensitive data responses
function normalizeSensitiveDataResponse(response) {
  // Handle both local and OpenRouter formats
  if (response.detections && Array.isArray(response.detections)) {
    // Already in correct format
    return response;
  }
  
  // If response has different structure, try to extract detections
  if (response.sensitive_data && Array.isArray(response.sensitive_data)) {
    return {
      detections: response.sensitive_data,
      summary: response.summary || "Sensitive data analysis completed"
    };
  }
  
  // Fallback: create basic structure
  return {
    detections: [],
    summary: response.summary || "No sensitive data detected",
    error_analysis: response.error_analysis || {},
    error_flows: response.error_flows || []
  };
}

// Normalize vulnerability responses
function normalizeVulnerabilityResponse(response) {
  // Handle both local and OpenRouter formats
  if (response.vulnerabilities && Array.isArray(response.vulnerabilities)) {
    // Ensure each vulnerability has required fields and prefer concrete code fixes
    const normalizedVulns = response.vulnerabilities.map(vuln => ({
      type: vuln.type || 'Unknown',
      severity: vuln.severity || 'medium',
      description: vuln.description || 'No description available',
      location: vuln.location || 'Unknown location',
      // Prefer `after_code` (copy-paste ready) over textual `fix`
      fix: (typeof vuln.after_code === 'string' && vuln.after_code.trim().length > 0)
        ? vuln.after_code
        : (vuln.fix || 'No fix suggestion available'),
      before_code: vuln.before_code || null,
      after_code: vuln.after_code || null
    }));
    
    return {
      vulnerabilities: normalizedVulns,
      risk_score: response.risk_score || response.riskScore || 0,
      summary: response.summary || "Vulnerability analysis completed"
    };
  }
  
  // Fallback: create basic structure
  return {
    vulnerabilities: [],
    risk_score: 0,
    summary: response.summary || "No vulnerabilities detected"
  };
}

// Normalize code quality responses
function normalizeCodeQualityResponse(response) {
  // Handle both local and OpenRouter formats
  if (response.quality_score !== undefined || response.qualityScore !== undefined) {
    const normalizedMetrics = {
      complexity: response.metrics?.complexity || 0,
      maintainability: response.metrics?.maintainability || 0,
      performance: response.metrics?.performance || 0,
      documentation: response.metrics?.documentation || 0,
      logging: response.metrics?.logging || 0
    };
    
    return {
      quality_score: response.quality_score || response.qualityScore || 0,
      metrics: normalizedMetrics,
      issues: response.issues || [],
      recommendations: response.recommendations || []
    };
  }
  
  // Fallback: create basic structure
  return {
    quality_score: 0,
    metrics: { complexity: 0, maintainability: 0, performance: 0, documentation: 0, logging: 0 },
    issues: [],
    recommendations: []
  };
}

// Normalize risk assessment responses
function normalizeRiskAssessmentResponse(response) {
  return {
    risk_score: response.risk_score || response.riskScore || 0,
    factors: response.factors || [],
    mitigation_strategies: response.mitigation_strategies || response.mitigationStrategies || [],
    priority_level: response.priority_level || response.priorityLevel || 'medium'
  };
}

// Normalize error flow responses
function normalizeErrorFlowResponse(response) {
  return {
    root_cause: response.root_cause || response.rootCause || 'Unknown',
    flow_pattern: response.flow_pattern || response.flowPattern || 'Unknown pattern',
    cascade_analysis: response.cascade_analysis || response.cascadeAnalysis || 'No cascade analysis available',
    prevention_strategies: response.prevention_strategies || response.preventionStrategies || [],
    monitoring_points: response.monitoring_points || response.monitoringPoints || [],
    business_impact: response.business_impact || response.businessImpact || 'Unknown impact'
  };
}

// Normalize codebase responses
function normalizeCodebaseResponse(response) {
  return {
    architecture_score: response.architecture_score || response.architectureScore || 0,
    security_score: response.security_score || response.securityScore || 0,
    quality_score: response.quality_score || response.qualityScore || 0,
    technical_debt: response.technical_debt || response.technicalDebt || 'Unknown',
    recommendations: response.recommendations || [],
    compliance_status: response.compliance_status || response.complianceStatus || 'Unknown'
  };
}

// Main analysis function
async function performAnalysis(inputData, analysisType) {
  console.log(`[AI] ===== PERFORMING ${analysisType.toUpperCase()} ANALYSIS =====`);
  
  try {
    let rawResponse;
    
    switch (analysisType) {
      case 'sensitive_data':
        console.log('[AI] Input data type:', typeof inputData);
        console.log('[AI] Input data length:', inputData.length, 'characters');
        console.log('[AI] Input data preview:', inputData.substring(0, 500) + '...');
        rawResponse = await analyzeSensitiveData(inputData);
        break;
        
      case 'vulnerabilities':
        console.log('[AI] Analyzing file:', inputData.fileName || 'unknown');
        console.log('[AI] File type:', inputData.fileType || 'unknown');
        console.log('[AI] Content length:', inputData.content.length, 'characters');
        console.log('[AI] Content preview:', inputData.content.substring(0, 300) + '...');
        rawResponse = await analyzeVulnerabilities(inputData.content, inputData.fileType);
        break;
        
      case 'code_quality':
        console.log('[AI] Analyzing file:', inputData.fileName || 'unknown');
        console.log('[AI] File type:', inputData.fileType || 'unknown');
        console.log('[AI] Content length:', inputData.content.length, 'characters');
        console.log('[AI] Content preview:', inputData.content.substring(0, 300) + '...');
        rawResponse = await analyzeCodeQuality(inputData.content, inputData.fileType);
        break;
        
      case 'risk_assessment':
        console.log('[AI] Risk assessment input:', JSON.stringify(inputData, null, 2));
        rawResponse = await analyzeRisk(inputData);
        break;
        
      case 'error_flow':
        console.log('[AI] Error flow input:', JSON.stringify(inputData, null, 2));
        rawResponse = await analyzeErrorFlow(inputData);
        break;
        
      case 'codebase':
        console.log('[AI] Codebase analysis - Number of files:', inputData.files?.length || 0);
        console.log('[AI] Files being analyzed:', inputData.files?.map(f => f.fileName).join(', ') || 'none');
        console.log('[AI] Codebase data preview:', JSON.stringify(inputData, null, 2).substring(0, 1000) + '...');
        rawResponse = await analyzeCodebase(inputData);
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
    
    // Normalize the response for consistent frontend consumption
    const normalizedResponse = normalizeAIResponse(rawResponse, analysisType);
    console.log(`[AI] ===== NORMALIZED ${analysisType.toUpperCase()} RESPONSE =====`);
    console.log(`[AI] Normalized response:`, JSON.stringify(normalizedResponse, null, 2));
    
    return normalizedResponse;
  } catch (error) {
    console.error(`[AI] ===== ${analysisType.toUpperCase()} ANALYSIS FAILED =====`);
    console.error(`[AI] Error:`, error.message);
    console.error(`[AI] Stack:`, error.stack);
    return { error: error.message };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const analysisType = args[0];
  const inputFile = args[1];
  const outputFile = args[2];

  if (!analysisType || !inputFile) {
    console.log('Usage: node analyzer.js <analysis_type> <input_file> [output_file]');
    console.log('Analysis types: sensitive_data, vulnerabilities, code_quality, risk_assessment, error_flow, codebase');
    process.exit(1);
  }

  (async () => {
    try {
      const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
      const result = await performAnalysis(inputData, analysisType);
      
      const output = outputFile || `analysis_${analysisType}_${Date.now()}.json`;
      fs.writeFileSync(output, JSON.stringify(result, null, 2));
      console.log(`Analysis complete. Results written to ${output}`);
    } catch (error) {
      console.error('Analysis failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  performAnalysis,
  analyzeSensitiveData,
  analyzeVulnerabilities,
  analyzeCodeQuality,
  analyzeRisk,
  analyzeErrorFlow,
  analyzeCodebase
};
