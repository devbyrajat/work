# YojnaAgent: TinyFish integration plan

## Repository audit

Inspected branch `arena/d427ea4d-work` at base commit `8053146ee172b325b1becb7a63f6bd30f617a9b4`. The only original file was `README.md` (a heading). There was no UI source, Python service, dependency manifest, database, TinyFish integration, or test suite to run or preserve in this checkout. Stage 1 introduced only the standalone probe. The supplied eight-screen frontend was added afterward as a design preview under `frontend/`. Its assistant now calls a separate, read-only FastAPI pilot for fresh PM-USP CSSS applicants, using manually reviewed NSP evidence. Neither the pilot nor the other screens call TinyFish.

## Verified TinyAgent REST contract (2026-11-18)

Use [TinyAgent](https://docs.tinyfish.ai/tinyagent/api/agent) for browser navigation and extraction. An automation starts at a **URL**, with an objective expressed in `goal`. It can interact with pages and return structured results; do not grant this project saved sessions, vault credentials, or application-submission tasks.

- **Authentication:** Send `X-API-Key` from the backend environment variable `TINYFISH_API_KEY`. This is not a Bearer token. Send JSON with `Content-Type: application/json`. See [Authentication](https://docs.tinyfish.ai/authentication).
- **Request:** `url` and `goal` are required for each single run. `output_schema` is optional, but use it for predictable results. The provider accepts a subset of JSON Schema: top-level object, at most 64 KB and 10 levels of schema nesting; use `nullable: true`, not a type array, and omit unsupported keywords such as `additionalProperties` and `oneOf`. Validate the result again on our side. See [Structured Output](https://docs.tinyfish.ai/tinyagent/api/agent/structured-output).
- **Per-run budget:** `agent_config.max_duration_seconds` is generally available and different from the client transport timeout. `mode` and `max_steps` are beta-gated; leave them out. Runs consume wallet balance or legacy plan credits. Cap concurrent jobs and don't assume retries are free. See [Run limits](https://docs.tinyfish.ai/tinyagent/explanation/agent-modes) and [Errors](https://docs.tinyfish.ai/error-codes).

All paths below are relative to `https://agent.tinyfish.ai`:

| Method and path | Response and use |
| --- | --- |
| `POST /v1/automation/run` | Waits for a final JSON run record (`run_id`, `status`, timestamps, `result`, `error`); cannot cancel. Used for the one-page probe. |
| `POST /v1/automation/run-sse` | Streams `STARTED`, `STREAMING_URL`, `PROGRESS`, `HEARTBEAT`, `COMPLETE`. `COMPLETE` includes the terminal `status` and result or error. Best fit for showing a judge live research progress. |
| `POST /v1/automation/run-async` | Queues a run and returns `run_id` (or an error). Use if backend hosting is better suited to polling than long streams. |
| `POST /v1/automation/run-batch` | Queues 1–100 runs under `runs` and returns `run_ids`. When used, keep `output_schema` at the batch level. Not needed for the first scheme. |
| `GET /v1/runs/{id}` | Look up progress and result for a recorded run ID. The terminal statuses are `COMPLETED`, `FAILED`, and `CANCELLED`. |
| `POST /v1/runs/{id}/cancel` | Cancels an async, batch, or SSE run (not a synchronous `/run`). |

SSE has no `Last-Event-ID` resume. Keep the provider run ID server-side and poll the existing run after a disconnect, rather than issuing another potentially billable `POST`. A provider status of `COMPLETED` means the browser run ended, not that it found usable data. Model an extraction status and reason inside `result`, then check for missing data, blocks, stale material, and invalid sources independently. See the [run reference](https://docs.tinyfish.ai/tinyagent/api/runs) and [lifecycle guide](https://docs.tinyfish.ai/tinyagent/explanation/runs).

## First scheme workflow (proposed, not implemented)

1. **Plan and collect only what is needed.** FastAPI accepts the citizen's message and confirms intent, such as Rajasthan scholarships. A small Python orchestrator chooses a research source and makes a bounded plan. Send only the research category and location to TinyFish, not the raw message, identity details, household income, or uploaded documents. Ask for other profile facts only when sourced rules make them relevant.
2. **Research and verify.** Start with one approved official ministry or state source, or an official open-data API with applicable terms. TinyAgent can follow public navigation and collect candidate facts, exact source URLs, quotations and where they appear in the official guidance. The backend should validate HTTPS sources against an explicit allowlist and verify the evidence against current guidance before using it. A goal prompt is not a browser sandbox or a source verification step. Stop on login, CAPTCHA, or prohibited access; don't try to work around them. [myScheme's Terms of Use](https://www.myscheme.gov.in/terms-of-use) explicitly prohibit automatic access without prior written authorization. Leave it out of automated runs unless that authorization is obtained.
3. **Store the scheme, not the citizen's documents.** Use SQLite for the scheme ID and name, administering department, central/state scope, description, benefits, evidence-linked rules, documents, application steps, and separately validated information and application URLs. Store a server-recorded UTC research timestamp, official effective dates or cycle when available, and verification status. A newly accessed page can still describe an expired cycle. Missing, conflicting, blocked, or stale findings are not verified and must not become actionable rules. Use SQLite filters first; add vector retrieval only if it improves discovery without losing provenance.
4. **Evaluate in Python.** Convert supported criteria to typed predicates, preserving units, inclusivity, alternatives, and exceptions. A conclusively failed verified mandatory condition means **Not eligible**. A complete set of verified mandatory criteria all passing means **Eligible** (an estimate, not approval). Use **Potentially eligible** when some verified criteria match but relevant profile answers are pending. Use **Insufficient information** when the evidence or profile is too incomplete to form even a provisional match. Never treat a missing answer as a failed or satisfied condition. Keep unsupported or ambiguous conditions pending for review; an LLM can help extract or explain but cannot decide or supply rules.
5. **Recommend and guide.** Rank by evidence-based eligibility, intent, location, benefits, and a verified application window where known. Produce a checklist of document names and steps with links and citations; track progress locally via user-entered status, not by logging into government accounts. Later generate a PDF from the same structured report. YojnaAgent will not submit applications or upload documents.

## Implementation gates

| Stage | Proposed path(s) | Test before moving on |
| --- | --- | --- |
| 1. TinyFish probe | `backend/tinyfish_probe.py`, `backend/tests/test_tinyfish_probe.py` | Run the offline tests and then confirm a single live demo extraction using the commands in [README](../README.md). Offline success does not verify the account or a live run. |
| 2. One FastAPI research job | `backend/app/main.py`, `backend/app/research.py`, `backend/app/tinyfish.py` | Test one live extraction on an approved scheme source, plus blocked pages, invalid results, deadline and disconnect recovery. |
| 3. Eligibility and recommendations | `backend/app/eligibility.py`, `backend/app/schemes.py` | Test numeric boundaries, missing fields, contradictory evidence, and conditional exceptions before making recommendations. |
| 4. Wire the supplied UI and reports | `frontend/`, `backend/app/reports.py` | Run a profile through research, eligibility, document checklist, and PDF download. Preserve the existing layout and style. |

For Stage 2, one possible **YojnaAgent** API contract is `POST /api/research` to create a job and `GET /api/research/{job_id}/events` to stream sanitized progress to the existing UI. These are proposed application routes, not TinyFish endpoints. The server owns the provider connection and translates progress into research and evaluation steps. Restrict access to jobs, apply per-user budgets and timeouts, and don't expose raw upstream errors or publish the live browser URL by default. No LangGraph or separate LLM is required for this first workflow; consider orchestration tooling only once branching and durable resume justify it.
