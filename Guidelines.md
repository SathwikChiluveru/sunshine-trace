**RAG Guidelines --- Logs, Sensitive Information, Breakpoints & Code Recommendations\
**Purpose: guidance for building a safe, accurate Retrieval-Augmented Generation (RAG) system that ingests code + logs, detects sensitive information, suggests breakpoints and logging points, and produces context-aware code recommendations.

**1\. Goals & scope\
Primary goals**\
Detect and surface sensitive information in logs and source files.\
Recommend where to insert logs and breakpoints to improve observability and debugging.\
Provide code recommendations (fixes, refactors, tests) grounded in the project's codebase and historical logs.\
Avoid disclosure of secrets/PII and minimize hallucinations.\
**Scope**\
Inputs: source files, runtime logs, stack traces, config files, architecture docs.\
Outputs: redacted summaries, prioritized breakpoint/logging suggestions, code patches/hunks, recommended tests, security/PII alerts.\
Not in scope: automated merging or direct deployment without human review; privileged key management (use vaults instead).

**2\. Safety & privacy first\
2.1 Treat all ingested data as sensitive\
**Assume logs and code may contain credentials, PII, tokens, UUIDs, IPs, file paths, debug prints.\
Do not output raw secrets or full PII. Always redact before presenting to users (see redaction rules).\
**2.2 Redaction policy (must)\
**Before any model response, scan for and redact:\
Secrets: API keys, tokens, private keys, OAuth tokens.\
Credentials: usernames + plaintext passwords.\
PII: full names paired with email/phone, SSNs, national IDs, credit card numbers.\
Internal IPs, hostnames that map to private resources (when policy requires).\
Replace redacted values with deterministic tokens like `<REDACTED:SECRET>`, `<REDACTED:EMAIL>`, `<REDACTED:IP>`.\
For user-facing summaries include counts/types of redacted items and contexts (e.g., "3 redacted API keys found in `auth.go` at lines 42--45").\
**2.3 Logging of RAG internals\
**Records of queries and retrieved contexts are sensitive. Store minimal metadata for audit (timestamps, hashed identifiers) and encrypt at rest.\
Access to RAG logs should be role-based and auditable.

**3\. Detection & classification\
3.1 Sensitive-entity detectors\
**Combine deterministic rules (regexes) + ML-based NER for robustness.\
Recommended categories to label:\
`SECRET`, `API_KEY`, `TOKEN`, `PRIVATE_KEY`\
`EMAIL`, `PHONE`, `SSN`, `CC_NUMBER`\
`INTERNAL_IP`, `HOSTNAME`, `PATH`\
`PERSONAL_NAME` (cautiously)\
`CREDENTIAL` (username/password pairs)\
Use multiple signals: token patterns, surrounding words (e.g., `password:`, `Authorization:`), file path (e.g., `~/.aws/credentials`).\
**3.2 Confidence & human escalation\
**Attach confidence score to each detected item.\
If confidence < threshold (e.g., 0.6), mark as *possible* and recommend human review.\
High-confidence secrets produce immediate alerts and recommended rotation.

**4\. Redaction & presentation rules\
**Never present raw secret values back to the user or to downstream models.\
If a user legitimately needs to see an exact secret, require an audit-approved workflow and explicit permission (out of scope for RAG responses).\
When suggesting changes that involve secrets (e.g., "move key to env var"), show example placeholders, not actual values:\
Good: `os.Getenv("MY_SERVICE_API_KEY")`\
Bad: `api_key = "abcd-1234-SECRET"`

**5\. Retrieval, indexing & memory\
5.1 Indexing\
**Index code and logs separately:\
**Code index**: file path, language, function/class boundaries, docstrings, last-modified timestamp.\
**Log index**: timestamp, level, service, host, trace-id, message, stack trace.\
Store fingerprints (hashes) of raw file contents to detect stale retrievals.\
**5.2 Embeddings & chunking\
**Chunk files by logical boundaries (functions, classes) for code; by time-range / request-id for logs.\
Preserve nearby context when chunking (e.g., include 10--20 lines of surrounding code).\
Use semantic embeddings with metadata; include `confidence`, `last_updated`, `source_type` tags.\
**5.3 Retrieval strategy\
**Retrieval should prioritize:\
Same file/function where log or error originated.\
Recent logs matching trace-id/request-id.\
Related files (config, environment), tests. > Sathwik: Return top-N (tune N) candidates and include provenance (file + location + timestamp).

**6\. Prompting & context management for RAG\
6.1 Context window rules\
**Always give the model:\
A short, structured *context header* (project name, file paths, error timestamps).\
Top-k retrieved code chunks + log chunks, each with provenance and redaction markers.\
The exact user request or task.\
Use structured prompts, not free-form. Example header: `PROJECT: payments-service\
TASK: Suggest breakpoint(s) for Investigating NullPointerException in payments.go\
RETRIEVED: payments.go:lines 120-160 (function: ProcessPayment), logs: 2025-10-10 14:02:05 ERROR trace-id=abc123\
`\
**6.2 Prompt templates (examples)\
Investigate error**: `You are given:\
- Error: <error message and stack trace (redacted)>\
- Relevant code chunks (with file path & lines)\
- Recent logs with trace-id (redacted values)\
Task: Summarize likely root causes (3), suggest concrete breakpoints and logging statements to add (include file, exact line position, log level, and a one-line rationale). Use placeholders for secrets.\
`\
**Add logging**: `Given function <name> and its surrounding code, propose a minimal set of logging statements to:\
- capture inputs/outputs,\
- record errors with stack,\
- avoid logging secrets.\
Include suggested log format and example log line (with placeholders).\
`\
**6.3 System vs. user instructions\
**System instructions must include redaction and safe-output constraints.\
Always instruct the model to **not hallucinate**: if evidence is insufficient, say "insufficient information" and list what to collect.

**7\. Producing code recommendations\
7.1 Code-change style guidelines\
**Use small, diff-like hunks rather than full-file rewrites.\
Prefer changes that are:\
Minimal and reversible.\
Annotated with comments explaining reason and link to the log/trace-id.\
Always include tests or a testing plan for non-trivial changes.\
**7.2 Templates for suggested changes\
**Each recommendation should include:\
**Title**: short description\
**Files/locations**: file paths and line numbers\
**Diff**: unified diff snippet (`---`/`+++`/`@@`)\
**Rationale**: 1--2 lines linking to log evidence\
**Tests**: suggested unit/integration test outline\
**Rollout**: can it be hot-swapped? Feature flag? Manual review required?\
**7.3 Example (logging insertion)\
**`Title: Add input validation logging to ProcessPayment\
Files:\
- payments.go: func ProcessPayment (lines 120-160)\
Diff:\
@@ -130,6 +130,12 @@ func ProcessPayment(req Request) error {\
- // existing code\
+ // added: log incoming request metadata (redact PII)\
+ logger.Infof("ProcessPayment start trace=%s user_id=%s amount=%f",\
+ req.TraceID, redact(req.UserID), req.Amount)\
+ defer logger.Infof("ProcessPayment end trace=%s status=%s", req.TraceID, status)\
Rationale: Error at 2025-10-10 14:02:05 references trace-id abc123; no input logs exist for this request.\
Tests: Unit test that logger receives expected call (use test logger with buffer), assert redact(req.UserID) format.\
`\
**8\. Breakpoint & instrumentation heuristics\
8.1 Where to insert breakpoints\
**Prefer instrumentation near:\
Entry points (API handlers, message consumers).\
Points where external calls are made (DB, HTTP, RPC).\
Exception handling / catch blocks.\
Data transformation boundaries (parsing, serialization).\
Areas indicated by recent errors or high latency logs.\
**8.2 Types of logging levels\
**`TRACE` --- fine-grained developer debug (disable in prod).\
`DEBUG` --- inputs/flow in dev or for short-lived traces.\
`INFO` --- high-level operations started/completed, approvals.\
`WARN` --- recoverable issues, retries.\
`ERROR` --- failures that affect request result; include error code & trace-id.\
`CRITICAL`/`FATAL` --- system-level failures.\
**8.3 Breakpoint suggestions format\
**For each suggested breakpoint:\
File, function, line.\
Suggested log/trace content (fields).\
Suggested level.\
Rationale linking to logs.\
Estimated privacy score (High/Medium/Low) --- i.e., chance of logging PII.

**9\. Minimizing hallucination & ensuring provenance\
9.1 Always provide provenance\
**Every factual claim (root cause, file location) must include which retrieved chunk(s) support it. > Sathwik: When making probabilistic claims, provide confidence and what evidence would increase confidence.\
**9.2 When to abstain\
**If the retrieval set doesn't include code around an error location, respond:\
"Insufficient context. I could not find function X or trace-id Y. Provide file or more logs."\
Offer explicit steps to collect additional data (e.g., "include stack trace lines 5--12 or the request ID").

**10\. QA, tests, and evaluation\
10.1 Evaluation metrics\
Precision on secret detection** (false positives/negatives)\
**Recall on secret detection**\
**Accuracy of breakpoint suggestions** (human rating)\
**Usefulness of code recommendations** (developer acceptance rate)\
**Time-to-issue-resolve** before/after RAG integration (if measurable)\
**Hallucination rate**: percent of outputs requiring correction.\
**10.2 Human-in-the-loop\
**All code changes or security-related findings must be triaged by developers/security engineers before merging.\
Provide UI that displays suggested diffs with "Approve / Request changes / Reject".\
**10.3 Continuous improvement\
**Capture feedback signals:\
Developer acceptance or edits to suggestions.\
Corrected redaction misses.\
Missed breakpoints found during incident postmortems.\
Feed back anonymized examples into retraining for classification models and prompt improvement.

**11\. Operational & security considerations\
**Use least privilege for any connectors (e.g., repo access, log storage). Prefer read-only tokens.\
For production deployments:\
Audit all accesses.\
Rotate keys regularly.\
Encrypt indexes and caches at rest.\
Rate-limit outputs to avoid flood of sensitive messages.

**12\. UI / UX recommendations for developer consumption\
**Display retrieved context on-demand; collapsed by default with provenance.\
Show redaction summary at the top: counts & types of redacted items.\
Allow one-click copy of suggested diff (not auto-apply).\
Provide a "Why this suggestion?" expandable explanation that links log lines to code lines.\
Provide a "safety score" for each suggestion: privacy risk + confidence.

**13\. Example workflows\
13.1 Developer: Investigate an error\
**Dev pastes error + trace-id + timestamp.\
RAG retrieves logs and code; scans & redacts secrets.\
RAG returns:\
Short root-cause hypothesis (top 3, with provenance).\
2--3 breakpoint/logging recommendations with diffs.\
Suggested unit test changes.\
Dev reviews, applies, runs tests.\
**13.2 Security: Search for leaked keys\
**Security runs a sensitive-entity scan across indices.\
RAG returns list of findings with file paths, last-seen timestamps, recommended remediation (rotate key, invalidate tokens), and suggested commit diffs to remove secret and use secret manager.

**14\. Developer-facing templates & quick-checklists\
14.1 Quick redaction checklist before outputting\
** Scan for regex-based secrets.\
Run NER for PII.\
Replace values with `<REDACTED:TYPE>`.\
Show counts per type and locations.\
If secrets found, add remediation steps.\
**14.2 Breakpoint suggestion checklist\
** Is an entry-point present?\
Is there an external call nearby?\
Is there recent error log referencing this code?\
Can this logging be done without exposing secrets?\
Provide suggested log level and a one-line rationale.

**15\. Examples & snippets\
15.1 Regex examples (common patterns)\
**Use these in combination with NER and context; tune to reduce false positives.\
API key-ish: `(?i)(api_key|apikey|apiKey|access_token|secret)[\s:=]+"?([A-Za-z0-9\-_]{16,})"?`\
JWT-like: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`\
AWS Access Key ID: `AKIA[0-9A-Z]{16}`\
Private key start: `-----BEGIN PRIVATE KEY-----`\
Email: `[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`\
IP (v4): `\b(?:\d{1,3}\.){3}\d{1,3}\b` (post-filter private ranges when necessary)\
Credit card (luhn check recommended): `\b(?:\d[ -]*?){13,16}\b` + Luhn\
**15.2 Example prompt to the model (final template)\
**`SYSTEM: DO NOT OUTPUT RAW SECRETS OR PII. REDACT ANYTHING MATCHING SECRET OR PII PATTERNS. ALWAYS INCLUDE PROVENANCE LINES.

USER: Given the following error and code, suggest up to 3 likely root causes, and provide concrete breakpoint/log insertions (file + line + log statement + level).` > Sathwik: `Show diffs, tests to add, and any security concerns. Do not guess beyond provided context.

[ERROR]\
<redacted stack trace>

[RETRIEVED CODE CHUNK 1]\
file: payments.go lines: 120-160\
<code (redacted)>

[RETRIEVED LOGS]\
- 2025-10-10T14:02:05 ERROR service=payments trace-id=abc123 message="panic: nil pointer"\
- ...

END\
`\
**16\. Do's & Don'ts (short)\
Do**\
Do redact before showing outputs.\
Do include provenance for every claim.\
Do prefer small, testable code diffs.\
Do route security-sensitive items for human review.\
**Don't**\
Don't output or embed raw secrets/PII.\
Don't generate broad sweeping refactors without tests.\
Don't make definitive root-cause claims without evidence.

**17\. Appendix --- Useful reminders\
**Always attach trace-ids and timestamps when available.\
Add comments to suggested code with `// RAG-SUGGESTION: <id>` for traceability.\
Maintain a changelog for prompt/template updates and model versions used.\
Periodically run adversarial tests for redaction bypass patterns.