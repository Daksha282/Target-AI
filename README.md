# Target-AI — AI Inventory Intelligence Dashboard

A React + TypeScript dashboard that surfaces SKU-level inventory health for Target Corporation, forecasts demand, raises configurable reorder alerts, and generates plain-language restocking recommendations tailored to different roles.

> **Simulated data.** This is an academic capstone prototype. It runs entirely on mock JSON that mimics a Target store/SKU feed. No live systems, no real Target data, no PII.

---

## Why this exists

Target reported year-over-year comparable-sales declines in every quarter of 2025, and its supply-chain leadership has described the assortment as "hard to predict, hard to forecast, hard to move." The root causes are data silos, spreadsheet-driven forecasting, and reactive correction — problems get found *after* shelves go empty.

This dashboard demonstrates a shift from reactive correction to proactive intelligence: see the risk before the stockout, and get a recommendation you can act on and explain.

---

## Architecture — two layers, on purpose

The defining design decision is a hard split between computation and narration.

```
                  ┌─────────────────────────────────────────┐
   mock JSON  ──▶ │  LAYER 1 — Rules Engine (src/engine/)    │
  (stores,        │  "source of truth"                       │
   skus,          │  pure, deterministic TypeScript          │
   inventory,     │  • average daily demand                  │
   salesHistory)  │  • days of supply, reorder point         │
                  │  • 4-week moving-average forecast        │
                  │  • risk class (low-stock/healthy/excess) │
                  │  • reorder quantity                      │
                  │  • data-quality + confidence             │
                  └──────────────────┬──────────────────────┘
                                     │ SkuHealth (numbers only)
                                     ▼
                  ┌─────────────────────────────────────────┐
   browser   ◀──  │  LAYER 2 — LLM Narrative (server/, src/ai)│
   (React UI)     │  "source of meaning"                     │
                  │  receives Layer 1 numbers, re-voices them │
                  │  per role: analyst / planner / executive  │
                  │  NEVER calculates or invents a number     │
                  └─────────────────────────────────────────┘
```

**The rule:** every number is computed in Layer 1 and is fully auditable and reproducible. The LLM only translates those numbers into prose. If a value isn't in the payload, it can't appear in a recommendation. This keeps the system trustworthy, mitigates LLM arithmetic unreliability, and is the project's core academic argument.

---

## Features

1. **Inventory Health Portfolio** — overview across stores; tiles for # at risk / # overstocked / health score; sortable, filterable SKU table with risk badges.
2. **SKU Detail & Forecast** — on-hand / on-order / days-of-supply / lead time, plus a Recharts curve showing actual weekly demand and the 4-week moving-average projection.
3. **Configurable Reorder Thresholds & Alerts** — adjust reorder points per category and watch risk classifications and alerts recompute live.
4. **AI Recommendations Panel** — pick a role (analyst / planner / executive), generate a grounded restocking rationale, with a confidence badge and a data-quality flag computed by the engine (not the LLM).

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript (strict) via Vite |
| Charts | Recharts |
| Rules engine | Pure TypeScript, unit-tested with Vitest |
| Backend | Express (Node 20) — holds the API key, proxies the LLM call |
| LLM | Groq API · `llama-3.3-70b-versatile` · OpenAI-compatible endpoint (swappable) |

The LLM is accessed through an OpenAI-compatible interface, so the provider can be swapped without touching Layer 1. Groq is used here for a fast, free demo; the same Layer 2 contract works against any compatible endpoint.

---

## Project structure

```
Target-AI/
├── CLAUDE.md              # engineering brief + architecture rules
├── README.md
├── .env.example
├── server/               # Layer 2 backend: Express + Groq proxy
│   ├── index.ts
│   ├── groqClient.ts
│   └── recommend.ts
└── src/
    ├── engine/           # Layer 1: deterministic rules engine + tests
    ├── ai/               # Layer 2 client: prompt builder + fetch
    ├── components/       # presentational React components
    ├── hooks/            # useInventoryEngine
    ├── context/          # threshold overrides
    ├── lib/              # formatting
    └── data/             # mock JSON
```

---

## Getting started

**Prerequisites:** Node 20 LTS, a free [Groq API key](https://console.groq.com).

```bash
git clone <your-repo-url> Target-AI
cd Target-AI
npm install

# add your key
cp .env.example .env
# then edit .env and set GROQ_API_KEY=...

npm run dev      # starts the Vite frontend + Express backend together
npm run test     # runs the Vitest engine suite
```

Open the local URL Vite prints (usually `http://localhost:5173`).

---

## Security & governance

- The `GROQ_API_KEY` lives in `.env` (gitignored) and is read only by the server. It never reaches the browser bundle.
- No PII in mock data or in prompts.
- Role-tailored phrasing is enforced server-side.
- Confidence and the data-quality flag are computed deterministically in Layer 1 — the system tells you when *not* to trust a recommendation.

---

## Roadmap (future phases)

- Replace the mock feed with live POS / RFID-IoT streams.
- Upgrade Layer 1 forecasting from moving-average to hybrid ML (RNN / attention / ensemble).
- Add a reinforcement-learning optimization layer for self-tuning replenishment.

Layer 1 outputs a structured `SkuHealth` per store×SKU, so a stronger forecasting or optimization engine can be swapped behind the same interface.

---

## Academic context

Built for CAP 690 — Masters Applied Capstone, Westcliff University. AI assistance was used in development and has been disclosed to the instructor. All data is simulated for academic purposes.
