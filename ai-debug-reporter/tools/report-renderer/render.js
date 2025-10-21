#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const inFile = process.argv[2] || 'reports/findings.json';
const outHtml = process.argv[3] || 'reports/debug_report.html';
const tpl = fs.readFileSync(path.join(__dirname, 'templates', 'report.html.ejs'), 'utf-8');
const data = JSON.parse(fs.readFileSync(inFile, 'utf-8'));

// Try to load reports/summary.json so the report can render offline
let aiSummary = { executive_summary: "Summary unavailable.", top_risks: [], recommended_actions: [] };
try {
  const summaryPath = path.join(process.cwd(), 'reports', 'summary.json');
  if (fs.existsSync(summaryPath)) {
    aiSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  }
} catch(e) {
  console.warn('Failed to load summary.json:', e.message);
}

// Add aiSummary to the data passed to the template
data.aiSummary = aiSummary;

fs.writeFileSync(outHtml, ejs.render(tpl, data, { rmWhitespace: true }));
console.log(`Wrote ${outHtml}`);
