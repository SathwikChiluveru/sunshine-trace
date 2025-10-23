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
    const exts = ['.js','.ts','.tsx','.py','.java','.go','.rb','.php','.cs','.json','.md'];
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

    // Build a simple findings-like shape for the frontend
    const riskHeatmap = (aiResults.modules || []).map(m => ({
      module: m.fileName,
      risk: Math.min(100, Math.max(0, Math.round((m?.vulnerabilities?.risk_score || 0))))
    }));

    const summary = aiResults.codebase || { executive_summary: 'AI codebase summary unavailable', top_risks: [], recommended_actions: [] };

    res.json({ aiResults, riskHeatmap, summary });
  } catch (error) {
    console.error('Zip analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`AI Analysis endpoints available at /api/ai/analyze, /api/analyze/file, /api/analyze/batch`);
});