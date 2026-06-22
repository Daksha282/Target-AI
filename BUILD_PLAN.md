> **Start with SETUP.md** for the exact order of operations. This file is the detailed playbook and holds the Claude Code prompts (section 7).

# BUILD PLAYBOOK — AI Inventory Intelligence Dashboard (Target)
### 1-day demo prototype · React + TypeScript + Recharts + Express + Groq · built with Claude Code

This is your single working doc for the build day. Save it in the repo root as `BUILD_PLAN.md`. Work top to bottom. Copy each prompt into Claude Code verbatim.

---

## 0. Decisions locked before you touch the keyboard

**Stack**
- Vite + React 19 + TypeScript (strict) — *not* Create React App (dead).
- Recharts — charts.
- Express (Node 20) — tiny backend that holds the LLM key and proxies the call. This is what makes the security story real (CLO 3).
- Groq API, model `llama-3.3-70b-versatile`, via its OpenAI-compatible endpoint. Free, fast, perfect for a demo.
- Vitest — unit tests for the rules engine (proves determinism / auditability).

**LLM terminology — read this once.** Your Phase 1–2 papers say "Claude API / LLM API." The actual demo runs on Groq because it's free and fast. That is fine and on-thesis: Layer 2 is deliberately vendor-swappable (your vendor-lock-in mitigation). In every paper and slide, call it **"the LLM API (Groq-hosted Llama 3.3 70B, swappable via an OpenAI-compatible interface)."** Honest, consistent, and it *demonstrates* the abstraction you argued for.

**The non-negotiable: two-layer separation.**
- **Layer 1 — `src/engine/`** = source of truth. Pure deterministic TypeScript. Computes every number. No AI, no randomness. Unit-tested.
- **Layer 2 — `server/` + `src/ai/`** = source of meaning. LLM receives Layer 1's numbers and writes prose. It never calculates, never invents a number. If a value isn't in the payload, it can't appear in the recommendation.

Never let the LLM do arithmetic. That single rule is your whole architectural argument (Venkatachalam & Narayanan, 2025; Durachman et al., 2026).

---

## 1. Hour-by-hour timeline (≈9–10 hrs)

| Block | Time | Output |
|---|---|---|
| Setup | 0:00–0:30 | Vite scaffold, deps, git, Claude Code running, `CLAUDE.md` saved |
| Mock data | 0:30–1:30 | 3 stores × ~12 SKUs, 90 days of sales history, JSON files |
| **Layer 1 engine** | 1:30–3:30 | metrics, forecast, risk, reorder, confidence + Vitest tests passing |
| **Layer 2 backend** | 3:30–4:15 | Express `/api/recommend` proxy to Groq, prompt builder, grounding enforced |
| Feature 1 + 3 | 4:15–6:15 | Portfolio health view + tiles + table; threshold controls + alerts |
| Feature 2 | 6:15–7:45 | SKU detail page + Recharts forecast curve |
| Feature 4 | 7:45–9:15 | AI panel: role selector, confidence badge, data-quality flag |
| Polish + demo | 9:15–10:15 | styling pass, seed a compelling demo SKU, screenshots, README, demo script |

If you fall behind, cut in this order: styling polish → SKU-level threshold editing (keep category-level) → multi-store (ship one store). Never cut the two-layer split or the tests — those *are* the grade.

---

## 2. Final folder structure (what you're aiming at)

```
Target-AI/
├── CLAUDE.md                 # senior-engineer brief + architecture rules
├── BUILD_PLAN.md             # this file
├── README.md
├── .env.example              # GROQ_API_KEY=
├── .env                      # real key, gitignored
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts            # dev proxy /api -> :8787
├── server/
│   ├── index.ts              # Express app
│   ├── groqClient.ts         # OpenAI-compatible client, server-side only
│   └── recommend.ts          # POST /api/recommend route
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   ├── data/
│   │   ├── stores.json
│   │   ├── skus.json
│   │   ├── inventory.json
│   │   └── salesHistory.json
│   ├── engine/               # ── LAYER 1: SOURCE OF TRUTH ──
│   │   ├── types.ts
│   │   ├── metrics.ts        # avg daily demand, days of supply, reorder point
│   │   ├── forecast.ts       # 4-week moving average + projection
│   │   ├── risk.ts           # low-stock / healthy / excess
│   │   ├── reorder.ts        # reorder quantity
│   │   ├── confidence.ts     # data-quality + variability -> High/Med/Low
│   │   ├── engine.ts         # orchestrator -> SkuHealth[]
│   │   └── __tests__/        # vitest specs, one per module
│   ├── ai/                   # ── LAYER 2 CLIENT ──
│   │   ├── promptBuilder.ts  # builds grounded, role-tailored prompt
│   │   └── recommendationClient.ts  # fetch('/api/recommend')
│   ├── hooks/
│   │   └── useInventoryEngine.ts
│   ├── context/
│   │   └── ThresholdContext.tsx
│   ├── lib/
│   │   └── format.ts
│   └── components/
│       ├── PortfolioView.tsx
│       ├── HealthTiles.tsx
│       ├── InventoryTable.tsx
│       ├── SkuDetail.tsx
│       ├── ForecastChart.tsx
│       ├── ThresholdControls.tsx
│       ├── AlertsPanel.tsx
│       ├── AiRecommendationPanel.tsx
│       ├── RoleSelector.tsx
│       ├── ConfidenceBadge.tsx
│       └── DataQualityFlag.tsx
```

---

## 3. Layer 1 math spec (give this to Claude Code; don't let it improvise)

All functions pure, all in `src/engine/`, all unit-tested. `windowDays = 28` default.

- **averageDailyDemand(history, windowDays=28)** → sum of `unitsSold` in trailing window ÷ windowDays.
- **daysOfSupply(onHand, add)** → `add <= 0 ? Infinity : onHand / add`.
- **reorderPoint(add, leadTimeDays, safetyStock)** → `add * leadTimeDays + safetyStock`.
- **fourWeekForecast(history)** → last 4 ISO-week totals → moving average → project next 4 weeks flat at that average. Return `{weekLabel, actual?, projected}[]` so the chart shows actuals then a dotted projection.
- **classifyRisk({onHand, reorderPoint, daysOfSupply, leadTimeDays})**:
  - `onHand <= reorderPoint` → **low-stock**
  - else `daysOfSupply > max(60, leadTimeDays * 3)` → **excess**
  - else → **healthy**
- **reorderQuantity({onHand, onOrder, reorderPoint, add, cycleDays=14})** → `target = reorderPoint + add * cycleDays`; `qty = max(0, round(target - (onHand + onOrder)))`.
- **dataQuality(history, windowDays)** → coverage = days-with-data ÷ windowDays. `≥0.85 high`, `0.6–0.85 medium`, `<0.6 low`.
- **confidence({dataQuality, history})** → combine dataQuality with demand variability (coefficient of variation of weekly demand). Low variability + high coverage → **High**; otherwise step down. Deterministic; returns `'High'|'Medium'|'Low'` + a one-line reason string.

`engine.ts` maps every store×SKU inventory row into a `SkuHealth` object carrying all of the above. The UI and the LLM both read `SkuHealth` — they never recompute.

---

## 4. Mock data shape (production-realistic on purpose)

```ts
stores[]:       { storeId, name, region }
skus[]:         { skuId, name, category, brandType: 'national'|'owned', leadTimeDays }
inventory[]:    { storeId, skuId, onHand, onOrder, reorderPoint, safetyStock }
salesHistory[]: { storeId, skuId, date: 'YYYY-MM-DD', unitsSold }
```

Seed deliberately so the demo tells a story:
- 1 **owned-brand** SKU with a long lead time (e.g. 21 days) sitting just under reorder point → dramatic **low-stock** + big reorder qty.
- 1 SKU drowning in stock → **excess** / markdown risk.
- 1 SKU with a 3-week gap in sales history → trips the **data-quality flag** and drops **confidence** to Medium/Low. This is the moment that proves the flag isn't decorative.
- Include `brandType: 'owned'` and longer lead times to mirror your Phase 1 point (~30% owned brands, longer lead times).

---

## 5. SETUP — run these in the integrated terminal (not Claude Code yet)

```bash
# Node 20 LTS (via nvm on macOS)
nvm install 20 && nvm use 20

# scaffold
npm create vite@latest Target-AI -- --template react-ts
cd Target-AI
npm install
npm install recharts express cors
npm install -D vitest @types/express @types/cors concurrently tsx

git init && git add -A && git commit -m "chore: vite scaffold"

# install + launch Claude Code in this folder
npm install -g @anthropic-ai/claude-code
claude
```

If `claude` setup or model details differ on your machine, the current source of truth is https://docs.claude.com/en/docs/claude-code/overview — follow it over anything here.

Then **create `CLAUDE.md`** (next section) in the repo root before your first real prompt. Claude Code auto-loads it as project memory, which is what makes it behave like a senior engineer instead of a generic assistant.

---

## 6. `CLAUDE.md` — paste this whole block into the file

```markdown
# CLAUDE.md — AI Inventory Intelligence Dashboard (Target Corporation)

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
```

---

## 7. Claude Code prompts — copy one at a time, in order

> Tip: after each prompt, let it finish, eyeball the diff, run the app/tests, then send the next. Don't fire them all at once.

**P1 — Orient + plan**
```
Read CLAUDE.md fully, then read BUILD_PLAN.md sections 2, 3, and 4. Do not write code yet.
In plan mode, give me a concise build plan that respects the two-layer rule and the folder
structure. Call out any risk you see in a 1-day timeline. Wait for my "go".
```

**P2 — Scaffold + types + mock data**
```
Go. Create the folder structure from BUILD_PLAN.md section 2 (empty files where needed).
Define src/engine/types.ts (Store, Sku, InventoryRow, SalesRecord, SkuHealth, Role,
Confidence). Then generate the four mock JSON files in src/data/ following section 4:
3 stores, ~12 SKUs across categories with brandType and leadTimeDays, and 90 days of daily
salesHistory. Seed the four "story" SKUs described in section 4 (a low-stock owned-brand with
long lead time, an excess SKU, a SKU with a 3-week sales gap, and healthy ones). Keep numbers
realistic. No engine logic yet.
Verify by: importing the JSON compiles under strict TS.
```

**P3 — Layer 1 engine + tests (the graded core)**
```
Build Layer 1 in src/engine/ exactly to the math spec in BUILD_PLAN.md section 3: metrics.ts,
forecast.ts, risk.ts, reorder.ts, confidence.ts, then engine.ts that maps every store×SKU row
to a SkuHealth. Pure functions only, strict types, no Math.random. Write a Vitest spec per
module in __tests__/ covering normal cases AND edge cases (zero demand, sales-history gap,
onHand below reorder point, huge overstock). Run `npx vitest run` and show me green.
Verify by: all tests pass; engine.ts returns SkuHealth[] with no NaN/Infinity leaking to UI fields.
```

**P4 — Layer 2 backend (Groq proxy + grounding)**
```
Build the backend. server/groqClient.ts: an OpenAI-compatible client pointed at
https://api.groq.com/openai/v1, model llama-3.3-70b-versatile, key from process.env.GROQ_API_KEY.
server/recommend.ts: POST /api/recommend that accepts a SkuHealth payload + a role
('analyst'|'planner'|'executive') and returns { recommendation, role }. server/index.ts wires
Express + cors on port 8787. Update vite.config.ts to proxy /api to :8787.
The system prompt MUST: state the role, instruct the model to use ONLY the numbers in the
payload, forbid inventing or recomputing any figure, and tailor depth by role (analyst=diagnostic
detail, planner=exact reorder qty + timing, executive=risk/return summary). Add src/ai/promptBuilder.ts
(builds the payload) and src/ai/recommendationClient.ts (fetches /api/recommend).
Create .env.example with GROQ_API_KEY= and add .env to .gitignore.
Verify by: with a real key in .env, curl /api/recommend returns grounded prose that quotes only
payload numbers.
```

**P5 — Feature 1 (Portfolio) + Feature 3 (Thresholds & Alerts)**
```
Build src/hooks/useInventoryEngine.ts (runs Layer 1 over the mock data once, memoized) and
src/context/ThresholdContext.tsx (per-category reorderPoint overrides). Then PortfolioView with:
HealthTiles (# low-stock, # excess, # healthy, overall health score), a sortable/filterable
InventoryTable (SKU, store, onHand, daysOfSupply, risk badge), ThresholdControls (adjust a
category's reorder point and watch risk recompute live), and AlertsPanel (auto-lists every
low-stock SKU with its reorder qty). Add a visible "SIMULATED DATA" label in the header.
Verify by: lowering a threshold flips SKUs to low-stock and they appear in AlertsPanel instantly.
```

**P6 — Feature 2 (SKU detail + forecast chart)**
```
Build SkuDetail (open by clicking a table row): header with risk badge, on-hand, on-order,
days-of-supply, lead time, reorder point, reorder qty. Add ForecastChart (Recharts): a line of
the last 8 weeks of actual weekly demand, then a dotted line for the 4-week moving-average
projection from forecast.ts. Clean axes, legend, tooltip. All values come from the SkuHealth
object — recompute nothing in the component.
Verify by: the projection line equals the 4-week average from the engine test.
```

**P7 — Feature 4 (AI recommendation panel)**
```
Build AiRecommendationPanel inside SkuDetail: a RoleSelector (Analyst / Planner / Executive),
a "Generate recommendation" button that calls recommendationClient with the current SkuHealth +
role, a ConfidenceBadge (reads confidence from Layer 1, color-coded), and a DataQualityFlag that
shows when data quality is medium/low with the reason string. Show a loading state and error
handling. The same SKU must produce visibly different phrasing per role. Make it obvious the
confidence and data-quality come from the engine, not the LLM.
Verify by: switching role + regenerating changes tone/detail but never the underlying numbers;
the gap-history SKU shows a low-confidence + data-quality warning.
```

**P8 — Polish + demo readiness**
```
Do a styling pass in src/styles.css for a clean, professional retail-ops look (calm neutral
palette, one accent for alerts, readable tables, card-based panels — no childish gradients).
Then: write README.md (what it is, the two-layer architecture with a small ASCII diagram, how to
run, the SIMULATED-data disclaimer, and a "swap the LLM" note). Confirm the four story SKUs each
demo cleanly. Suggest the exact click-path for a 3-minute live demo.
Verify by: `npm run dev` shows frontend + backend, all four features work end to end.
```

Add to `package.json` scripts so one command runs both:
```json
"scripts": {
  "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
  "test": "vitest run"
}
```

---

## 8. Demo script (≈3 min, for Week 8 + screenshots for Phase 3)

1. Open on **Portfolio** — "simulated Target data, 3 stores. Tiles: X at risk, Y overstocked, health score Z."
2. Point at the **owned-brand low-stock SKU** — "21-day lead time, under reorder point. This is the Phase 1 problem made visible."
3. **Lower a category threshold** live → SKUs flip to low-stock, alerts repopulate. "Configurable, deterministic, instant."
4. Open the **SKU detail** → forecast chart. "Actuals, then the 4-week moving-average projection — computed in the rules engine, fully auditable."
5. **AI panel:** generate as **Planner** (gets exact reorder qty + timing), then switch to **Executive** (risk/return). "Same numbers, re-voiced. The LLM never touched the math — that's the two-layer design."
6. Open the **gap-history SKU** → **data-quality flag + low confidence**. "The system tells you when to trust it. That's the governance layer (CLO 3)."

Take a clean screenshot at steps 1, 4, 5, and 6 — those four images carry Phase 3.

---

## 9. What this build feeds (so nothing is wasted)

- **Phase 3 (Project Design paper):** screenshots + the two-layer diagram + the mock schema + an example grounded prompt + the SDLC framing (requirements→design→build→test→deploy). Your tests *are* the "test" stage evidence.
- **CLO 2 (risk):** the data-quality flag + confidence is a working risk-identification control, not just prose.
- **CLO 3 (legal/ethical/security):** server-side key, no PII in prompts, role-tailored recommendations (true role-based access control = future work), grounding against hallucinated numbers — all demonstrable on screen.
- **CLO 4 (SDLC):** the Agile feature-by-feature build maps straight to Phase 4 sprints.
- **Week 8 deck:** the demo script above is your live segment.

---

## 10. Guardrails for the day

- If Claude Code tries to compute a number inside a component or inside the LLM prompt, stop it. Numbers come from `src/engine/` only.
- Keep `.env` out of git from commit #1. Check `.gitignore` before your first commit.
- Don't add Tailwind/Material/Chakra mid-build — it'll eat an hour. One hand-written stylesheet is plenty for a demo.
- Run `npm run test` before you call the engine done. Green tests are the cheapest points in the whole capstone.
- Commit after every passing feature so you always have a working demo to fall back to.