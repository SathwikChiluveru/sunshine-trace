# Sunshine Trace

## Project Overview
Sunshine Trace is a full-stack observability assistant that turns raw application logs into an AI-augmented incident report. Teams ingest log files, zipped codebases, or paste log snippets through a Next.js frontend; an Express backend enriches the data with static heuristics and large language model (LLM) analysis before streaming structured findings back to the UI. The project ships with:

- **Frontend:** Next.js 15 (React 18, App Router), Tailwind CSS, Radix UI primitives, lucide-react icons, JSZip, react-hook-form, recharts.
- **Backend:** Node.js 18+, Express 5, cors, dotenv, adm-zip, minimist, glob, EJS templating, plus an AI pipeline targeting OpenRouter (or a private vLLM endpoint) via the OpenAI-compatible `fetch` API.

## Features
### Frontend
- Guided ingestion flow (`frontend/app/page.tsx`) for pasting logs, uploading multiple files, or mounting ZIP archives with per-file selection (`ZipFileExplorer` + JSZip).
- Client-side log parsing (`lib/log-parser.ts`) with PII detection, error clustering, and derived service health metrics that persist in `localStorage` for offline navigation.
- Deep-dive report UI (`frontend/app/report/page.tsx`) combining findings, live AI responses, and locally cached metrics across sections (Summary, Logging Quality, Error Flows, Sensitive Data,  Recommendations).
- Allows users or teams to upload custom AI guidelines that the system automatically follows.

### Backend
- REST API (`ai-debug-reporter/index.js`) serving generated reports (`/api/findings`, `/api/summary`, `/api/summary/metrics`) and brokering AI analyses for single files, batches, or zipped projects.
- Zip ingestion endpoint that unpacks archives, filters text/code files, enforces a 1 MiB cap, then orchestrates per-file LLM calls with deterministic fallbacks (regex-based PII detection, logging quality heuristics).
- AI analyzer (`tools/ai-analyzer/analyzer.js`) that normalizes responses from OpenRouter or an internal vLLM stack with graceful error handling.
- CLI toolkit: `packages/debug-report-cli` (log heuristics → `reports/findings.json`), AI summarizer (`tools/ai-summarizer/summarizer.js` → `reports/summary.json`), and EJS report renderer.

## Project Architecture
```text
sunshine-trace/
├── frontend/                     # Next.js app
│   ├── app/                      # Ingestion and report routes
│   ├── components/               # UI, sections, upload widgets
│   ├── hooks/                    # Toasting, responsive helpers
│   ├── lib/                      # Log parser, AI client, zip helpers
│   └── styles/                   # Tailwind + theme tokens
├── ai-debug-reporter/            # Express API + reporting toolkit
│   ├── index.js                  # REST server & analysis endpoints
│   ├── tools/                    # AI analyzer, summarizer, renderer
│   ├── packages/                 # debug-report CLI (glob + heuristics)
│   └── reports/                  # Generated findings & summaries
└── test-fixtures/                # Placeholder fixtures for local runs
```

- **Cross-tier communication:** The frontend reads findings over REST. Default base URL is `http://localhost:5000`; override via `NEXT_PUBLIC_API_BASE`. The Report page optimistically uses client-side caches, then fetches `/api/findings`, `/api/summary`, `/api/summary/metrics`, or `/api/analyze/*` as needed.
- **Generated artifacts:** The backend expects `reports/findings.json` and `reports/summary.json`. They originate from `npm run debug:report` (heuristics) and `npm run report:summary` (LLM summary). The `/api/analyze/zip` endpoint can also return enriched aggregations without regenerating static files.
- **Configuration & secrets:** Backend loads `.env` (`OPENROUTER_API_KEY`, optional `OPENROUTER_API_BASE`, `OPENROUTER_MODEL`, `AI_API_BASE`, `AI_MODEL`, `AI_API_KEY`). Replace the sample key in source control with your own secret before production use.

## Frontend Documentation
### Pages & State Flow
- `app/page.tsx` – Landing workflow that accepts text, individual files, or ZIP archives. It parses logs locally (`parseLogFile`), persists structured output in `localStorage`, and conditionally invokes backend AI endpoints before redirecting to `/report`.
- `app/report/page.tsx` – Report dashboard that stitches together local parses, backend findings, and AI responses. It maintains section-level state, fetch gates based on previously saved analysis types, and includes JSON extraction helpers to clean LLM responses.

### Key Components
- `components/header.tsx` – Fixed masthead with theme toggle and export actions (HTML snapshot, JSON bundle, print) implemented via `lib/export-utils.ts`.
- `components/sidebar.tsx` – Scroll spy navigation with IntersectionObserver to synchronize active sections.
- Section components under `components/sections/`:
  - `SummarySection` aggregates log statistics, remote metrics, and historical uploads (via `/api/summary/metrics`) and drives `HistoricalTrends`.
  - `LoggingQualitySection` renders merged logging scores (AI + heuristics) with visual cues.
  - `ErrorFlowSection` surfaces call-chain diagrams (`CallChainDiagram`) and raw logs for individual cascades.
  - `SensitiveDataSection` lists PII hits and suggested mitigations.
  - `RecommendationsSection` normalizes AI recommendations and optional code fixes, complete with filters and copy-to-clipboard interactions.
- Optional AI-focused sections (`ai-sensitive-data-section.tsx`, `ai-vulnerability-section.tsx`, `ai-summary-section.tsx`) hydrate when AI payloads are present in storage.

### Utilities & Data Flow
- `lib/log-parser.ts` – Core parser with regex-based PII detection, error clustering, service quality scoring, and sample fallback data mirroring CLI output.
- `lib/ai-analyzer.ts` – Frontend client to call `/api/ai/analyze` and helper to format AI responses.
- `lib/zip-utils.ts` – JSZip wrapper to preview, filter, and toggle files in uploaded archives.
- Styling is defined in `styles/globals.css` via Tailwind CSS v4 with custom color tokens and dark-mode variant.

### Frontend Commands
```bash
cd frontend
npm install          # or pnpm install
npm run dev          # launches Next.js on http://localhost:3000
npm run build && npm run start   # production build & serve
npm run lint         # optional linting
```
Set `NEXT_PUBLIC_API_BASE` in `.env.local` if the backend runs on a non-default host.

## Backend Documentation
### Server & Routes (`ai-debug-reporter/index.js`)
| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| GET | `/api/findings` | Serve JSON generated by the CLI (`reports/findings.json`). | Requires file to exist; returns 500 otherwise. |
| GET | `/api/summary` | Serve AI summary (`reports/summary.json`). | Used to populate recommendations & executive summary. |
| GET | `/api/summary/metrics` | Return metrics history. | Drives `HistoricalTrends`. |
| POST | `/api/ai/analyze` | Proxy arbitrary AI analysis (`performAnalysis(type, data)`). | Supports `sensitive_data`, `vulnerabilities`, `code_quality`, `risk_assessment`, `error_flow`, `codebase`. |
| POST | `/api/analyze/file` | Analyze a single uploaded file. | Detects file type, runs selected AI analyses, and returns merged results. |
| POST | `/api/analyze/batch` | Iterate over multiple files, running targeted analyses. | Respects `selectedTypes`; includes fallback heuristics. |
| POST | `/api/analyze/zip` | Accept base64 ZIP payload, unpack to `/tmp`, orchestrate per-file AI analysis, and aggregate results with fallback metrics. | Enforces 1 MiB cap and cleanses sensitive data heuristically. |

- **CORS:** Restricted to `http://localhost:3000`, and `http://127.0.0.1:3000`. Adjust `allowedOrigins` when deploying elsewhere.
- **PII & Logging Fallbacks:** If AI responses are missing or malformed, regex scanners and deterministic scoring ensure the frontend still receives meaningful results.
- **Zip processing:** Uses `adm-zip` to extract archives into `ai-debug-reporter/tmp/zip_<timestamp>`, ignoring `node_modules` and hidden folders.
- **Server launch:** `node index.js` (no npm `start` script defined). Defaults to port 5000.

### AI Tooling (`tools/`)
- `ai-analyzer/analyzer.js` – Central orchestrator that prepares prompts, logs telemetry, calls the configured LLM, normalizes responses, and exports helper functions. Requires Node 18+ for global `fetch`.
- `ai-summarizer/summarizer.js` – Converts `reports/findings.json` into an AI-generated `reports/summary.json`.
- `report-renderer/render.js` + `templates/report.html.ejs` – Produces a static HTML report for offline sharing.

### Debug Report CLI (`packages/debug-report-cli`)
Command-line tool invoked via `npm run debug:report`. It scans log files (glob configurable), fingerprints recurring errors, detects Singapore NRIC numbers, scores logging modules, and writes `reports/findings.json`.

### Backend Commands
```bash
cd ai-debug-reporter
npm install
cp .env.example .env   # create this file; set AI credentials
npm run debug:report   # populate reports/findings.json from logs/**/*.log
npm run report:summary # optional AI summary (requires AI_API_* or OpenRouter)
npm run report:render  # render HTML report from findings + summary
node index.js          # start Express API on port 5000
```
Environment variables:
- `OPENROUTER_API_KEY` (required for OpenRouter).
- `OPENROUTER_API_BASE`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME` (optional overrides).
- `AI_API_BASE`, `AI_MODEL`, `AI_API_KEY` (for internal vLLM; uncomment the DEVNET constants in `analyzer.js` if using this path).

## Setup & Installation
1. **Prerequisites**
   - Node.js ≥ 18.18 (Next.js 15 requirement and for native fetch in Node).
   - npm, pnpm, or yarn (examples use npm).
   - Optional: OpenRouter API key or internal OpenAI-compatible endpoint.
2. **Backend**
   - `cd ai-debug-reporter && npm install`.
   - Create `.env` with `OPENROUTER_API_KEY=<your key>` (remove the checked-in placeholder).
   - place log files under `logs/` and run `npm run report:all` to hydrate `reports/`.
   - `node index.js` to launch the API.
3. **Frontend**
   - `cd frontend && npm install`.
   - Add `.env.local` with `NEXT_PUBLIC_API_BASE=http://localhost:5000` when running locally.
   - `npm run dev` to open the ingestion UI on `http://localhost:3000`.
4. **Production**
   - Backend: provision a process manager (PM2, systemd) for `node index.js` or wrap in a custom start script; ensure `reports/` is writable.
   - Frontend: `npm run build && npm run start`, or deploy via Vercel with the API base pointing to your Express host.

## Usage Examples
### Interacting through the UI
1. Visit `http://localhost:3000`.
2. Paste logs or drop files/ZIPs into the upload area.
3. Select analysis types (Logging Quality, Error Flow, Sensitive Data, Recommendations).
4. Click **Generate Report**. The app parses logs locally and posts to `/api/analyze/*` as required.
5. Navigate sections in `/report`, export the snapshot, or revisit later thanks to `localStorage` caching.

### API Examples
Analyze a single file:
```bash
curl -X POST http://localhost:5000/api/analyze/file \
  -H "Content-Type: application/json" \
  -d '{
        "fileName": "pasted-logs.txt",
        "fileType": "log",
        "content": "2025-10-30 02:10:00 ERROR EpisodeService - NullPointerException\\n",
        "selectedTypes": ["sensitive-data", "logging-quality", "recommendations"]
      }'
```

Run batch analysis across mixed files:
```bash
curl -X POST http://localhost:5000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
        "selectedTypes": ["sensitive-data", "recommendations"],
        "files": [
          { "fileName": "app.log", "fileType": "log", "content": "ERROR ..."},
          { "fileName": "handler.ts", "fileType": "ts", "content": "export const handler = () => {/* ... */};" }
        ]
      }'
```

Upload a ZIP (base64-encoded) for holistic analysis:
```bash
curl -X POST http://localhost:5000/api/analyze/zip \
  -H "Content-Type: application/json" \
  -d "{\"zipBase64\":\"$(base64 -w0 my-codebase.zip)\"}"
```
Responses include `aiResults`, `riskHeatmap`, `loggingScores`, `piiFindings`, `errorFlows`, and `summary`.

## Code Documentation
### Frontend Extractor (`frontend/app/report/page.tsx`)
```tsx
function extractJsonBlock(text: string): any | null {
  if (!text || typeof text !== "string") return null;
  // Prefer fenced ```json``` blocks; this preserves structured LLM payloads verbatim.
  const fenceJson = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenceJson?.[1]) {
    return JSON.parse(fenceJson[1]);
  }
  // Accept generic code fences before falling back to looser pattern scans.
  const fenceAny = text.match(/```\s*([\s\S]*?)\s*```/);
  if (fenceAny?.[1]) {
    return JSON.parse(fenceAny[1]);
  }
  // If no fences exist, attempt to locate inline array/object literals.
  const jsonArrayMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonArrayMatch) {
    return JSON.parse(jsonArrayMatch[0]);
  }
  const jsonObjectMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonObjectMatch) {
    return JSON.parse(jsonObjectMatch[0]);
  }
  // Final fallback: treat the whole string as JSON, tolerating plain-text responses.
  return JSON.parse(text);
}
```

### Backend File Analysis (`ai-debug-reporter/index.js`)
```js
app.post('/api/analyze/file', async (req, res) => {
  const { content, fileName, fileType, selectedTypes } = req.body;
  if (!content) return res.status(400).json({ error: 'No content provided' });

  const detectedType = fileType || fileName?.split('.').pop() || 'unknown';
  const { performAnalysis } = require('./tools/ai-analyzer/analyzer');
  const results = {};

  // Run PII scanning on log-like files or code that clearly logs.
  const isLogFile = detectedType === 'log' || /ERROR|INFO/.test(content);
  const hasLoggingCode = /console\.log|logger|log(Error|Info)/.test(content);
  if ((!selectedTypes || selectedTypes.includes('sensitive-data')) && (isLogFile || hasLoggingCode)) {
    results.sensitiveData = await performAnalysis(content, 'sensitive_data');
  }

  // For code files, layer vulnerability and logging-quality checks.
  if (['js','ts','py','java','cpp','c','cs','rb','go','php'].includes(detectedType)) {
    if (!selectedTypes || selectedTypes.includes('recommendations')) {
      results.vulnerabilities = await performAnalysis({ content, fileType: detectedType }, 'vulnerabilities');
    }
    if (!selectedTypes || selectedTypes.includes('logging-quality')) {
      results.codeQuality = await performAnalysis({ content, fileType: detectedType }, 'code_quality');
    }
  }

  res.json({
    fileName,
    fileType: detectedType,
    analysis: results,
    selectedTypes: selectedTypes || [],
    timestamp: new Date().toISOString()
  });
});
```

## Best Practices & Notes
- Replace the committed sample `OPENROUTER_API_KEY` immediately; treat `.env` as sensitive and list it in `.gitignore`. The system primarily uses Devnet vLLM, but if it’s unavailable, you can comment out the relevant section and use OpenRouter as a fallback.
- `reports/` contents are generated artifacts—avoid committing production data containing PII. Redirect output to a secure storage bucket if needed.
- The zero-risk fallback logic is deterministic; monitor logs for `[AI]` prefixed messages to understand when the LLM fails and heuristics take over.
- When enabling the internal vLLM path, uncomment and validate the `DEVNET_*` constants inside `analyzer.js`; otherwise OpenRouter must remain configured.

## License and Credits
- Backend `package.json` declares the **ISC** license, but no root `LICENSE` file is present—add one before distributing.
- AI prompts are tuned for OpenRouter’s `qwen3-30b-a3b-instruct-2507` model; credit and adhere to OpenRouter’s usage policies.

> _Maintained by the Sunshine Trace team._
