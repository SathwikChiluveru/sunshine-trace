# RAG Guidelines — Logs, Sensitive Information, Breakpoints & Code Recommendations

**Purpose:**  
Guidance for building a safe, accurate Retrieval-Augmented Generation (RAG) system that ingests code + logs, detects sensitive information, suggests breakpoints and logging points, and produces context-aware code recommendations.

---

## 1. Goals & Scope

### Primary Goals
- Detect and surface sensitive information in logs and source files.
- Recommend where to insert logs and breakpoints to improve observability and debugging.
- Provide code recommendations (fixes, refactors, tests) grounded in the project's codebase and historical logs.
- Avoid disclosure of secrets/PII and minimize hallucinations.

### Scope
- **Inputs:** Source files, runtime logs, stack traces, config files, architecture docs.
- **Outputs:** Redacted summaries, prioritized breakpoint/logging suggestions, code patches/hunks, recommended tests, security/PII alerts.
- **Not in scope:** Automated merging or direct deployment without human review; privileged key management (use vaults instead).

---

## 2. Safety & Privacy First

### 2.1 Treat All Ingested Data as Sensitive
- Assume logs and code may contain credentials, PII, tokens, UUIDs, IPs, file paths, and debug prints.
- Do not output raw secrets or full PII. Always redact before presenting to users (see redaction rules).

### 2.2 Redaction Policy (Must)
Before any model response, scan for and redact:
- **Secrets:** API keys, tokens, private keys, OAuth tokens.
- **Credentials:** Usernames + plaintext passwords.
- **PII:** Full names paired with email/phone, SSNs, national IDs, credit card numbers.
- **Internal IPs**, hostnames that map to private resources (when policy requires).

Replace redacted values with deterministic tokens like `<REDACTED:SECRET>`, `<REDACTED:EMAIL>`, `<REDACTED:IP>`.  
For user-facing summaries, include counts/types of redacted items and contexts (e.g., "3 redacted API keys found in `auth.go` at lines 42–45").

### 2.3 Logging of RAG Internals
- Records of queries and retrieved contexts are sensitive. Store minimal metadata for audit (timestamps, hashed identifiers) and encrypt at rest.
- Access to RAG logs should be role-based and auditable.

---

## 3. Detection & Classification

### 3.1 Sensitive-Entity Detectors
- Combine deterministic rules (regexes) + ML-based NER for robustness.
- Recommended categories to label:
  - `SECRET`, `API_KEY`, `TOKEN`, `PRIVATE_KEY`
  - `EMAIL`, `PHONE`, `SSN`, `CC_NUMBER`
  - `INTERNAL_IP`, `HOSTNAME`, `PATH`
  - `PERSONAL_NAME` (cautiously)
  - `CREDENTIAL` (username/password pairs)

Use multiple signals: token patterns, surrounding words (e.g., `password:`, `Authorization:`), file path (e.g., `~/.aws/credentials`).

### 3.2 Confidence & Human Escalation
- Attach confidence score to each detected item.
- If confidence < threshold (e.g., 0.6), mark as *possible* and recommend human review.
- High-confidence secrets produce immediate alerts and recommended rotation.

---

## 4. Redaction & Presentation Rules
- Never present raw secret values back to the user or to downstream models.
- If a user legitimately needs to see an exact secret, require an audit-approved workflow and explicit permission (out of scope for RAG responses).
- When suggesting changes that involve secrets (e.g., "move key to env var"), show example placeholders, not actual values:
  - **Good:** `os.Getenv("MY_SERVICE_API_KEY")`
  - **Bad:** `api_key = "abcd-1234-SECRET"`

---

## 5. Retrieval, Indexing & Memory

### 5.1 Indexing
- **Code index:** File path, language, function/class boundaries, docstrings, last-modified timestamp.
- **Log index:** Timestamp, level, service, host, trace-id, message, stack trace.
- Store fingerprints (hashes) of raw file contents to detect stale retrievals.

### 5.2 Embeddings & Chunking
- Chunk files by logical boundaries (functions, classes) for code; by time-range / request-id for logs.
- Preserve nearby context when chunking (e.g., include 10–20 lines of surrounding code).
- Use semantic embeddings with metadata; include `confidence`, `last_updated`, `source_type` tags.

### 5.3 Retrieval Strategy
- Retrieval should prioritize:
  - Same file/function where log or error originated.
  - Recent logs matching trace-id/request-id.
  - Related files (config, environment), tests.

---

## 6. Prompting & Context Management for RAG

### 6.1 Context Window Rules
Always give the model:
- A short, structured *context header* (project name, file paths, error timestamps).
- Top-k retrieved code chunks + log chunks, each with provenance and redaction markers.
- The exact user request or task.

Example header:
PROJECT: payments-service  
TASK: Suggest breakpoint(s) for Investigating NullPointerException in payments.go  
RETRIEVED: payments.go:lines 120-160 (function: ProcessPayment), logs: 2025-10-10 14:02:05 ERROR trace-id=abc123


## 6.2 Prompt Templates (Examples)

### **Investigate Error**

**Input:**
- Error: `<error message and stack trace (redacted)>`
- Relevant code chunks (with file path & lines)
- Recent logs with trace-id (redacted values)

**Task:**
Summarize the likely root causes (up to 3), suggest concrete breakpoints and logging statements to add (include file, exact line position, log level, and one-line rationale). Use placeholders for secrets.

---

### **Add Logging**

**Input:**
Given function `<name>` and its surrounding code, propose a minimal set of logging statements to:
- Capture inputs/outputs,
- Record errors with stack traces,
- Avoid logging secrets.

**Output:**
Include suggested log format and example log line (with placeholders).

---

## 6.3 System vs. User Instructions
- System instructions must include **redaction** and **safe-output** constraints.
- Always instruct the model **not to hallucinate**: If evidence is insufficient, say "insufficient information" and list what to collect.

---

# 7. Producing Code Recommendations

## 7.1 Code-Change Style Guidelines
- Use small, **diff-like hunks** rather than full-file rewrites.
- Prefer changes that are:
  - Minimal and reversible.
  - Annotated with comments explaining reason and linking to the log/trace-id.
  - Always include tests or a testing plan for non-trivial changes.

## 7.2 Templates for Suggested Changes

Each recommendation should include:
- **Title**: Short description.
- **Files/locations**: File paths and line numbers.
- **Diff**: Unified diff snippet (`---`/`+++`/`@@`).
- **Rationale**: 1–2 lines linking to log evidence.
- **Tests**: Suggested unit/integration test outline.
- **Rollout**: Can it be hot-swapped? Feature flag? Manual review required?

## 7.3 Example (Logging Insertion)

**Title**: Add input validation logging to `ProcessPayment`

**Files:**
- `payments.go: func ProcessPayment (lines 120-160)`

**Diff:**
```diff
@@ -130,6 +130,12 @@ func ProcessPayment(req Request) error {
 // existing code

 // added: log incoming request metadata (redact PII)
 logger.Infof("ProcessPayment start trace=%s user_id=%s amount=%f", req.TraceID, redact(req.UserID), req.Amount)
 defer logger.Infof("ProcessPayment end trace=%s status=%s", req.TraceID, status)
 ```

# 8. Breakpoint & Instrumentation Heuristics

## 8.1 Where to Insert Breakpoints
Prefer instrumentation near:
- Entry points (API handlers, message consumers).
- Points where external calls are made (DB, HTTP, RPC).
- Exception handling / catch blocks.
- Data transformation boundaries (parsing, serialization).
- Areas indicated by recent errors or high-latency logs.

## 8.2 Types of Logging Levels
- **TRACE**: Fine-grained developer debug (disable in production).
- **DEBUG**: Inputs/flow in development or for short-lived traces.
- **INFO**: High-level operations started/completed, approvals.
- **WARN**: Recoverable issues, retries.
- **ERROR**: Failures that affect request result; include error code & trace-id.
- **CRITICAL/FATAL**: System-level failures.

## 8.3 Breakpoint Suggestions Format
For each suggested breakpoint:
- File, function, line.
- Suggested log/trace content (fields).
- Suggested level.
- Rationale linking to logs.
- Estimated privacy score (High/Medium/Low) — i.e., chance of logging PII.

---

# 9. Minimizing Hallucination & Ensuring Provenance

## 9.1 Always Provide Provenance
Every factual claim (root cause, file location) must include which retrieved chunk(s) support it. When making probabilistic claims, provide confidence and what evidence would increase confidence.

## 9.2 When to Abstain
If the retrieval set doesn't include code around an error location, respond:  
**"Insufficient context. I could not find function X or trace-id Y. Provide file or more logs."**  
Offer explicit steps to collect additional data (e.g., "include stack trace lines 5–12 or the request ID").

---

# 10. QA, Tests, and Evaluation

## 10.1 Evaluation Metrics
- Precision on secret detection (false positives/negatives).
- Recall on secret detection.
- Accuracy of breakpoint suggestions (human rating).
- Usefulness of code recommendations (developer acceptance rate).
- Time-to-issue-resolution before/after RAG integration (if measurable).
- Hallucination rate: Percent of outputs requiring correction.

## 10.2 Human-in-the-Loop
- All code changes or security-related findings must be triaged by developers/security engineers before merging.
- Provide a UI that displays suggested diffs with "Approve / Request changes / Reject."

## 10.3 Continuous Improvement
- Capture feedback signals:
  - Developer acceptance or edits to suggestions.
  - Corrected redaction misses.
  - Missed breakpoints found during incident postmortems.
- Feed back anonymized examples into retraining for classification models and prompt improvement.

---

# 11. Operational & Security Considerations
- Use least privilege for any connectors (e.g., repo access, log storage). Prefer read-only tokens.
- For production deployments:
  - Audit all accesses.
  - Rotate keys regularly.
  - Encrypt indexes and caches at rest.
  - Rate-limit outputs to avoid flooding sensitive messages.

---

# 12. UI / UX Recommendations for Developer Consumption
- Display retrieved context on-demand; collapsed by default with provenance.
- Show redaction summary at the top: counts & types of redacted items.
- Allow one-click copy of suggested diff (not auto-apply).
- Provide a "Why this suggestion?" expandable explanation that links log lines to code lines.
- Provide a "safety score" for each suggestion: privacy risk + confidence.

---

# 13. Example Workflows

## 13.1 Developer: Investigate an Error
- Developer pastes error, trace-id, and timestamp.
- RAG retrieves logs and code; scans & redacts secrets.
- RAG returns:
  - Short root-cause hypothesis (top 3, with provenance).
  - 2–3 breakpoint/logging recommendations with diffs.
  - Suggested unit test changes.
- Developer reviews, applies, and runs tests.

## 13.2 Security: Search for Leaked Keys
- Security runs a sensitive-entity scan across indices.
- RAG returns a list of findings with file paths, last-seen timestamps, recommended remediation (rotate key, invalidate tokens), and suggested commit diffs to remove the secret and use a secret manager.

---

# 14. Developer-Facing Templates & Quick-Checklists

## 14.1 Quick Redaction Checklist Before Outputting
- Scan for regex-based secrets.
- Run NER for PII.
- Replace values with `<REDACTED:TYPE>`.
- Show counts per type and locations.
- If secrets found, add remediation steps.

## 14.2 Breakpoint Suggestion Checklist
- Is an entry-point present?
- Is there an external call nearby?
- Is there a recent error log referencing this code?
- Can this logging be done without exposing secrets?
- Provide suggested log level and a one-line rationale.

---

# 15. Examples & Snippets

## 15.1 Regex Examples (Common Patterns)
- Use these in combination with NER and context; tune to reduce false positives.

### Common Secret Patterns:
- **API key-ish**: `(?i)(api_key|apikey|apiKey|access_token|secret)[\s:=]+"?([A-Za-z0-9\-_]{16,})"?`
- **JWT-like**: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`
- **AWS Access Key ID**: `AKIA[0-9A-Z]{16}`
- **Private key start**: `-----BEGIN PRIVATE KEY-----`
- **Email**: `[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`
- **IP (v4)**: `\b(?:\d{1,3}\.){3}\d{1,3}\b` (post-filter private ranges when necessary)
- **Credit card (Luhn check recommended)**: `\b(?:\d[  -]*?){13,16}\b` + Luhn

# 16. Do's & Don'ts (Short)
### Do
- Do redact before showing outputs.
- Do include provenance for every claim.
- Do prefer small, testable code diffs.
- Do route security-sensitive items for human review.

### Don't
- Don't output or embed raw secrets/PII.
- Don't generate broad sweeping refactors without tests.
- Don't make definitive root-cause claims without evidence.