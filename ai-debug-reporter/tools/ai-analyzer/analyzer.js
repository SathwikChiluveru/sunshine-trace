#!/usr/bin/env node
// Enhanced AI analyzer for comprehensive code and log analysis
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Provider selection: prefer OpenRouter if key present, else internal vLLM
const OR_ENABLED   = !!process.env.OPENROUTER_API_KEY;
const OR_BASE      = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
const OR_MODEL     = process.env.OPENROUTER_MODEL     || 'qwen/qwen2.5-vl-32b-instruct:free';
const OR_SITE_URL  = process.env.OPENROUTER_SITE_URL  || 'http://localhost:3000';
const OR_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'Sunshine Trace';

const DEVNET_BASE  = process.env.AI_API_BASE || 'http://genaillm02.devnet.int:11435/v1';
const DEVNET_MODEL = process.env.AI_MODEL    || 'Qwen/Qwen3-Coder-30B-A3B-Instruct';
const DEVNET_KEY   = process.env.AI_API_KEY  || 'local';

const PROVIDER     = OR_ENABLED ? 'openrouter' : 'devnet';
const API_BASE     = OR_ENABLED ? OR_BASE : DEVNET_BASE;
const MODEL        = OR_ENABLED ? OR_MODEL : DEVNET_MODEL;
const API_KEY      = OR_ENABLED ? process.env.OPENROUTER_API_KEY : DEVNET_KEY;

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
Analyze log content for:

1. SENSITIVE DATA DETECTION:
- Personal Identifiable Information (PII): names, emails, phone numbers, addresses
- Financial data: credit cards, bank accounts, transaction IDs
- Authentication data: passwords, tokens, API keys, session IDs
- Medical data: patient IDs, medical records, health information
- Business data: internal IDs, proprietary information

2. ERROR PATTERN ANALYSIS:
- Count total log entries, errors, warnings, fatal errors
- Identify error flow patterns (WARN -> ERROR -> FATAL sequences)
- Detect error cascades and system failures
- Analyze error correlation and timing

3. SYSTEM HEALTH ASSESSMENT:
- Calculate error rates and system stability
- Identify critical issues and failure points
- Assess logging quality and completeness

Consider context - distinguish between real data and placeholders/test data.
Return JSON with: {
  detections: [{type, value, confidence, context, suggestion}],
  error_analysis: {
    total_logs: number,
    error_count: number,
    warning_count: number,
    fatal_count: number,
    info_count: number,
    error_rate: number
  },
  error_flows: [{trigger, cascade, stackTop, severity}],
  summary: "Overall system health and security assessment"
}`
  
  const user = `Analyze this log content comprehensively:\n${logContent}`;
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

Return JSON with: {vulnerabilities: [{type, severity, description, location, fix}, ...], risk_score, summary}`
  
  const user = `Analyze this ${fileType} code for security vulnerabilities:\n${codeContent}`;
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

Return JSON with: {
  quality_score, 
  metrics: {
    complexity, 
    maintainability, 
    performance, 
    documentation,
    logging: number (0-100, where 100 is excellent logging practices)
  }, 
  issues: [{type, severity, description, suggestion}], 
  recommendations
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

// Main analysis function
async function performAnalysis(inputData, analysisType) {
  console.log(`[AI] ===== PERFORMING ${analysisType.toUpperCase()} ANALYSIS =====`);
  
  try {
    switch (analysisType) {
      case 'sensitive_data':
        console.log('[AI] Input data type:', typeof inputData);
        console.log('[AI] Input data length:', inputData.length, 'characters');
        console.log('[AI] Input data preview:', inputData.substring(0, 500) + '...');
        return await analyzeSensitiveData(inputData);
        
      case 'vulnerabilities':
        console.log('[AI] Analyzing file:', inputData.fileName || 'unknown');
        console.log('[AI] File type:', inputData.fileType || 'unknown');
        console.log('[AI] Content length:', inputData.content.length, 'characters');
        console.log('[AI] Content preview:', inputData.content.substring(0, 300) + '...');
        return await analyzeVulnerabilities(inputData.content, inputData.fileType);
        
      case 'code_quality':
        console.log('[AI] Analyzing file:', inputData.fileName || 'unknown');
        console.log('[AI] File type:', inputData.fileType || 'unknown');
        console.log('[AI] Content length:', inputData.content.length, 'characters');
        console.log('[AI] Content preview:', inputData.content.substring(0, 300) + '...');
        return await analyzeCodeQuality(inputData.content, inputData.fileType);
        
      case 'risk_assessment':
        console.log('[AI] Risk assessment input:', JSON.stringify(inputData, null, 2));
        return await analyzeRisk(inputData);
        
      case 'error_flow':
        console.log('[AI] Error flow input:', JSON.stringify(inputData, null, 2));
        return await analyzeErrorFlow(inputData);
        
      case 'codebase':
        console.log('[AI] Codebase analysis - Number of files:', inputData.files?.length || 0);
        console.log('[AI] Files being analyzed:', inputData.files?.map(f => f.fileName).join(', ') || 'none');
        console.log('[AI] Codebase data preview:', JSON.stringify(inputData, null, 2).substring(0, 1000) + '...');
        return await analyzeCodebase(inputData);
        
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
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
