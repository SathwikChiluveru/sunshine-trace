# AI-Powered Analysis Capabilities

## Overview

Your Sunshine Trace project now has comprehensive AI-powered analysis capabilities using the **Qwen/Qwen3-Coder-30B** model. This document outlines all the AI features that have been implemented and how to use them.

## ✅ Implemented AI Features

### 1. **AI-Powered Sensitive Data Detection** 🤖🔒
- **What it does**: Uses AI to intelligently detect PII, credentials, tokens, and sensitive information in logs and code
- **Advantages over regex**: Understands context, distinguishes between real data and placeholders, provides confidence scores
- **Output**: Detailed detections with confidence levels, context analysis, and specific suggestions

### 2. **AI Vulnerability Detection** 🤖🛡️
- **What it does**: Analyzes code for security vulnerabilities including SQL injection, XSS, authentication flaws, etc.
- **Coverage**: Injection attacks, XSS, auth issues, crypto problems, input validation, insecure references
- **Output**: Vulnerability list with severity levels, descriptions, locations, and AI-suggested fixes

### 3. **AI Code Quality Analysis** 🤖⚡
- **What it does**: Evaluates code quality across multiple dimensions
- **Metrics**: Complexity, maintainability, performance, documentation, error handling, testing
- **Output**: Quality scores, specific issues, and improvement recommendations

### 4. **AI Risk Assessment** 🤖📊
- **What it does**: Calculates comprehensive risk scores for modules and codebases
- **Factors**: Code complexity, security vulnerabilities, error patterns, dependencies, business impact
- **Output**: Risk scores (0-100), risk factors, mitigation strategies, priority levels

### 5. **AI Error Flow Analysis** 🤖🔄
- **What it does**: Analyzes error sequences to understand root causes and propagation patterns
- **Capabilities**: Root cause identification, cascade analysis, prevention strategies, monitoring recommendations
- **Output**: Complete error flow mapping with business impact assessment

### 6. **AI Codebase Analysis** 🤖🏗️
- **What it does**: Performs comprehensive analysis of entire codebases
- **Coverage**: Architecture assessment, security posture, code quality, technical debt, compliance
- **Output**: Multi-dimensional scores and prioritized recommendations

## 🚀 How to Use

### Backend API Endpoints

#### 1. Single File Analysis
```bash
POST /api/analyze/file
Content-Type: application/json

{
  "content": "your code or log content",
  "fileName": "example.js",
  "fileType": "js"
}
```

#### 2. Batch Analysis
```bash
POST /api/analyze/batch
Content-Type: application/json

{
  "files": [
    {
      "fileName": "app.js",
      "fileType": "js",
      "content": "const express = require('express');..."
    },
    {
      "fileName": "app.log",
      "fileType": "log", 
      "content": "2025-01-16 10:00:00 ERROR UserService - Database connection failed"
    }
  ]
}
```

#### 3. Specific Analysis Types
```bash
POST /api/ai/analyze
Content-Type: application/json

{
  "type": "vulnerabilities", // or sensitive_data, code_quality, risk_assessment, error_flow, codebase
  "data": {
    "content": "your code",
    "fileType": "js"
  }
}
```

### CLI Usage

```bash
# Analyze sensitive data
npm run ai:sensitive input.json output.json

# Analyze vulnerabilities
npm run ai:vulnerabilities input.json output.json

# Analyze code quality
npm run ai:quality input.json output.json

# Risk assessment
npm run ai:risk input.json output.json

# Error flow analysis
npm run ai:flow input.json output.json

# Full codebase analysis
npm run ai:codebase input.json output.json
```

### Frontend Integration

The frontend automatically:
1. **Detects file types** when you upload files
2. **Performs appropriate AI analysis** based on file type
3. **Displays results** in dedicated AI-powered sections
4. **Falls back gracefully** if AI analysis fails

## 📊 AI Analysis Results

### Sensitive Data Detection
```json
{
  "detections": [
    {
      "type": "NRIC",
      "value": "S1234567A",
      "confidence": 0.95,
      "context": "Found in user registration log",
      "suggestion": "Mask last 4 characters in logs"
    }
  ],
  "summary": "Found 3 high-confidence PII detections requiring immediate attention"
}
```

### Vulnerability Analysis
```json
{
  "vulnerabilities": [
    {
      "type": "SQL Injection",
      "severity": "high",
      "description": "Direct string concatenation in SQL query",
      "location": "UserService.js:45",
      "fix": "Use parameterized queries with prepared statements"
    }
  ],
  "risk_score": 75,
  "summary": "Found 2 high-severity vulnerabilities requiring immediate patching"
}
```

### Code Quality Analysis
```json
{
  "quality_score": 68,
  "metrics": {
    "complexity": 7.2,
    "maintainability": 6.8,
    "performance": 7.5,
    "documentation": 4.2
  },
  "issues": [
    {
      "type": "Missing Documentation",
      "severity": "medium",
      "description": "Functions lack JSDoc comments",
      "suggestion": "Add comprehensive JSDoc documentation"
    }
  ],
  "recommendations": ["Improve documentation", "Reduce cyclomatic complexity"]
}
```

## 🔧 Configuration

### Environment Variables
```bash
# AI Model Configuration
AI_API_BASE=http://genaillm02.devnet.int:11435/v1
AI_MODEL=Qwen/Qwen3-Coder-30B-A3B-Instruct
AI_API_KEY=local
```

### Model Settings
- **Temperature**: 0.1 (for consistent, focused analysis)
- **Max Tokens**: 2048 (for detailed responses)
- **Model**: Qwen3-Coder-30B (specialized for code analysis)

## 🎯 Benefits Over Traditional Methods

### vs. Regex Pattern Matching
- **Context Understanding**: AI understands if data is real or placeholder
- **Confidence Scoring**: Provides reliability metrics for detections
- **Adaptive Detection**: Learns from patterns, not just fixed rules

### vs. Static Analysis Tools
- **Natural Language**: Provides human-readable explanations
- **Business Context**: Considers business impact in recommendations
- **Comprehensive Coverage**: Analyzes multiple aspects simultaneously

### vs. Manual Code Review
- **Consistency**: Same analysis standards across all code
- **Speed**: Analyzes large codebases in minutes
- **Completeness**: Doesn't miss patterns that humans might overlook

## 🚀 Next Steps

The foundation is now in place for all AI-powered analysis. You can:

1. **Test the current implementation** by uploading files through the web interface
2. **Extend analysis types** by adding new prompts to the AI analyzer
3. **Customize prompts** for your specific domain or requirements
4. **Add more file types** by extending the file type detection logic
5. **Integrate with CI/CD** by calling the API endpoints from build pipelines

## 🔍 Example Use Cases

### Development Team
- Upload code files to get instant security and quality feedback
- Identify sensitive data exposure before deployment
- Get AI-suggested improvements for code quality

### Security Team
- Scan logs for PII exposure incidents
- Analyze code for security vulnerabilities
- Get risk assessments for different modules

### DevOps Team
- Analyze error logs to understand system issues
- Get recommendations for monitoring and alerting
- Assess overall system health and technical debt

The AI capabilities transform your project from a simple log parser into a comprehensive code and system analysis platform! 🎉
