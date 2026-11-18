# YojnaAgent

**Right Scheme. Right Person. Right Time.**

YojnaAgent is an Indian government scheme discovery project. The goal is for an agent to research official sources, explain eligibility using evidence, and help citizens prepare to apply without submitting anything on their behalf.

## Run the frontend preview

The supplied HTML design is now the static frontend. It keeps the navy, warm white, and Inter styling and the desktop sidebar and mobile navigation. The pages and fonts compile locally rather than depending on a Tailwind or fonts CDN at runtime.

From the repository root, with Node.js 22 LTS (22.12 or later):

```bash
npm ci
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173` when running on your computer). For a production build and route checks, run `npm test`; output is in `dist/`.

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

**This is a design preview, not a running scheme agent.** The questionnaire, category filters, document checkmarks, and demo bookmarks work in the browser. Only bookmarks for the sample schemes are stored locally. No application is submitted, no identity information or document is collected, and no live matching or portal sync is performed. Scheme examples link to published sources and are not eligibility decisions.

### Vercel setup

`vercel.json` configures a static Vite build. With access to the intended Vercel project, import or connect this repository from the Vercel dashboard, keep the root directory at the repository root, and deploy the branch as a preview. It installs with `npm ci`, builds with `npm run build`, and serves `dist/`. No environment variable is required to deploy this frontend. The Python probe is not exposed as a Vercel function; keep its key server-side.

## Stage 1: Verify the TinyFish connection

The server-side Python probe and offline tests are separate from the frontend. The probe does not research real schemes or check eligibility.

| File | Purpose |
| --- | --- |
| `backend/tinyfish_probe.py` | Makes one authenticated, read-only TinyAgent request to a fixed demo page and checks the structured result. |
| `backend/tests/test_tinyfish_probe.py` | Tests the request and failure handling without a key, internet, or paid runs. |
| `.gitignore` | Excludes common local secret and Python cache files. |
| [`docs/tinyfish-integration.md`](docs/tinyfish-integration.md) | Records the verified API contract, source restrictions, and staged FastAPI integration plan. |

The files are already in this checkout. Nothing needs to be copied from chat.

### 1. Run the offline tests

From the repository root with Python 3.11 or newer:

```bash
python3 -m unittest discover -s backend/tests -v
```

Expected: `Ran 8 tests` followed by `OK`. No packages need to be installed.

### 2. Run one live probe (optional)

On your computer or a private backend host that can reach `agent.tinyfish.ai`, create a key in [TinyFish API Keys](https://agent.tinyfish.ai/api-keys). Run this from the repository root in Bash. The key prompt hides what you paste and the subshell discards the variable when it exits. Do not paste the key into chat or commit it. This starts one TinyAgent run and may use your TinyFish balance or credits.

```bash
(
  IFS= read -rsp 'TinyFish API key (input hidden): ' TINYFISH_API_KEY
  printf '\n'
  export TINYFISH_API_KEY
  python3 -m backend.tinyfish_probe
)
```

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

Once the live result is confirmed, the next slice is a FastAPI research job for a single scholarship topic on a source that permits automated access. The existing assistant and results screens can then be wired to that backend without changing their design.
