# SETUP — Target-AI build order (do this once, top to bottom)

You extracted this starter bundle. SETUP.md is the authoritative order of operations.
BUILD_PLAN.md is the detailed playbook + the Claude Code prompts.

IMPORTANT: do NOT extract this bundle into Target-AI until AFTER Step 1 (Vite scaffold),
so the folder is empty when Vite runs. Keep the bundle in Downloads until Step 2.

## Step 0 — prerequisites
- Node 20 LTS:  `nvm install 20 && nvm use 20`   (check: `node -v` -> v20.x)
- Free Groq API key: https://console.groq.com

## Step 1 — scaffold Vite into the EMPTY Target-AI folder
Open the integrated terminal inside Target-AI, then:

    npm create vite@latest . -- --template react-ts

The "." targets the current folder. Pick React + TypeScript if prompted.

## Step 2 — overlay this starter bundle
Now copy the contents of this bundle into Target-AI, allowing it to overwrite
README.md, .gitignore, and vite.config.ts. It adds:
  CLAUDE.md, BUILD_PLAN.md, SETUP.md, .env.example, generate_mock_data.py,
  src/engine/types.ts, src/data/index.ts, src/data/*.json

## Step 3 — install dependencies
    npm install
    npm install recharts express cors
    npm install -D vitest @types/express @types/cors concurrently tsx

## Step 4 — package.json scripts
Set the "scripts" block to:

    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "build": "tsc && vite build",
    "test": "vitest run",
    "preview": "vite preview"

## Step 5 — tsconfig
In tsconfig.json -> compilerOptions, confirm:  "resolveJsonModule": true
(Vite's react-ts template already sets it; the src/data/index.ts barrel needs it.)

## Step 6 — secrets
    cp .env.example .env
Edit .env and set GROQ_API_KEY=...   (.env is already gitignored — never commit it)

## Step 7 — first commit
    git init
    git add -A
    git commit -m "chore: scaffold + engineering brief + mock data"
Check `git status` first: .env must NOT appear.

## Step 8 — build with Claude Code
In the Claude Code panel, before your first prompt, paste this orientation line:

    "README.md, CLAUDE.md, BUILD_PLAN.md, SETUP.md, .env.example, .gitignore,
     vite.config.ts, src/engine/types.ts, src/data/index.ts and src/data/*.json
     already exist — do NOT recreate them. Read CLAUDE.md and BUILD_PLAN.md, then
     start at prompt P1."

Then paste prompts P1 -> P8 from BUILD_PLAN.md section 7, ONE AT A TIME. After each:
check the diff, run it, commit, then send the next.

## Run
    npm run dev      # frontend (:5173) + backend (:8787) together
    npm run test     # engine unit tests

## Two things you MUST tell the engine (already noted in the prompts)
1. "Today" for the trailing window = latest date in salesHistory (exported as
   DATA_TODAY in src/data/index.ts), NOT the system clock. The data ends 2026-06-15.
2. inventory.reorderPoint is the OPERATIVE threshold (what the slider edits and what
   risk classification reads). The engine may also compute a *suggested* reorder point
   for display — keep the two separate.
