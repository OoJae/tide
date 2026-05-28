# Tide — Development Notes

> On-chain risk & reputation co-pilot for DAO treasuries.
> Hackathon: Pirates of the Coral-bean (WeMakeDevs x Coral), Track 1 Enterprise Agent.
> Solo build, May 25-31 2026, Claude Code assisted.

---

## Development Timeline

### Day 1 — May 27 (Wed) — Foundation & Source Specs

**Session 1: Project scaffold**
- Initialized Next.js 15 (App Router) + TypeScript + Tailwind
- Wired Coral MCP to Claude Code (`coral mcp-stdio`)
- Created `data/grantees/registry.csv` with 16 synthetic grantee entries (Aave, Uniswap, Lido, Curve, etc.)
- Created `data/github/activity.csv` with ~30 PR entries matching grantee orgs
- Wrote file-backed source specs: `grantees.yaml`, `github_activity.yaml`
- Added bundled `github` source
- Verified first cross-source JOIN (grantees x github)

**Session 2: HTTP source specs**
- Wrote `defillama.yaml` (no auth, 2 tables: protocols, protocol_tvl)
- Wrote `coingecko.yaml` (HeaderAuth via demo API key, 1 table: markets)
- Wrote `neynar.yaml` (HeaderAuth, 1 function: search_casts)
- Wrote `etherscan.yaml` (query param auth, 1 table: token_transfers)
- All 4 specs lint-clean via `coral source lint`

**Session 3: Agent backend & chat UI**
- Built `src/lib/coral.ts` — thin wrapper around `coral sql --format json`
- Built `src/lib/agent.ts` — system prompt (Tide persona, source docs, SQL rules, example queries) + 3 tool definitions (run_coral_sql, list_catalog, describe_table)
- Built `src/app/api/ask/route.ts` — streaming SSE agent loop with Anthropic SDK tool-use
- Built `src/app/page.tsx` — chat UI with sidebar, starter prompts, SQL preview, results table
- Built `src/app/layout.tsx` — Geist fonts, page metadata

**Commits:**
```
bab3d83 Initial commit: project docs and CLAUDE.md context
c2ac9cf feat: initial project setup with Coral sources and Next.js scaffold
e712fff feat: add agent backend and chat UI
0b7423e feat: add coingecko, neynar, etherscan source specs
```

### Day 2 — May 28 (Thu) — MiMo Pivot, Reputation, Deployment Infra

**Session 1: MiMo-V2.5-Pro pivot**
- Pivoted agent backend from Anthropic Claude to Xiaomi MiMo-V2.5-Pro
- MiMo exposes an Anthropic-compatible API at `https://token-plan-sgp.xiaomimimo.com/anthropic`
- Kept `@anthropic-ai/sdk` package — changed only baseURL, apiKey, and model string
- Fixed `.env.local` base URL (removed trailing `/v1` to prevent SDK double-prefix)
- Updated sidebar branding: "Powered by Coral + MiMo"

**Session 2: Register all Coral sources**
- Registered coingecko, neynar, etherscan (were written but never `coral source add`'d)
- Fixed coingecko spec: added `vs_currency` as a column so filter WHERE clause works
- Fixed etherscan spec: added `chainid` and `address` as columns, removed `ok_path`/`error_path` (caused test failures), changed test query to chainid=1 (free API key doesn't support Base)
- Neynar: 402 error (free key doesn't cover cast search) — not critical, reputation data covers it
- All 8 sources now registered and passing tests

**Session 3: Reputation data pipeline**
- Created `data/reputation/casts_scored.jsonl` — 23 hand-seeded Farcaster cast entries across 16 grantee projects
- Fields: project_slug, cast_hash, author, text, sentiment_score (0-1), relevance (0-1), scored_at
- Created `coral/sources/reputation.yaml` — file-backed JSONL source spec
- Verified: 2 test queries pass, cross-source JOIN with grantees works

**Session 4: Hero query verification**
- Tested 2-source JOIN (grantees x defillama) — works
- Tested 3-source JOIN (+ reputation) — works
- Tested 4-source JOIN (+ github_activity) — works
- Tested 5-source JOIN (+ etherscan) — works (transfers are 0 because sample wallets are fictional)
- Tested risk flag query (WHERE change_7d < -5) — works, returns 6 at-risk grantees

**Session 5: MiMo agent loop test**
- Started dev server, tested via curl
- MiMo correctly generates SQL, executes via Coral, formats response
- Both "top grantees" and "risk flag" queries produce excellent responses with tables and analysis
- Tool-use protocol fully compatible

**Session 6: DEMO_MODE & deployment**
- Created `scripts/snapshot-fixtures.ts` — runs hero queries, saves results to JSON
- Generated `data/fixtures/top-grantees-by-tvl.json` and `data/fixtures/risk-flag.json`
- Added DEMO_MODE to `route.ts` — serves cached fixtures when `DEMO_MODE=1`
- Created `Dockerfile` — node:20-slim, installs coral binary from GitHub releases, builds Next.js, adds sources at start
- Created `.dockerignore`

**Commits:**
```
c00ff9f feat: pivot agent backend to MiMo-V2.5-Pro and fix source specs
b9c9dd9 feat: add reputation data source and update agent prompt
fc4e927 feat: add DEMO_MODE, snapshot fixtures, and Dockerfile
```

---

## Current Status (May 28, end of Day 2)

### Coral Sources (8 registered, all tests pass)

| Source | Backend | Auth | Tables | Status |
|--------|---------|------|--------|--------|
| grantees | file (CSV) | none | registry | Working |
| github_activity | file (CSV) | none | prs | Working |
| reputation | file (JSONL) | none | casts_scored | Working |
| defillama | http | none | protocols, protocol_tvl | Working |
| coingecko | http | keychain | markets | Working |
| etherscan | http | keychain | token_transfers | Working (Ethereum mainnet only) |
| neynar | http | keychain | search_casts | 402 (free key limitation) |
| github | bundled | keychain | 362 tables | Working |

### Data Files

| File | Rows | Status |
|------|------|--------|
| `data/grantees/registry.csv` | 16 | Complete |
| `data/github/activity.csv` | ~30 | Complete |
| `data/reputation/casts_scored.jsonl` | 23 | Complete |
| `data/fixtures/top-grantees-by-tvl.json` | 14 | Generated |
| `data/fixtures/risk-flag.json` | 6 | Generated |

### Backend

| Component | File | Status |
|-----------|------|--------|
| Coral CLI bridge | `src/lib/coral.ts` | Working |
| Agent system prompt | `src/lib/agent.ts` | Working (updated with reputation + Etherscan notes) |
| Tool definitions | `src/lib/agent.ts` | Working (3 tools) |
| Streaming agent loop | `src/app/api/ask/route.ts` | Working (MiMo + DEMO_MODE) |
| Snapshot fixtures | `scripts/snapshot-fixtures.ts` | Working |
| Source registration | `scripts/add-sources.sh` | Working |

### Frontend

| Component | Status |
|-----------|--------|
| Chat UI shell | Working (monolithic page.tsx, 310 lines) |
| Sidebar with source list | Working |
| Starter prompts | Working |
| SQL preview | Working (no syntax highlighting) |
| Results table | Working (not sortable, not clickable) |
| SourceChips | Missing |
| RiskBadge | Missing |
| Error state display | Missing |
| Component extraction | Not done (all inline in page.tsx) |
| shadcn/ui | Not installed |

### Deployment

| Item | Status |
|------|--------|
| Dockerfile | Created |
| .dockerignore | Created |
| DEMO_MODE flag | Working |
| README | Boilerplate only (needs real content) |
| docs/DEMO-SCRIPT.md | Missing |
| Deployed URL | Not yet deployed |

---

## What's Next (Prioritized)

### High Priority
1. **UI polish** — extract components, add SourceChips, RiskBadge, SQL syntax highlighting, error states
2. **README** — architecture diagram, hero query, setup instructions, source-spec links, Apache-2.0
3. **Deploy** — Railway or Fly.io with env vars, verify public URL works end-to-end

### Medium Priority
4. **docs/DEMO-SCRIPT.md** — timed beats for the 3-minute demo video
5. **Source-spec PRs** — open PRs to `withcoral/coral` for the 4 new specs (defillama, coingecko, neynar, etherscan)
6. **How-to guide** — Hashnode/dev.to post for the Keychron bounty

### Low Priority
7. **shadcn/ui** — install and convert raw Tailwind to shadcn components
8. **scripts/score-reputation.ts** — automate reputation scoring (currently hand-seeded)
9. **Etherscan Base chain** — upgrade API key or use a different chain for the demo

---

## Known Issues

1. **Neynar 402** — free API key doesn't cover cast search endpoint. Reputation data covers this gap for the demo.
2. **Etherscan Base chain** — free API key only supports Ethereum mainnet (chainid=1). Hero query uses chainid=1 instead of 8453.
3. **Sample wallet addresses** — grantees CSV uses fictional wallets, so Etherscan transfers show 0. Use real addresses or accept 0 transfers for the demo.
4. **No token-level streaming** — `route.ts` uses `anthropic.messages.create()` (non-streaming) instead of `.stream()`. Text arrives in blocks, not tokens.
5. **SQL injection in describeTable** — `src/lib/coral.ts` uses string interpolation for schema/table names. Low risk since inputs come from the LLM.

---

## Changelog

### 2026-05-28

**`fc4e927` feat: add DEMO_MODE, snapshot fixtures, and Dockerfile**
- Added `scripts/snapshot-fixtures.ts` — caches hero query results to JSON
- Added DEMO_MODE support in `route.ts` — serves fixtures when `DEMO_MODE=1`
- Created `Dockerfile` — node:20-slim, coral binary from GitHub releases
- Created `.dockerignore`
- Generated `data/fixtures/top-grantees-by-tvl.json` and `data/fixtures/risk-flag.json`

**`b9c9dd9` feat: add reputation data source and update agent prompt**
- Created `data/reputation/casts_scored.jsonl` — 23 scored Farcaster casts across 16 projects
- Created `coral/sources/reputation.yaml` — file-backed JSONL source spec
- Updated `src/lib/agent.ts` — added reputation source docs, Etherscan chainid=1 note, cross-source example queries

**`c00ff9f` feat: pivot agent backend to MiMo-V2.5-Pro and fix source specs**
- Switched from Anthropic Claude to Xiaomi MiMo-V2.5-Pro (Anthropic-compatible API)
- Fixed `.env.local` base URL (removed trailing `/v1`)
- Fixed `coingecko.yaml` — added `vs_currency` column for filter WHERE clause
- Fixed `etherscan.yaml` — added `chainid`/`address` columns, removed `ok_path`/`error_path`, test on chainid=1
- Updated sidebar branding to "Powered by Coral + MiMo"

### 2026-05-27

**`0b7423e` feat: add coingecko, neynar, etherscan source specs**
- Wrote 4 HTTP source specs: defillama, coingecko, neynar, etherscan
- All lint-clean via `coral source lint`

**`e712fff` feat: add agent backend and chat UI**
- Built streaming SSE agent loop with Anthropic SDK tool-use
- Built chat UI with sidebar, starter prompts, SQL preview, results table
- Built Coral CLI bridge and agent system prompt

**`c2ac9cf` feat: initial project setup with Coral sources and Next.js scaffold**
- Scaffolded Next.js 15 + TypeScript + Tailwind
- Created grantees CSV and github activity CSV
- Wrote grantees.yaml and github_activity.yaml source specs
- Added bundled github source

**`bab3d83` Initial commit: project docs and CLAUDE.md context**
- Added docs/Tide-Build-Plan.md and docs/Tide-Research-Report.md
- Added CLAUDE.md project context
