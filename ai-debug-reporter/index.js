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
    const { content, fileName, fileType } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
    const results = {};

    // Determine file type if not provided
    const detectedType = fileType || fileName?.split('.').pop() || 'unknown';

    // Perform multiple analyses based on file type
    if (detectedType === 'log' || content.includes('ERROR') || content.includes('INFO')) {
      // Log file - analyze for sensitive data and error patterns
      results.sensitiveData = await performAnalysis(content, 'sensitive_data');
    }

    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'php'].includes(detectedType)) {
      // Code file - analyze for vulnerabilities and quality
      results.vulnerabilities = await performAnalysis({ content, fileType: detectedType }, 'vulnerabilities');
      results.codeQuality = await performAnalysis({ content, fileType: detectedType }, 'code_quality');
    }

    res.json({
      fileName,
      fileType: detectedType,
      analysis: results,
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
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
    const results = [];

    for (const file of files) {
      try {
        const fileResults = { fileName: file.fileName, fileType: file.fileType };
        
        if (file.content) {
          if (file.fileType === 'log' || file.content.includes('ERROR')) {
            fileResults.sensitiveData = await performAnalysis(file.content, 'sensitive_data');
          }
          
          if (['js', 'ts', 'py', 'java', 'cpp', 'c'].includes(file.fileType)) {
            fileResults.vulnerabilities = await performAnalysis({ content: file.content, fileType: file.fileType }, 'vulnerabilities');
            fileResults.codeQuality = await performAnalysis({ content: file.content, fileType: file.fileType }, 'code_quality');
          }
        }
        
        results.push(fileResults);
      } catch (error) {
        console.error(`Error analyzing file ${file.fileName}:`, error);
        results.push({ fileName: file.fileName, error: error.message });
      }
    }

    res.json({
      results,
      totalFiles: files.length,
      successfulAnalyses: results.filter(r => !r.error).length,
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

    // Limit total size (e.g., 1 MB) to keep prompts reasonable
    let total = 0;
    const limited = [];
    for (const f of files) {
      const size = Buffer.byteLength(f.content, 'utf-8');
      if (total + size > 1024*1024) break;
      limited.push(f);
      total += size;
    }

    const { performAnalysis } = require('./tools/ai-analyzer/analyzer');

    // Aggregate AI results
    const aiResults = {
      codebase: await performAnalysis({ files: limited.map(({fileName,fileType})=>({fileName,fileType})) }, 'codebase'),
      modules: []
    };

    for (const f of limited) {
      const mod = { fileName: f.fileName };
      try {
        mod.vulnerabilities = await performAnalysis({ content: f.content, fileType: f.fileType }, 'vulnerabilities');
      } catch {}
      try {
        mod.codeQuality = await performAnalysis({ content: f.content, fileType: f.fileType }, 'code_quality');
      } catch {}
      aiResults.modules.push(mod);
    }

    // Fallback analyzers (non-AI) to provide dynamic data even if AI fails
    function scoreModule(content){
      const hasErrorCodes = /ERR_\w+|errorCode|code:\s*\w+/i.test(content) ? 1 : 0;
      const hasCorrId    = /correlation|trace[_-]?id|x-request-id/i.test(content) ? 1 : 0;
      const structured   = /{[^}]*"level"\s*:\s*"(info|error|warn|debug)"[^}]*}/i.test(content) ? 1 : 0;
      return Math.round((hasErrorCodes + hasCorrId + structured) / 3 * 100);
    }

    const loggingScores = limited
      .filter(f => ['js','ts','tsx','py','java','go','rb','php','cs'].includes((f.fileType||'').toLowerCase()))
      .map(f => ({ module: f.fileName, score: scoreModule(f.content), gaps: [] }));

    // PII findings from any file + line numbers for .log files
    const piiFindings = [];
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

    // Error flows from .log files: simple WARN -> ERROR/FATAL clustering within window
    const errorFlows = [];
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

    // Risk heatmap: prefer AI risk_score; otherwise derive from loggingScores
    let riskHeatmap = (aiResults.modules || []).map(m => ({
      module: m.fileName,
      risk: Math.min(100, Math.max(0, Math.round((m?.vulnerabilities?.risk_score || 0))))
    }));
    if (riskHeatmap.length === 0) {
      riskHeatmap = loggingScores.map(m => ({ module: m.module, risk: Math.max(0, 100 - m.score) }));
    }

    // Summary fallback
    const anyLog = logFiles[0]?.content || '';
    const errCount = (anyLog.match(/\bERROR\b/g) || []).length;
    const warnCount = (anyLog.match(/\bWARN\b/g) || []).length;
    const fatalCount = (anyLog.match(/\bFATAL\b/g) || []).length;
    const summary = aiResults.codebase && !aiResults.codebase.error ? aiResults.codebase : {
      executive_summary: `AI analysis unavailable or partial. Derived from uploaded logs: Errors=${errCount}, Warnings=${warnCount}, Fatals=${fatalCount}.`,
      top_risks: [],
      recommended_actions: []
    };

    res.json({ aiResults, riskHeatmap, loggingScores, piiFindings, errorFlows, summary });
  } catch (error) {
    console.error('Zip analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`AI Analysis endpoints available at /api/ai/analyze, /api/analyze/file, /api/analyze/batch`);
});