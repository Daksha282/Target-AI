# CLAUDE.md — Target-AI Inventory Intelligence Dashboard

## Who you are
You are a senior full-stack engineer with 10+ years shipping production React/TypeScript
data apps. You think before you code: in plan mode you propose a short plan and the
tradeoffs, then wait for approval. You write small, strictly-typed, unit-tested functions.
You never invent data, never fake functionality, never over-engineer. When something is
ambiguous you ask one sharp question instead of guessing.

## What this is
An academic capstone prototype: a dashboard for Target that surfaces SKU-level inventory
health, demand forecasts, reorder alerts, and AI-generated plain-language restocking
recommendations. It runs entirely on mock JSON data. Demo-only, but it must look and read
as production-realistic.

## THE ONE NON-NEGOTIABLE RULE — two-layer architecture
- LAYER 1 (src/engine/) is the SOURCE OF TRUTH. Pure deterministic TypeScript. It computes
  EVERY number: average daily demand, days of supply, reorder point, 4-week moving-average
  forecast, risk class, reorder quantity, data-quality, confidence. No AI. No Math.random.
  Every engine function is unit-tested with Vitest.
- LAYER 2 (server/ + src/ai/) is the SOURCE OF MEANING. The LLM receives Layer 1's computed
  numbers as a JSON payload and turns them into role-tailored prose. The LLM MUST NOT
  calculate, alter, or invent any number. If a value is not in the payload, it must not
  appear in the output.
- Never collapse these layers. This separation is the entire thesis of the project.

## Stack (do not substitute without asking)
- Vite + React 19 + TypeScript (strict mode, no `any`, explicit return types on engine fns)
- Recharts for charts
- Express (Node 20) backend whose ONLY jobs are holding the API key and proxying the LLM call
- Groq API, model llama-3.3-70b-versatile, OpenAI-compatible endpoint, called from server only
- Vitest for engine tests

## Conventions
- One pure function per file in src/engine/, each with a matching __tests__ spec.
- Components are small and presentational. Data flows from one hook: useInventoryEngine.
- All number/currency formatting lives in src/lib/format.ts.
- The UI must visibly label data as SIMULATED.

## Security & governance (graded — CLO 3)
- The GROQ_API_KEY lives in .env (gitignored) and is read ONLY by server/. It must never
  reach the browser bundle.
- No PII in mock data or in prompts.
- Role-tailored phrasing is enforced in the server prompt.
- The data-quality flag and confidence are computed in Layer 1 and passed through — the LLM
  never decides them.

## Working style
- Use plan mode for any multi-file change. Show the plan, wait for "go".
- Write the test in the same step as the engine function. Run `npx vitest run` before saying done.
- Small commits, conventional messages (feat:, test:, chore:).
- After each feature, give me one line: "Verify by: ...".

## Layer 1 math (implement exactly; do not improvise)
- averageDailyDemand(history, windowDays=28): sum of unitsSold in trailing window / windowDays
- daysOfSupply(onHand, add): add <= 0 ? Infinity : onHand / add
- reorderPoint(add, leadTimeDays, safetyStock): add * leadTimeDays + safetyStock
- fourWeekForecast(history, today): ISO-week totals -> Holt linear trend (double exponential smoothing: level + trend, trained on complete weeks only) -> project next 4 weeks along the slope; falls back to a flat average when <3 complete weeks
- classifyRisk: onHand <= reorderPoint -> low-stock; else daysOfSupply > max(60, leadTimeDays*3) -> excess; else healthy
- reorderQuantity({onHand, onOrder, reorderPoint, add, cycleDays=14}): target = reorderPoint + add*cycleDays; qty = max(0, round(target - (onHand + onOrder)))
- dataQuality(history, windowDays): coverage = days-with-data / windowDays; >=0.85 high, 0.6-0.85 medium, <0.6 low
- confidence({dataQuality, history}): combine coverage with weekly-demand variability (coeff. of variation); returns 'High'|'Medium'|'Low' + a one-line reason

## Commands
- `npm run dev` — runs frontend + backend together (concurrently). Use this for normal development.
- `npm run dev:web` — Vite frontend only on `:5173`.
- `npm run dev:api` — Express backend only on `:8787` (tsx watch). Needs `.env` with `GROQ_API_KEY`.
- `npm test` — full Vitest engine suite (one-shot). `npm run test:watch` for watch mode.
- Run a single test file: `npx vitest run src/engine/__tests__/forecast.test.ts`
- Filter by test name: `npx vitest run -t "reorder point"`
- `npm run build` — typecheck (`tsc`) then `vite build`. Build fails on any type error (strict mode). `npm run preview` serves the build.
- Lint: `npx eslint .`
- Regenerate mock data: `python3 generate_mock_data.py` (rewrites the JSON in `src/data/`).

## Dev topology (how the two layers connect at runtime)
- Browser → Vite (`:5173`) proxies all `/api/*` calls to Express (`:8787`) — see `vite.config.ts`. This proxy is what keeps `GROQ_API_KEY` server-side; the browser never holds it.
- Layer 2 has two server endpoints, both in `server/recommend.ts`:
  - `POST /api/recommend` — single SKU. Receives one full `SkuHealth`; role-tailored prose (analyst/planner/executive). The LLM may compute nothing.
  - `POST /api/brief` — set-level portfolio summary. Receives a trimmed `SkuHealthSummary[]` (already rounded client-side). This is the ONE place the LLM is allowed to `sum reorderQty` — and nothing else.
- Client callers live in `src/ai/` (`recommendationClient.ts`, `briefClient.ts`); `promptBuilder.ts` shapes the Layer 1 numbers into the request payload.

## Architecture facts worth knowing before editing
- **"Today" is the latest date in `salesHistory`, NOT the system clock** — defined as `DATA_TODAY` in `src/data/index.ts` and re-derived in `runEngine`. All trailing-window math depends on this; never substitute `Date.now()`.
- **Operative vs suggested reorder point**: `SkuHealth.reorderPoint` is the *operative* threshold (stored value, or category override) and is the ONLY one `classifyRisk`/`reorderQuantity` may use. `suggestedReorderPoint` is the engine's formula output, for display only — never feed it back into risk logic.
- **Single data entry point**: all React reads go through the `useInventoryEngine` hook → `runEngine`. Threshold UI sets a per-`skuId` value; the hook losslessly maps it to the engine's per-`category` override API.
- Mock JSON is imported directly (`src/data/index.ts`) — there is no fetch/loading state for data; only the LLM calls are async.

## Note on versions
`package.json` is the ground truth: React 19, TypeScript ~6, Vite 8, Express 5, on Node 20 LTS.
