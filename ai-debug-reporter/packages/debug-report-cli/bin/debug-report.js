#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
const logsGlob = args.logs || 'logs/**/*.log';
const srcDir = args.src || '.';
const outDir = args.out || 'reports';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// helper
const nricRegex = /\b[STFG]\d{7}[A-Z]\b/g;
const read = f => fs.readFileSync(f, 'utf-8');
const list = pattern => glob.sync(pattern, { nodir: true });

const nowIso = new Date().toISOString();
const repo = path.basename(process.cwd());

// logs
const logFiles = list(logsGlob);
const sigCounts = new Map();
const piiFindings = [];
let totalErrors = 0;

for (const file of logFiles) {
  const lines = read(file).split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (/(ERROR|FATAL|Exception)/.test(line)) {
      totalErrors++;
      const sig = line.replace(/\d+/g,'#').slice(0,200);
      sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
    }
    const matches = line.match(nricRegex);
    if (matches) {
      matches.forEach(m => piiFindings.push({
        type: 'NRIC', file: path.basename(file), line: idx+1, sample: m,
        action: 'mask last 4 chars'
      }));
    }
  });
}

const recurringProblems = [...sigCounts.entries()]
  .sort((a,b)=>b[1]-a[1])
  .slice(0,50)
  .map(([signature,count]) => ({
    signature, count, files: [], rootCauseHint: 'Triage needed', recommendedFix: 'Add guard / validate inputs'
  }));

function scoreModule(filePath) {
  const content = read(filePath);
  const hasErrorCodes = /ERR_\w+|errorCode|code:\s*\w+/.test(content) ? 1 : 0;
  const hasCorrId    = /correlation|trace[_-]?id|x-request-id/i.test(content) ? 1 : 0;
  const structured   = /{.*"level":\s*"(info|error)".*}/i.test(content) ? 1 : 0;
  return Math.round((hasErrorCodes + hasCorrId + structured) / 3 * 100);
}

const srcFiles = list(`${srcDir}/**/*.{java,ts,js,py}`);
const loggingScores = srcFiles.slice(0,500).map(f => ({
  module: path.relative('.', f), score: scoreModule(f), gaps: []
}));

const errorFlows = recurringProblems.slice(0,5).map(p => ({
  path: ['WARN something', 'ERROR something', 'FATAL crash'],
  stackTop: p.signature.slice(0,80)
}));

const riskHeatmap = loggingScores.slice(0,200).map(m => {
  const errWeight =  recurringProblems
    .filter(p=>m.module && p.signature.includes(path.basename(m.module)))
    .reduce((s,p)=>s+p.count, 0);
  const risk = Math.max(0, Math.min(100, Math.round(0.6*(errWeight>0?80:20)+0.4*(100-m.score))));
  return { module: m.module, risk };
}).sort((a,b)=>b.risk-a.risk).slice(0,200);

const actions = [];
if (piiFindings.length) actions.push({
  title: 'Remove/Mask NRIC from logs', owner: 'backend', diffHint: 'logging middleware / filters'
});
if (totalErrors > 0) actions.push({
  title: 'Add correlationId to error logs', owner: 'backend', diffHint: 'logging config'
});

const findings = {
  runMeta: { repo, ts: nowIso, commit: process.env.GIT_COMMIT || 'unknown' },
  riskHeatmap, recurringProblems, errorFlows, loggingScores, piiFindings, actions
};
fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(findings, null, 2));
console.log(`Wrote ${path.join(outDir,'findings.json')}`);
