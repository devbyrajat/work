# YojnaAgent

**Right Scheme. Right Person. Right Time.**

YojnaAgent is an Indian government scheme discovery project. The goal is for an agent to research official sources, explain eligibility using evidence, and help citizens prepare to apply without submitting anything on their behalf.

## Scholarship checker

Open the [YojnaAgent scholarship checker](https://yojnaagent.vercel.app/ai-assistant/AiAssistant.html). The pilot covers **fresh PM-USP CSSS applications for AY 2026–27**. Six Yes/No/Not sure questions produce a rule-by-rule eligibility estimate, official evidence, a preparation checklist, and a downloadable PDF. No visitor account or API key is needed. It is not an application, award decision, or live AI search.

The Python rules and manually reviewed sources are in `backend/app/data/pm-usp-csss.json`. FastAPI serves `GET /api/scholarship` (scheme and questions), `POST /api/scholarship` (result), and `POST /api/scholarship?format=pdf` (attachment) on the same origin as Vite. Choices are not stored or sent to a third-party API. YojnaAgent does not collect documents or submit applications.

## Run locally

Use Node.js 22 LTS (22.12+) and Python 3.11+. From the repository root:

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
npm run build
.venv/bin/python -m uvicorn backend.app.preview:app --port 4173 --no-access-log
```

Open `http://localhost:4173`. This serves all eight pages and the API together. For frontend development with hot reload, run `.venv/bin/python -m uvicorn backend.app.main:app --port 8000 --no-access-log` and `npm run dev` in two terminals, then open the Vite URL. Vite proxies `/api` to Python locally.

Run `npm test` and `.venv/bin/python -m unittest discover -s backend/tests -v` to check the frontend build, eligibility outcomes, PDF content, and offline TinyFish probe.

| Screen | Source file |
| --- | --- |
| Landing | `frontend/index.html` |
| Assistant | `frontend/ai-assistant/AiAssistant.html` |
| Dashboard | `frontend/user-dashboard/UserDashboard.html` |
| Scheme results | `frontend/scheme-results/SchemeResults.html` |
| Scheme details | `frontend/scheme-details/SchemeDetails.html` |
| Document checker | `frontend/document-checker/DocumentChecker.html` |
| Application tracker | `frontend/application-tracker/ApplicationTracker.html` |
| Citizen profile | `frontend/user-profile/UserProfile.html` |

The example catalogue is in `frontend/ui/catalog.mjs`. Navigation and repeated card layouts are shared in `frontend/ui/partials.mjs`, and the theme is in `tailwind.config.cjs`.

**Only the scholarship checker is connected to real eligibility rules.** The other screens contain marked examples. The sample filters, bookmarks and document checkmarks do not check a real profile, verify documents or sync with a government portal. Only sample bookmarks are stored locally.

### Vercel deployment

Use the existing `yojnaagent` project at the repository root. `vercel.json` builds the eight pages with Vite (`npm ci`, `npm run build`, `dist/`) and Vercel runs `api/scholarship.py` as the Python function. The public pilot requires no environment variables. Test both the page and `/api/scholarship` before promoting a build.

## Stage 1: Verify the TinyFish connection

The server-side Python probe and offline tests are separate from the frontend. The probe does not research real schemes or check eligibility.

| File | Purpose |
| --- | --- |
| `backend/tinyfish_probe.py` | Loads the key from the backend environment, a private local file, or a hidden prompt. Can check configuration without a network request. |
| `backend/.env.example` | Empty configuration template. The real `backend/.env` belongs on your computer and is ignored by Git. |
| `backend/tests/test_tinyfish_probe.py` | Tests the request and failure handling without a key, internet, or paid runs. |
| `.gitignore` | Excludes common local secret and Python cache files. |
| [`docs/tinyfish-integration.md`](docs/tinyfish-integration.md) | Records the verified API contract, source restrictions, and staged FastAPI integration plan. |

The files are already in this checkout. Nothing needs to be copied from chat.

### 1. Run the offline tests

From the repository root with Python 3.11 or newer:

```bash
python3 -m unittest backend.tests.test_tinyfish_probe -v
```

Expected: `Ran 18 tests` followed by `OK`. No packages need to be installed.

### 2. Run one live probe (optional)

Use your own computer or a private backend host that can reach `agent.tinyfish.ai`. If you shared a key, revoke it and generate a replacement in [TinyFish API Keys](https://agent.tinyfish.ai/api-keys). Do not paste the key into chat, source code, or a command-line argument.

**Save it privately once on your computer:**

1. Copy `backend/.env.example` to `backend/.env`. This file is ignored by Git; do not upload it or force-add it.
2. In `backend/.env`, enter the replacement key after `TINYFISH_API_KEY=`. Use one line, without quotes, spaces, backslashes, or an inline comment.
3. From the repository root, run the local configuration check:

   ```bash
   python3 -m backend.tinyfish_probe --check-config
   ```

   Expected: `TinyFish key is configured.` This does not print the key, contact TinyFish, use credits, or verify the account.
4. Run the live test:

   ```bash
   python3 -m backend.tinyfish_probe
   ```

   This sends one request and may use TinyFish balance or credits. On Windows, use `py -3` in place of `python3` if needed.

On a private backend host, use its secret settings to set `TINYFISH_API_KEY` rather than copying the file. The environment variable takes priority over `backend/.env`, even if it is empty. To test a key without saving it at all, use `python3 -m backend.tinyfish_probe --prompt-key` in a local terminal; the prompt overrides both saved sources and stops if input cannot be hidden.

Expected shape on success (`run_id` below is a placeholder):

```json
{
  "run_id": "<TinyFish run ID>",
  "status": "COMPLETED",
  "result": {
    "status": "success",
    "source_url": "https://quotes.toscrape.com/",
    "first_author": "Albert Einstein"
  }
}
```

[Quotes to Scrape](https://toscrape.com/) is a demo intended for web extraction. It is not a scheme source. In particular, [myScheme's terms](https://www.myscheme.gov.in/terms-of-use) prohibit automated access unless expressly authorized in writing, so the probe does not visit myScheme.

**If the live probe fails:** A missing key stops before networking. For `401`, verify the key privately; for `402` or `403`, check your wallet, credits, and permissions; for `429`, wait for existing runs to finish or check the account limits. If the result is incomplete or the request times out, check [TinyFish run history](https://agent.tinyfish.ai/runs) before retrying. A cancelled, blocked, or incomplete run is not a successful extraction.

Live TinyFish research is not enabled on the site. It needs a replacement key stored privately, a successful sandbox run, and a source that permits automated access. It is separate from the curated scholarship checker.
