require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const app = express();
const port = 5000;
const cors = require('cors');

const allowedOrigins = [
  'https://sunshine-trace.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support large code files


// Define paths to the JSON files
const findingsFilePath = path.join(__dirname, '/reports/findings.json');
const summaryFilePath = path.join(__dirname, '/reports/summary.json');

// Endpoint to get findings.json
app.get('/api/findings', (req, res) => {
  fs.readFile(findingsFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading findings.json:", err);
      return res.status(500).send('Error reading findings file');
    }
    res.json(JSON.parse(data));
  });
});

// Endpoint to get summary.json
app.get('/api/summary', (req, res) => {
  fs.readFile(summaryFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading summary.json:", err);
      return res.status(500).send('Error reading summary file');
    }
    res.json(JSON.parse(data));
  });
});

// Static dataset for summary metrics and history until real storage is wired up
const summaryMetricsData = {
  currentMetrics: {
    loggingQuality: 2,
    errorFlows: 3,
    sensitiveData: 4,
    recommendations: 11,
  },
  history: [
    {
      id: "1",
      timestamp: "2025-10-30T14:30:00.000Z",
      fileName: "debug-report-v2.log",
      metrics: {
        loggingQuality: 5,
        errorFlows: 2,
        sensitiveData: 6,
        recommendations: 8,
      },
    },
    {
      id: "2",
      timestamp: "2025-10-29T09:15:00.000Z",
      fileName: "error-analysis.log",
      metrics: {
        loggingQuality: 4,
        errorFlows: 4,
        sensitiveData: 5,
        recommendations: 12,
      },
    },
    {
      id: "3",
      timestamp: "2025-10-28T16:45:00.000Z",
      fileName: "system-debug.log",
      metrics: {
        loggingQuality: 3,
        errorFlows: 3,
        sensitiveData: 7,
        recommendations: 9,
      },
    },
  ],
};

app.get('/api/summary/metrics', (req, res) => {
  res.json({ ...summaryMetricsData, isSample: true });
});

// AI Analysis endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data in request' });
    }

    // Import the AI analyzer
    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
    
    // Perform AI analysis
    const result = await performAnalysis(data, type);
    
    res.json(result);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced file analysis endpoint
app.post('/api/analyze/file', async (req, res) => {
  try {
    const { content, fileName, fileType, selectedTypes } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    console.log('[FILE] Analysis request:', {
      fileName,
      fileType,
      selectedTypes: selectedTypes || [],
      contentLength: content.length
    });

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
    const results = {};

    // Determine file type if not provided
    const detectedType = fileType || fileName?.split('.').pop() || 'unknown';

    // Perform analyses based on file type and selected types
    const isLogFile = detectedType === 'log' || content.includes('ERROR') || content.includes('INFO');
    const hasLoggingCode = content.includes('console.log') || content.includes('logInfo') || content.includes('logError') || content.includes('logger');
    
    if (isLogFile || hasLoggingCode) {
      // Log file or code with logging - analyze for sensitive data if selected
      if (!selectedTypes || selectedTypes.includes('sensitive-data')) {
        console.log(`[FILE] Running sensitive data analysis for ${fileName} (${isLogFile ? 'log file' : 'code with logging'})`);
        results.sensitiveData = await performAnalysis(content, 'sensitive_data');
      }
    }

    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'php'].includes(detectedType)) {
      // Code file - analyze for vulnerabilities if selected
      if (!selectedTypes || selectedTypes.includes('recommendations')) {
        console.log(`[FILE] Running vulnerability analysis for ${fileName}`);
        results.vulnerabilities = await performAnalysis({ content, fileType: detectedType }, 'vulnerabilities');
      }
      
      // Code file - analyze for code quality if logging-quality is selected
      if (!selectedTypes || selectedTypes.includes('logging-quality')) {
        console.log(`[FILE] Running code quality analysis for ${fileName}`);
        results.codeQuality = await performAnalysis({ content, fileType: detectedType }, 'code_quality');
      }
    }

    console.log('[FILE] Analysis completed for', fileName, 'with results:', Object.keys(results));

    res.json({
      fileName,
      fileType: detectedType,
      analysis: results,
      selectedTypes: selectedTypes || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch analysis endpoint for multiple files
app.post('/api/analyze/batch', async (req, res) => {
  try {
    const { files, selectedTypes } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }

    console.log('[BATCH] Analysis request:', {
      fileCount: files.length,
      selectedTypes: selectedTypes || [],
      files: files.map(f => ({ fileName: f.fileName, fileType: f.fileType }))
    });

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
    const results = [];

    for (const file of files) {
      try {
        const fileResults = { fileName: file.fileName, fileType: file.fileType };
        
        if (file.content) {
          // Only run sensitive data analysis if selected
          // Run for log files, or code files that contain logging functions
          const isLogFile = file.fileType === 'log' || file.content.includes('ERROR') || file.content.includes('INFO');
          const hasLoggingCode = file.content.includes('console.log') || file.content.includes('logInfo') || file.content.includes('logError') || file.content.includes('logger');
          
          if ((isLogFile || hasLoggingCode) && 
              (!selectedTypes || selectedTypes.includes('sensitive-data'))) {
            console.log(`[BATCH] Running sensitive data analysis for ${file.fileName} (${isLogFile ? 'log file' : 'code with logging'})`);
            fileResults.sensitiveData = await performAnalysis(file.content, 'sensitive_data');
          }
          
          // Only run code analysis if selected and file is code
          if (['js', 'ts', 'py', 'java', 'cpp', 'c'].includes(file.fileType)) {
            // Run vulnerability analysis if selected
            if (!selectedTypes || selectedTypes.includes('recommendations')) {
              console.log(`[BATCH] Running vulnerability analysis for ${file.fileName}`);
              fileResults.vulnerabilities = await performAnalysis({ content: file.content, fileType: file.fileType }, 'vulnerabilities');
            }
            
            // Run code quality analysis if logging-quality is selected
            if (!selectedTypes || selectedTypes.includes('logging-quality')) {
              console.log(`[BATCH] Running code quality analysis for ${file.fileName}`);
              fileResults.codeQuality = await performAnalysis({ content: file.content, fileType: file.fileType }, 'code_quality');
            }

            // Derive error flows from code if error-flow selected
            if (!selectedTypes || selectedTypes.includes('error-flow')) {
              console.log(`[BATCH] Deriving error flows for code file ${file.fileName}`);
              try {
                const lines = file.content.split(/\r?\n/);
                const flows = [];
                const warnRx = /\b(console\.warn|logWarn|logger\.warn)\b/i;
                const errorRx = /\b(throw\s+new|console\.error|logError|logger\.error)\b/i;
                const infoRx = /\b(console\.log|logger\.info)\b/i;
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (warnRx.test(line)) {
                    const path = [line.trim()];
                    let stackTop = '';
                    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
                      const ln = lines[j];
                      if (errorRx.test(ln)) {
                        path.push(ln.trim());
                        if (!stackTop) stackTop = ln.trim();
                      } else if (infoRx.test(ln)) {
                        break;
                      }
                    }
                    if (path.length > 1) flows.push({ path, stackTop: stackTop || path[path.length - 1] });
                  }
                }
                if (flows.length === 0) {
                  for (let i = 0; i < lines.length; i++) {
                    if (/\bthrow\s+new\b/i.test(lines[i])) {
                      flows.push({ path: [lines[i].trim()], stackTop: lines[i].trim() });
                    }
                  }
                }
                if (flows.length > 0) fileResults.errorFlows = flows;
              } catch (efErr) {
                console.warn(`[BATCH] Failed to derive error flows for ${file.fileName}:`, efErr.message);
              }
            }
          }

          // Derive error flows from logs if error-flow selected
          if ((!selectedTypes || selectedTypes.includes('error-flow')) && (file.fileType === 'log' || file.fileType === 'txt')) {
            console.log(`[BATCH] Deriving error flows for log file ${file.fileName}`);
            try {
              const lines = file.content.split(/\r?\n/).filter(Boolean);
              const flows = [];
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/\bWARN\b/i.test(line)) {
                  const path = [line.replace(/^\s+/, '')];
                  let stackTop = '';
                  for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                    const ln = lines[j];
                    if (/\b(ERROR|FATAL)\b/i.test(ln)) {
                      path.push(ln.replace(/^\s+/, ''));
                      if (!stackTop) stackTop = ln;
                    } else if (/\bINFO\b/i.test(ln)) {
                      break;
                    }
                  }
                  if (path.length > 1) flows.push({ path, stackTop: stackTop || path[path.length - 1] });
                }
              }
              if (flows.length > 0) fileResults.errorFlows = (fileResults.errorFlows || []).concat(flows);
            } catch (efLogErr) {
              console.warn(`[BATCH] Failed to derive error flows for ${file.fileName}:`, efLogErr.message);
            }
          }
        }
        
        results.push(fileResults);
      } catch (error) {
        console.error(`Error analyzing file ${file.fileName}:`, error);
        results.push({ fileName: file.fileName, error: error.message });
      }
    }

    console.log('[BATCH] Analysis completed:', {
      totalFiles: files.length,
      successfulAnalyses: results.filter(r => !r.error).length
    });

    res.json({
      results,
      totalFiles: files.length,
      successfulAnalyses: results.filter(r => !r.error).length,
      selectedTypes: selectedTypes || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze a zipped codebase (base64 zip)
app.post('/api/analyze/zip', async (req, res) => {
  try {
    const { zipBase64 } = req.body;
    if (!zipBase64) return res.status(400).json({ error: 'zipBase64 required' });

    // Unzip to a temp directory
    const tmpDir = path.join(__dirname, 'tmp', `zip_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const zip = new AdmZip(Buffer.from(zipBase64, 'base64'));
    zip.extractAllTo(tmpDir, true);

    // Collect a limited set of text/code files to avoid huge prompts
    const exts = ['.js','.ts','.tsx','.py','.java','.go','.rb','.php','.cs','.json','.md','.log'];
    const files = [];
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
          walk(full);
        } else {
          const ext = path.extname(e.name).toLowerCase();
          if (exts.includes(ext)) {
            try {
              const content = fs.readFileSync(full, 'utf-8');
              files.push({ fileName: path.relative(tmpDir, full), fileType: ext.replace('.',''), content });
            } catch {}
          }
        }
      }
    }
    walk(tmpDir);
    
    console.log('[ZIP] ===== FILE EXTRACTION COMPLETE =====');
    console.log('[ZIP] Total files found:', files.length);
    console.log('[ZIP] Files by type:', files.reduce((acc, f) => {
      acc[f.fileType] = (acc[f.fileType] || 0) + 1;
      return acc;
    }, {}));
    console.log('[ZIP] File list:', files.map(f => `${f.fileName} (${f.fileType}, ${f.content.length} chars)`));

    // Limit total size (e.g., 1 MB) to keep prompts reasonable
    let total = 0;
    const limited = [];
    for (const f of files) {
      const size = Buffer.byteLength(f.content, 'utf-8');
      if (total + size > 1024*1024) break;
      limited.push(f);
      total += size;
    }
    
    console.log('[ZIP] ===== FILE SIZE LIMITING =====');
    console.log('[ZIP] Total size limit: 1MB');
    console.log('[ZIP] Files selected for analysis:', limited.length);
    console.log('[ZIP] Total size used:', total, 'bytes');
    console.log('[ZIP] Files excluded due to size limit:', files.length - limited.length);
    console.log('[ZIP] Selected files:', limited.map(f => `${f.fileName} (${f.fileType}, ${f.content.length} chars)`));

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');

    // Aggregate AI results
    console.log('[ZIP] ===== STARTING AI ANALYSIS =====');
    console.log('[ZIP] Codebase analysis input:', limited.map(({fileName,fileType})=>({fileName,fileType})));
    
    const aiResults = {
      codebase: await performAnalysis({ files: limited.map(({fileName,fileType})=>({fileName,fileType})) }, 'codebase'),
      modules: [],
      logAnalysis: null
    };

    // AI analysis for code files
    console.log('[ZIP] ===== ANALYZING INDIVIDUAL FILES =====');
    for (const f of limited) {
      console.log(`[ZIP] Analyzing file: ${f.fileName} (${f.fileType})`);
      const mod = { fileName: f.fileName };
      try {
        console.log(`[ZIP] Running vulnerability analysis for ${f.fileName}`);
        mod.vulnerabilities = await performAnalysis({ content: f.content, fileType: f.fileType, fileName: f.fileName }, 'vulnerabilities');
        console.log(`[ZIP] Vulnerability analysis result for ${f.fileName}:`, {
          type: typeof mod.vulnerabilities,
          hasError: !!mod.vulnerabilities?.error,
          preview: typeof mod.vulnerabilities === 'string' ? mod.vulnerabilities.substring(0, 200) : JSON.stringify(mod.vulnerabilities).substring(0, 200)
        });
      } catch (error) {
        console.error(`[ZIP] Vulnerability analysis failed for ${f.fileName}:`, error.message);
      }
      try {
        console.log(`[ZIP] Running code quality analysis for ${f.fileName}`);
        mod.codeQuality = await performAnalysis({ content: f.content, fileType: f.fileType, fileName: f.fileName }, 'code_quality');
        console.log(`[ZIP] Code quality analysis result for ${f.fileName}:`, {
          type: typeof mod.codeQuality,
          hasError: !!mod.codeQuality?.error,
          preview: typeof mod.codeQuality === 'string' ? mod.codeQuality.substring(0, 200) : JSON.stringify(mod.codeQuality).substring(0, 200)
        });
      } catch (error) {
        console.error(`[ZIP] Code quality analysis failed for ${f.fileName}:`, error.message);
      }
      aiResults.modules.push(mod);
    }

    // AI analysis for log files
    const logFiles = limited.filter(f => f.fileName.toLowerCase().endsWith('.log'));
    console.log('[ZIP] ===== ANALYZING LOG FILES =====');
    console.log('[ZIP] Log files found:', logFiles.length);
    console.log('[ZIP] Log file names:', logFiles.map(f => f.fileName));
    
    if (logFiles.length > 0) {
      try {
        const combinedLogContent = logFiles.map(f => f.content).join('\n');
        console.log('[ZIP] Combined log content length:', combinedLogContent.length, 'characters');
        console.log('[ZIP] Combined log content preview:', combinedLogContent.substring(0, 500) + '...');
        
        aiResults.logAnalysis = await performAnalysis(combinedLogContent, 'sensitive_data');
        console.log('[ZIP] Log analysis completed:', aiResults.logAnalysis ? 'success' : 'failed');
      } catch (error) {
        console.error('[ZIP] Log analysis failed:', error.message);
        aiResults.logAnalysis = { error: error.message };
      }
    } else {
      console.log('[ZIP] No log files found for AI analysis');
    }

    // Enhanced logging quality analysis: prefer AI, fallback to deterministic
    let loggingScores = [];
    
    // Try to extract logging quality from AI code quality analysis
    console.log('[ZIP] ===== BUILDING LOGGING QUALITY SCORES =====');
    const codeFiles = limited.filter(f => ['js','ts','tsx','py','java','go','rb','php','cs'].includes((f.fileType||'').toLowerCase()));
    
    for (const f of codeFiles) {
      let score = 0;
      let gaps = [];
      
      // Try to get logging quality from AI code quality analysis
      const module = aiResults.modules.find(m => m.fileName === f.fileName);
      if (module?.codeQuality && !module.codeQuality.error) {
        try {
          const qualityData = typeof module.codeQuality === 'string' ? JSON.parse(module.codeQuality) : module.codeQuality;
          // Extract logging-related metrics from code quality
          if (qualityData.metrics?.logging) {
            score = qualityData.metrics.logging;
          } else if (qualityData.issues) {
            // Calculate score based on logging-related issues
            const loggingIssues = qualityData.issues.filter(issue => 
              issue.description?.toLowerCase().includes('log') ||
              issue.type?.toLowerCase().includes('log')
            );
            score = Math.max(0, 100 - (loggingIssues.length * 20));
            gaps = loggingIssues.map(issue => issue.description);
          }
          console.log(`[ZIP] AI logging quality for ${f.fileName}:`, score);
        } catch (parseError) {
          console.warn(`[ZIP] Failed to parse AI logging quality for ${f.fileName}:`, parseError.message);
        }
      }
      
      // Fallback to deterministic analysis if AI failed
      if (score === 0) {
        console.log(`[ZIP] Using deterministic logging quality for ${f.fileName}`);
        const hasErrorCodes = /ERR_\w+|errorCode|code:\s*\w+/i.test(f.content) ? 1 : 0;
        const hasCorrId    = /correlation|trace[_-]?id|x-request-id/i.test(f.content) ? 1 : 0;
        const structured   = /{[^}]*"level"\s*:\s*"(info|error|warn|debug)"[^}]*}/i.test(f.content) ? 1 : 0;
        score = Math.round((hasErrorCodes + hasCorrId + structured) / 3 * 100);
        
        // Generate gaps based on missing features
        if (!hasErrorCodes) gaps.push('Missing error codes');
        if (!hasCorrId) gaps.push('Missing correlation IDs');
        if (!structured) gaps.push('Missing structured logging');
      }
      
      loggingScores.push({ module: f.fileName, score, gaps });
    }
    
    console.log('[ZIP] Final logging quality scores:', loggingScores);

    // PII findings: prefer AI analysis, fallback to regex
    let piiFindings = [];
    
    // Try AI analysis first
    if (aiResults.logAnalysis && !aiResults.logAnalysis.error) {
      try {
        const aiPii = JSON.parse(aiResults.logAnalysis);
        if (aiPii.detections && Array.isArray(aiPii.detections)) {
          piiFindings = aiPii.detections.map(detection => ({
            type: detection.type || 'UNKNOWN',
            file: 'logs',
            line: 0,
            sample: detection.value || 'detected',
            action: detection.suggestion || 'mask/hash',
            confidence: detection.confidence || 0.8
          }));
          console.log('[AI] Using AI PII analysis:', piiFindings.length, 'detections');
        }
      } catch (parseError) {
        console.warn('[AI] Failed to parse AI PII results, using fallback:', parseError.message);
      }
    }
    
    // Fallback to regex if AI failed or no results
    if (piiFindings.length === 0) {
      console.log('[AI] Using regex fallback for PII detection');
      const nricRegex = /\b[STFG]\d{7}[A-Z]\b/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+65|65)?[689]\d{7}/g;
      
      for (const f of limited) {
        if (f.fileName.toLowerCase().endsWith('.log')) {
          const lines = f.content.split(/\r?\n/);
          lines.forEach((line, idx) => {
            for (const [type, rx] of [['NRIC', nricRegex], ['EMAIL', emailRegex], ['PHONE', phoneRegex]]){
              const m = line.match(rx);
              if (m){
                m.forEach(v => piiFindings.push({ type, file: f.fileName, line: idx+1, sample: v, action: type==='NRIC'?'mask last 4 chars':'mask/hash' }))
              }
            }
          })
        } else {
          // Scan non-log text without line numbers
          for (const [type, rx] of [['NRIC', nricRegex], ['EMAIL', emailRegex]]){
            if (rx.test(f.content)) piiFindings.push({ type, file: f.fileName, line: 0, sample: 'detected', action: type==='NRIC'?'mask last 4 chars':'mask/hash' })
          }
        }
      }
    }

    // Error flows: prefer AI analysis, fallback to pattern matching
    let errorFlows = [];
    
    // Try AI analysis for error flows
    if (aiResults.logAnalysis && !aiResults.logAnalysis.error) {
      try {
        const aiLogAnalysis = JSON.parse(aiResults.logAnalysis);
        if (aiLogAnalysis.error_flows && Array.isArray(aiLogAnalysis.error_flows)) {
          errorFlows = aiLogAnalysis.error_flows.map(flow => ({
            path: flow.path || [flow.trigger, flow.cascade].filter(Boolean),
            stackTop: flow.stackTop || flow.trigger || 'Unknown error'
          }));
          console.log('[AI] Using AI error flow analysis:', errorFlows.length, 'flows');
        }
      } catch (parseError) {
        console.warn('[AI] Failed to parse AI error flow results, using fallback:', parseError.message);
      }
    }
    
    // Fallback to pattern matching if AI failed or no results
    if (errorFlows.length === 0) {
      console.log('[AI] Using pattern matching fallback for error flows');
      const logFiles = limited.filter(f => f.fileName.toLowerCase().endsWith('.log'));
      for (const f of logFiles) {
        const lines = f.content.split(/\r?\n/).filter(Boolean);
        for (let i=0;i<lines.length;i++){
          const line = lines[i];
          if (/\bWARN\b/i.test(line)){
            const path = [line.replace(/^\s+/,'')];
            let stackTop = '';
            for (let j=i+1;j<Math.min(i+6, lines.length); j++){
              const ln = lines[j];
              if (/\b(ERROR|FATAL)\b/i.test(ln)){
                path.push(ln.replace(/^\s+/,''));
                if (!stackTop) stackTop = ln;
              } else if (/\bINFO\b/i.test(ln)){
                break;
              }
            }
            if (path.length>1) errorFlows.push({ path, stackTop: stackTop || path[path.length-1] });
          }
        }
      }
    }

    // Risk heatmap: prefer AI risk_score; otherwise derive from loggingScores
    console.log('[ZIP] ===== BUILDING RISK HEATMAP =====');
    console.log('[ZIP] AI modules available:', aiResults.modules?.length || 0);
    console.log('[ZIP] AI modules data:', aiResults.modules?.map(m => ({
      fileName: m.fileName,
      hasVulnerabilities: !!m.vulnerabilities,
      vulnerabilitiesData: m.vulnerabilities,
      hasCodeQuality: !!m.codeQuality,
      codeQualityData: m.codeQuality
    })));
    
    let riskHeatmap = (aiResults.modules || []).map(m => {
      let riskScore = 0;
      
      // Try to extract risk score from AI vulnerability analysis
      if (m.vulnerabilities && !m.vulnerabilities.error) {
        try {
          const vulnData = typeof m.vulnerabilities === 'string' ? JSON.parse(m.vulnerabilities) : m.vulnerabilities;
          riskScore = vulnData.risk_score || vulnData.riskScore || 0;
          console.log(`[ZIP] Extracted risk score for ${m.fileName}:`, riskScore);
        } catch (parseError) {
          console.warn(`[ZIP] Failed to parse vulnerability data for ${m.fileName}:`, parseError.message);
        }
      }
      
      // Try to extract risk score from AI code quality analysis
      if (riskScore === 0 && m.codeQuality && !m.codeQuality.error) {
        try {
          const qualityData = typeof m.codeQuality === 'string' ? JSON.parse(m.codeQuality) : m.codeQuality;
          // Convert quality score to risk (inverse relationship)
          const qualityScore = qualityData.quality_score || qualityData.qualityScore || 0;
          riskScore = Math.max(0, 100 - qualityScore);
          console.log(`[ZIP] Extracted risk from quality score for ${m.fileName}:`, riskScore);
        } catch (parseError) {
          console.warn(`[ZIP] Failed to parse code quality data for ${m.fileName}:`, parseError.message);
        }
      }
      
      return {
        module: m.fileName,
        risk: Math.min(100, Math.max(0, Math.round(riskScore)))
      };
    });
    
    console.log('[ZIP] AI-based risk heatmap:', riskHeatmap);
    
    if (riskHeatmap.length === 0 || riskHeatmap.every(m => m.risk === 0)) {
      console.log('[ZIP] Using logging quality fallback for risk heatmap');
      riskHeatmap = loggingScores.map(m => ({ module: m.module, risk: Math.max(0, 100 - m.score) }));
      console.log('[ZIP] Fallback risk heatmap:', riskHeatmap);
    }

    // Generate error flows from AI analysis results
    console.log('[ZIP] ===== GENERATING ERROR FLOWS =====');
    let aiErrorFlows = [];
    
    // Extract error flows from AI analysis results
    if (aiResults.modules && Array.isArray(aiResults.modules)) {
      for (const module of aiResults.modules) {
        // Check if module has error flow analysis
        if (module.errorFlow && !module.errorFlow.error) {
          try {
            const errorFlowData = typeof module.errorFlow === 'string' ? JSON.parse(module.errorFlow) : module.errorFlow;
            
            // Create error flow entry from AI analysis
            if (errorFlowData.root_cause || errorFlowData.flow_pattern) {
              aiErrorFlows.push({
                path: [errorFlowData.root_cause || 'Unknown root cause', errorFlowData.flow_pattern || 'Unknown pattern'],
                stackTop: errorFlowData.root_cause || 'Unknown root cause',
                cascade: errorFlowData.cascade_analysis || 'No cascade analysis available',
                prevention: errorFlowData.prevention_strategies || [],
                monitoring: errorFlowData.monitoring_points || [],
                businessImpact: errorFlowData.business_impact || 'Unknown impact'
              });
            }
          } catch (parseError) {
            console.warn(`[ZIP] Failed to parse error flow data for ${module.fileName}:`, parseError.message);
          }
        }
        
        // Also check for error patterns in vulnerability analysis
        if (module.vulnerabilities && !module.vulnerabilities.error) {
          try {
            const vulnData = typeof module.vulnerabilities === 'string' ? JSON.parse(module.vulnerabilities) : module.vulnerabilities;
            
            if (vulnData.vulnerabilities && Array.isArray(vulnData.vulnerabilities)) {
              // Look for error-related vulnerabilities
              const errorVulns = vulnData.vulnerabilities.filter(vuln => 
                vuln.type?.toLowerCase().includes('error') ||
                vuln.description?.toLowerCase().includes('error') ||
                vuln.type?.toLowerCase().includes('logging') ||
                vuln.type?.toLowerCase().includes('monitoring')
              );
              
              errorVulns.forEach(vuln => {
                aiErrorFlows.push({
                  path: [vuln.description || 'Security vulnerability detected', vuln.fix || 'No fix available'],
                  stackTop: vuln.type || 'Security Issue',
                  cascade: vuln.description || 'No description available',
                  prevention: [vuln.fix || 'No fix suggestion available'],
                  monitoring: ['Monitor for ' + (vuln.type || 'security issues')],
                  businessImpact: vuln.severity === 'critical' || vuln.severity === 'high' ? 'High business impact' : 'Medium business impact'
                });
              });
            }
          } catch (parseError) {
            console.warn(`[ZIP] Failed to parse vulnerability data for error flows in ${module.fileName}:`, parseError.message);
          }
        }
      }
    }
    
    // If no AI-generated error flows, create some basic ones from log analysis
    if (aiErrorFlows.length === 0) {
      console.log('[ZIP] No AI error flows found, generating basic error flows from log analysis');
      const logEntries = allLogs || [];
      const errorEntries = logEntries.filter(entry => 
        entry.level === 'ERROR' || entry.level === 'FATAL' || entry.level === 'WARN'
      );
      
      if (errorEntries.length > 0) {
        // Group errors by service
        const errorGroups = {};
        errorEntries.forEach(entry => {
          const service = entry.service || 'unknown';
          if (!errorGroups[service]) {
            errorGroups[service] = [];
          }
          errorGroups[service].push(entry);
        });
        
        // Create error flows for each service
        Object.entries(errorGroups).forEach(([service, errors]) => {
          if (errors.length > 0) {
            const topError = errors[0];
            aiErrorFlows.push({
              path: errors.map(e => e.message || 'Error occurred'),
              stackTop: topError.message || 'Error in ' + service,
              cascade: `Multiple errors detected in ${service} service`,
              prevention: ['Implement proper error handling', 'Add monitoring and alerting'],
              monitoring: [`Monitor ${service} service for errors`],
              businessImpact: 'Service degradation may affect user experience'
            });
          }
        });
      }
    }
    
    console.log('[ZIP] Generated error flows:', aiErrorFlows.length);

    // Enhanced summary with meaningful insights - prefer AI analysis
    let errCount = 0, warnCount = 0, fatalCount = 0, infoCount = 0, totalLogs = 0;
    
    // Try AI log analysis first
    if (aiResults.logAnalysis && !aiResults.logAnalysis.error) {
      try {
        const aiLogAnalysis = JSON.parse(aiResults.logAnalysis);
        if (aiLogAnalysis.error_analysis) {
          errCount = aiLogAnalysis.error_analysis.error_count || 0;
          warnCount = aiLogAnalysis.error_analysis.warning_count || 0;
          fatalCount = aiLogAnalysis.error_analysis.fatal_count || 0;
          infoCount = aiLogAnalysis.error_analysis.info_count || 0;
          totalLogs = aiLogAnalysis.error_analysis.total_logs || 0;
          console.log('[AI] Using AI log analysis for summary:', { errCount, warnCount, fatalCount, infoCount, totalLogs });
        }
      } catch (parseError) {
        console.warn('[AI] Failed to parse AI log analysis, using fallback:', parseError.message);
      }
    }
    
    // Fallback to regex counting if AI failed
    if (totalLogs === 0) {
      console.log('[AI] Using regex fallback for log counting');
      const anyLog = logFiles[0]?.content || '';
      errCount = (anyLog.match(/\bERROR\b/g) || []).length;
      warnCount = (anyLog.match(/\bWARN\b/g) || []).length;
      fatalCount = (anyLog.match(/\bFATAL\b/g) || []).length;
      infoCount = (anyLog.match(/\bINFO\b/g) || []).length;
      totalLogs = errCount + warnCount + fatalCount + infoCount;
    }
    
    // Calculate system health indicators
    const errorRate = totalLogs > 0 ? (errCount + fatalCount) / totalLogs : 0;
    const criticalIssues = fatalCount > 0;
    const highErrorRate = errorRate > 0.1; // 10% error rate threshold
    
    // Assess logging quality
    const avgLoggingScore = loggingScores.length > 0 ? 
      loggingScores.reduce((sum, m) => sum + m.score, 0) / loggingScores.length : 0;
    const poorLogging = avgLoggingScore < 50;
    
    // Assess security concerns
    const hasPii = piiFindings.length > 0;
    const hasErrorFlows = errorFlows.length > 0;
    
    // Generate meaningful executive summary
    let healthStatus = "HEALTHY";
    if (criticalIssues) healthStatus = "CRITICAL";
    else if (highErrorRate || poorLogging) healthStatus = "DEGRADED";
    else if (hasPii || hasErrorFlows) healthStatus = "NEEDS_ATTENTION";
    
    const summary = aiResults.codebase && !aiResults.codebase.error ? aiResults.codebase : {
      executive_summary: `System Status: ${healthStatus}. ${criticalIssues ? 'CRITICAL: System crashes detected.' : ''} ${highErrorRate ? `High error rate (${Math.round(errorRate*100)}%).` : ''} ${poorLogging ? 'Poor logging practices detected.' : ''} ${hasPii ? 'Sensitive data exposure found.' : ''} ${hasErrorFlows ? 'Error cascade patterns identified.' : ''} ${totalLogs > 0 ? `Analyzed ${totalLogs} log entries.` : 'No log data available.'}`,
      top_risks: [
        ...(criticalIssues ? [{ risk: "System Crashes", severity: "CRITICAL", description: `${fatalCount} fatal errors detected` }] : []),
        ...(highErrorRate ? [{ risk: "High Error Rate", severity: "HIGH", description: `${Math.round(errorRate*100)}% of logs are errors` }] : []),
        ...(poorLogging ? [{ risk: "Poor Logging Quality", severity: "MEDIUM", description: `Average logging score: ${Math.round(avgLoggingScore)}/100` }] : []),
        ...(hasPii ? [{ risk: "Data Privacy", severity: "HIGH", description: `${piiFindings.length} sensitive data instances found` }] : []),
        ...(hasErrorFlows ? [{ risk: "Error Cascades", severity: "MEDIUM", description: `${aiErrorFlows.length} error flow patterns detected` }] : [])
      ],
      recommended_actions: [
        ...(criticalIssues ? ["Immediately investigate and fix fatal errors", "Implement circuit breakers to prevent cascading failures"] : []),
        ...(highErrorRate ? ["Review error handling patterns", "Add monitoring and alerting for error spikes"] : []),
        ...(poorLogging ? ["Implement structured logging with correlation IDs", "Add error codes and context to log messages"] : []),
        ...(hasPii ? ["Mask or remove sensitive data from logs", "Implement data classification and handling policies"] : []),
        ...(hasErrorFlows ? ["Review error handling chains", "Add proper error boundaries and recovery mechanisms"] : []),
        ...(totalLogs === 0 ? ["Add comprehensive logging to monitor system health"] : [])
      ]
    };

    // Include log statistics as separate fields for easy frontend access
    const logStatistics = {
      totalLogs,
      errorCount: errCount,
      warningCount: warnCount,
      fatalCount,
      infoCount
    };
    
    console.log('[ZIP] Final response data:', {
      riskHeatmap: riskHeatmap.length,
      loggingScores: loggingScores.length,
      piiFindings: piiFindings.length,
      errorFlows: aiErrorFlows.length,
      logStatistics
    });
    
    res.json({ 
      aiResults, 
      riskHeatmap, 
      loggingScores, 
      piiFindings, 
      errorFlows: aiErrorFlows, 
      summary,
      logStatistics  // Add log statistics as separate field
    });
  } catch (error) {
    console.error('Zip analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`AI Analysis endpoints available at /api/ai/analyze, /api/analyze/file, /api/analyze/batch`);
});
