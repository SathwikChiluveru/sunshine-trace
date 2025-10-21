#!/usr/bin/env node
// Reads reports/findings.json -> calls local OpenAI-compatible model -> writes reports/summary.json
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.AI_API_BASE || 'http://genaillm02.devnet.int:11435/v1';
const MODEL    = process.env.AI_MODEL    || 'Qwen/Qwen3-Coder-30B-A3B-Instruct';
const API_KEY  = process.env.AI_API_KEY  || 'local'; // vLLM ignores

function loadFindings() {
  const p = path.resolve('reports/findings.json');
  if (!fs.existsSync(p)) {
    console.error('findings.json not found. Run npm run debug:report first.');
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function chat(system, user) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM error ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content?.trim() || '';
}

(async () => {
  const findings = loadFindings();

  const system = `You are a senior software reliability engineer.
- Use ONLY the supplied JSON findings to produce a concise, actionable summary.
- No markdown, no bullet symbols — just plain text with clear sections.
- Do not invent data. If unknown, say "Unknown".
- Output fields in strict JSON with keys: executive_summary, top_risks, recommended_actions.`;

  const user = `Findings JSON:\n${JSON.stringify(findings)}\n\nReturn strict JSON only.`;

  const content = await chat(system, user);

  // Try to parse; if it fails, wrap as a single-field summary
  let summary;
  try { summary = JSON.parse(content); }
  catch {
    summary = { executive_summary: content, top_risks: [], recommended_actions: [] };
  }

  const out = path.resolve('reports/summary.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${out}`);
})();
