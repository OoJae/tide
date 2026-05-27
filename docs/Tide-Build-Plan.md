# Tide — Build Plan & Engineering Bible

> **What this is:** the complete, end-to-end plan for building **Tide** for the *Pirates of the Coral-bean* hackathon (WeMakeDevs × Coral, May 25–31 2026). Everything from environment setup to the four source specs, the agent backend, the frontend, deployment, the demo video, and bounty execution. Pair this with `Tide-Claude-Code-Master-Prompt.md` (the kickoff prompt for Claude Code) and `Tide-Research-Report.md` (the why).
>
> All Coral DSL details below were verified against `withcoral.com/docs` on 27 May 2026. Coral is young and changes fast — **the source-of-truth is always the live docs + the `coral source lint`/`test` loop**, never memory.

---

## 0. The one-paragraph thesis

Tide is an **on-chain risk & reputation co-pilot for DAO treasuries and crypto funds**. Treasury managers pay grantees and vendors across multiple chains, coordinate work in GitHub/Linear/Notion, and judge reputation from scattered social and market signals. Today that reconciliation is manual and lossy. Tide turns all of it into **one SQL surface via Coral** and an agent that answers questions no single tool can — e.g. *"Show every grantee we paid >$10k of USDC who also merged a PR this month and is positively cited on Farcaster, and flag any whose protocol TVL just collapsed."* That answer is a single cross-source JOIN across on-chain transfers, GitHub, Farcaster, DeFiLlama and a local grantee registry. **It is impossible without Coral, and that is the whole point.**

### The hero query (the star of the demo)
```sql
SELECT
  g.recipient_name,
  g.wallet,
  SUM(CAST(tx.value AS DOUBLE) / 1e6)                                  AS usdc_paid,
  COUNT(DISTINCT pr.number) FILTER (
    WHERE pr.merged_at > now() - INTERVAL '30 days')                   AS prs_30d,
  COUNT(DISTINCT rep.cast_hash) FILTER (
    WHERE rep.sentiment_score > 0.5)                                   AS positive_mentions,
  fl.tvl                                                               AS protocol_tvl_now,
  fl.change_7d                                                         AS tvl_change_7d
FROM grantees.registry            g
JOIN etherscan.token_transfers    tx  ON tx.to_address = g.wallet
                                      AND tx.chainid = 8453               -- Base
                                      AND tx.contract_address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'  -- USDC
JOIN github.pulls                 pr  ON pr.user__login = g.github_handle
LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
LEFT JOIN defillama.protocols     fl  ON fl.slug = g.project_slug
WHERE tx.block_time > now() - INTERVAL '90 days'
GROUP BY g.recipient_name, g.wallet, fl.tvl, fl.change_7d
HAVING SUM(CAST(tx.value AS DOUBLE) / 1e6) > 10000
ORDER BY usdc_paid DESC;
```
> Column names (`user__login`, `to_address`, `change_7d`, etc.) are *targets* — confirm the exact flattened names each source exposes by running `SELECT * FROM coral.columns WHERE schema_name = '<source>'` after the spec installs, then adjust. Coral flattens nested JSON with double underscores (`author__username`), not dots.

---

## 1. Architecture

```
                          ┌──────────────────────────────────────────┐
                          │            TIDE WEB APP (Next.js 15)       │
                          │  Chat UI · live SQL preview · results grid │
                          │  source-attribution chips · risk view      │
                          └───────────────┬────────────────────────────┘
                                          │  POST /api/ask  (streamed)
                                          ▼
                          ┌──────────────────────────────────────────┐
                          │   Agent route (Anthropic SDK, tool-use)    │
                          │   tool: run_coral_sql(sql) ── shells ──▶    │
                          └───────────────┬────────────────────────────┘
                                          │  `coral sql --format json "<SQL>"`
                                          ▼
              ┌───────────────────────────────────────────────────────────────┐
              │                      CORAL (local query engine)                  │
              │   one SQL plane · cross-source JOIN · caching · schema learning   │
              └───┬───────────┬───────────┬───────────┬───────────┬─────────────┘
                  │           │           │           │           │
            etherscan   defillama    coingecko    farcaster   github / linear / notion
            (NEW)        (NEW)        (NEW)        (NEW)        (bundled)
                  │           │           │           │
                  └───────────┴───────────┴───────────┴──▶ + file-backed:
                                                            grantees.registry (CSV)
                                                            reputation.casts_scored (JSONL)

   Two integration surfaces:
   • DEV / DEMO surface  →  Claude Code ⇄ Coral over MCP (`coral mcp-stdio`)   ← builds specs, "watch Claude write SQL live"
   • PRODUCT surface     →  Tide app ⇄ Anthropic API w/ run_coral_sql tool ⇄ Coral CLI subprocess
```

### ⚠️ The local-first deployment gotcha (read this before you architect anything)
Coral is **100% local** — credentials and data never leave the machine. That collides with the hackathon's requirement for a public **deployed link**. Resolve it deliberately:

- **Primary plan — single container host (Railway / Render / Fly.io).** Ship Tide as a Docker image with the `coral` binary baked in and all sources added at build/runtime from **env-var inputs** (Coral reads each declared input from an env var of the same name). One box runs both Next.js and Coral. This satisfies "deployed link" with a genuinely live URL and respects Coral's one-machine model. **Do not target Vercel/Netlify serverless for the agent backend** — there is no persistent local Coral process or local creds there.
- **Reliability fallback — demo fixtures / "replay mode."** Cache the canonical hero-query results to JSON and add a `DEMO_MODE` flag that serves them. Guarantees the deployed link and the video never break in front of judges, even if a third-party API rate-limits mid-demo. Build this early; it doubles as your test harness.
- A static marketing/landing page *can* live on Vercel and link to the live app on the container host, if you want a polished front door.

### Tech stack
- **Coral** (the query layer) + the official source-authoring skill (`npx skills add withcoral/skills`).
- **Next.js 15** (App Router) + **TypeScript** + **Tailwind** + shadcn/ui for the dashboard.
- **Anthropic SDK** (`@anthropic-ai/sdk`) for the in-app agent loop (model: `claude-opus-4-7` for the agent's SQL reasoning; `claude-haiku-4-5-20251001` is fine for the cheap batch sentiment scoring).
- **Node 20+**. Package manager: pnpm.
- **Docker** for deploy. Host: Railway or Fly.io.
- Optional upgrade if time allows: **Neon Postgres** for the grantee registry + scored reputation, exposed to Coral via the `neondb` community source instead of CSV/JSONL files (more "real," but more setup — skip on the critical path).

---

## 2. Prerequisites & accounts

| Need | How | Notes |
|---|---|---|
| Coral installed | `brew install withcoral/tap/coral` (or see docs/installation) | Confirm with `coral --version`; `coral source list` to see bundled sources |
| Coral authoring skill | `npx skills add withcoral/skills` | Lets Claude Code author specs correctly |
| ⭐ Star the repo | `github.com/withcoral/coral` | **Eligibility requirement** |
| Join Coral Discord | `withcoral.com/discord` | **Eligibility requirement**; #ask-for-help and #hackathon-general |
| Anthropic API key | console.anthropic.com | For the in-app agent + sentiment scoring |
| Etherscan API key | etherscan.io/apis (free) | V2 multichain — one key covers Ethereum + Base + others via `chainid` |
| CoinGecko demo key | coingecko.com/en/api (free demo tier) | Header `x-cg-demo-api-key`; base host `api.coingecko.com` |
| Neynar API key | neynar.com (Farcaster API) | Header `x-api-key`; for cast search |
| DeFiLlama | none | `api.llama.fi` is keyless |
| GitHub token | for the bundled `github` source | scope: `repo`, `read:org` |
| Register early-bird | by **May 18** | random-draw $50 gift card; also star + social-share bounty |

> **Rule compliance:** plan and sketch before May 25 (allowed), but **write zero project code until the event opens**, and make your **first commit on May 25**. The project must be freshly launched.

---

## 3. Repository layout

```
tide/
├─ CLAUDE.md                      # persistent project context for Claude Code (see master prompt)
├─ docs/
│  ├─ Tide-Research-Report.md
│  ├─ Tide-Build-Plan.md          # this file
│  └─ DEMO-SCRIPT.md
├─ coral/
│  └─ sources/                    # the four NEW source specs (also PR'd upstream)
│     ├─ defillama.yaml
│     ├─ coingecko.yaml
│     ├─ etherscan.yaml
│     └─ neynar.yaml
├─ data/
│  ├─ grantees/registry.csv       # file-backed: the DAO grantee registry (demo dataset)
│  └─ reputation/casts_scored.jsonl  # file-backed: LLM-scored Farcaster casts
├─ scripts/
│  ├─ score-reputation.ts         # pulls casts via Coral, scores sentiment, writes JSONL
│  ├─ add-sources.sh              # idempotent: coral source add for all four + file sources
│  └─ snapshot-fixtures.ts        # caches hero-query results to JSON for DEMO_MODE
├─ src/app/
│  ├─ page.tsx                    # dashboard shell
│  ├─ api/ask/route.ts            # the agent loop (Anthropic SDK + run_coral_sql tool)
│  └─ components/                 # ChatPanel, SqlPreview, ResultsGrid, SourceChips, RiskBadge
├─ lib/
│  ├─ coral.ts                    # runCoralSql(): spawn `coral sql --format json`, parse, time it
│  └─ agent.ts                    # tool definitions, system prompt, streaming
├─ Dockerfile                     # baked coral binary + app
└─ README.md
```

---

## 4. Build phases

### Phase 0 — Pre-event prep (allowed: notes & diagrams only)
- Read end-to-end: Coral *Source spec reference*, *Write a custom source*, *Use Coral over MCP*, and the bundled specs under `sources/core/` in the repo (the best working examples of pagination/auth/response mapping).
- Sketch the grantee registry schema and the demo narrative.
- Create accounts and collect API keys.
- Star repo, join Discord, register early-bird.
- Set up the empty local toolchain (Node, pnpm, Coral) — but commit nothing project-specific until May 25.

### Phase 1 — Environment, Coral, MCP wiring, first cross-source query (Day 1, Mon May 25)
1. `claude mcp add --scope user coral -- coral mcp-stdio` — wire Coral to Claude Code.
2. Verify: ask Claude Code "List the tables available in Coral" — it should call `list_catalog` / query `coral.tables`.
3. Connect the bundled `github` source (`coral source add github`, supply token).
4. Create `data/grantees/registry.csv` and write a file-backed source for it (see Phase 3). This gives you the first JOIN target with zero API risk.
5. Confirm the loop end-to-end with a trivial cross-source query (grantees CSV × github.pulls).
6. Scaffold the Next.js app; first commit.

> **Establish the DataFusion truth early.** Run `coral sql "SELECT now() - INTERVAL '30 days'"` and a `CAST(... AS DOUBLE)` and a `FILTER (WHERE ...)` aggregate on day 1 so you know exactly which syntax Coral accepts before you depend on it in the hero query.

### Phase 2 — The four source specs (Days 1–4)
Build in ascending order of difficulty. Each spec follows the same agent loop: **write YAML → `coral source lint` → `coral source add --file` → `coral source test` → inspect `coral.columns` → refine.** Start every spec with ONE table and a few columns, validate, then expand. Add `test_queries` to each so `coral source test` is a real pass/fail gate.

General gotchas that apply to all four:
- Credentials (`apikey`, tokens) must be `kind: secret`, never `variable` — Coral rejects credential-like variables.
- Reference inputs at runtime via `from: input` in query params/headers, or `{{input.KEY}}` in templates. Declaring an input does **not** by itself attach it to a request.
- For values that come from the SQL `WHERE` clause, use `from: filter` (string), `from: filter_int`, or `from: filter_bool`.
- Flatten nested fields with `__` (e.g. `author__username`).
- Coral sets `User-Agent: coral` automatically; don't declare it.

#### 2a. DeFiLlama (no auth — build first, ~2–3h)
- Host: `https://api.llama.fi`. Endpoint `/protocols` returns a top-level JSON array of protocols (name, slug, category, chains, tvl, change_1d, change_7d, mcap…). No auth, no pagination.
- `rows_path: []` (the response *is* the array), `row_strategy: direct`.
- Skeleton:
```yaml
name: defillama
version: 0.1.0
dsl_version: 3
backend: http
base_url: https://api.llama.fi
test_queries:
  - SELECT slug, tvl FROM defillama.protocols ORDER BY tvl DESC LIMIT 1
tables:
  - name: protocols
    description: All DeFi protocols tracked by DeFiLlama with TVL and change metrics.
    request:
      method: GET
      path: /protocols
    response:
      rows_path: []
      row_strategy: direct
    pagination:
      mode: none
    columns:
      - { name: name,      type: Utf8 }
      - { name: slug,      type: Utf8 }
      - { name: category,  type: Utf8 }
      - { name: tvl,       type: Float64 }
      - { name: change_1d, type: Float64 }
      - { name: change_7d, type: Float64 }
      - { name: mcap,      type: Float64 }
```
- Expand later with `/v2/historicalChainTvl/{chain}` as a table function if you want time-series.

#### 2b. CoinGecko (demo key header — ~3–4h)
- Host: `https://api.coingecko.com/api/v3`. Auth: `HeaderAuth` header `x-cg-demo-api-key` from `{{input.COINGECKO_API_KEY}}`.
- `/coins/markets?vs_currency=usd` → `page`/`per_page` pagination, response is a top-level array.
- Skeleton:
```yaml
name: coingecko
version: 0.1.0
dsl_version: 3
backend: http
inputs:
  COINGECKO_API_KEY:
    kind: secret
    hint: CoinGecko demo API key
base_url: https://api.coingecko.com/api/v3
auth:
  type: HeaderAuth
  headers:
    - name: x-cg-demo-api-key
      from: input
      key: COINGECKO_API_KEY
test_queries:
  - SELECT id, current_price FROM coingecko.markets WHERE vs_currency = 'usd' LIMIT 1
tables:
  - name: markets
    description: Market data (price, market cap, 24h change) per coin.
    request:
      method: GET
      path: /coins/markets
      query:
        - { name: vs_currency, from: filter, key: vs_currency }
    response:
      rows_path: []
      row_strategy: direct
    pagination:
      mode: page
      page_param: page
      page_start: 1
      page_size: { default: 100, max: 250, query_param: per_page }
    filters:
      - { name: vs_currency, type: Utf8, description: Quote currency, e.g. usd }
    columns:
      - { name: id,                            type: Utf8 }
      - { name: symbol,                        type: Utf8 }
      - { name: name,                          type: Utf8 }
      - { name: current_price,                 type: Float64 }
      - { name: market_cap,                    type: Float64 }
      - { name: price_change_percentage_24h,   type: Float64 }
```

#### 2c. Neynar / Farcaster (cursor pagination + search function — ~3–5h)
- Host: `https://api.neynar.com/v2/farcaster`. Auth: `HeaderAuth` header `x-api-key` from `{{input.NEYNAR_API_KEY}}`.
- Model cast search as a **`kind: search` table function** (provider-ranked retrieval), not a table filter. `/cast/search?q=...` → rows at `result.casts`, cursor at `result.next.cursor`.
- Skeleton:
```yaml
name: neynar
version: 0.1.0
dsl_version: 3
backend: http
inputs:
  NEYNAR_API_KEY: { kind: secret, hint: Neynar API key }
base_url: https://api.neynar.com/v2/farcaster
auth:
  type: HeaderAuth
  headers:
    - { name: x-api-key, from: input, key: NEYNAR_API_KEY }
functions:
  - name: search_casts
    kind: search
    description: Provider-ranked Farcaster cast search.
    search_limits: { default_top_k: 25, max_top_k: 100, max_calls_per_query: 1 }
    args:
      - { name: q, required: true, bind: { arg: q } }
    request:
      method: GET
      path: /cast/search
      query:
        - { name: q, from: arg, key: q }
    response:
      rows_path: [result, casts]
      row_strategy: direct
    pagination:
      mode: cursor_query
      cursor_param: cursor
      response_cursor_path: [result, next, cursor]
    columns:
      - { name: hash,                  type: Utf8 }
      - { name: text,                  type: Utf8 }
      - { name: author__username,      type: Utf8 }
      - { name: author__fid,           type: Int64 }
      - { name: reactions__likes_count, type: Int64 }
      - { name: timestamp,             type: Utf8 }
```
- Call it from SQL: `SELECT hash, text, author__username FROM neynar.search_casts(q => 'optimism grant') LIMIT 25;`

#### 2d. Etherscan V2 multichain (hardest — ~4–6h)
- Host: `https://api.etherscan.io/v2/api`. One key, many chains via `chainid` query param (`from: filter_int`). Module/action params: `module=account&action=tokentx&address=...&apikey=...`.
- **The big gotcha:** Etherscan signals errors and rate limits as `{"status":"0","message":"NOTOK","result":"..."}` *inside an HTTP 200*. Configure `response.ok_path`/`error_path` and a `rate_limit` block, and use conservative page sizes. Rows live at `result` (a top-level field that is an array on success but a string on error — handle with `allow_404_empty: false` plus `ok_path`/`error_path`, and lean on `test_queries` to catch regressions).
- Skeleton (token transfers; expand with `txlist` for native transfers later):
```yaml
name: etherscan
version: 0.1.0
dsl_version: 3
backend: http
inputs:
  ETHERSCAN_API_KEY: { kind: secret, hint: Etherscan V2 API key }
base_url: https://api.etherscan.io/v2
auth:
  type: HeaderAuth
  headers: []            # Etherscan auths via apikey query param, not a header
request_headers:
  - { name: Accept, from: literal, value: application/json }
test_queries:
  - SELECT hash FROM etherscan.token_transfers WHERE chainid = 8453 AND address = '0x0000000000000000000000000000000000000000' LIMIT 1
tables:
  - name: token_transfers
    description: ERC-20 token transfer events for an address on a given chain.
    request:
      method: GET
      path: /api
      query:
        - { name: module,  from: literal, value: account }
        - { name: action,  from: literal, value: tokentx }
        - { name: chainid, from: filter_int, key: chainid }
        - { name: address, from: filter,     key: address }
        - { name: apikey,  from: input,      key: ETHERSCAN_API_KEY }
    response:
      rows_path: [result]
      ok_path: [status]
      error_path: [message]
      row_strategy: direct
    pagination:
      mode: page
      page_param: page
      page_start: 1
      page_size: { default: 50, max: 100, query_param: offset }
    rate_limit:
      extra_statuses: [403]
      retry_after_header: Retry-After
    filters:
      - { name: chainid, type: Int64, description: EVM chain id (1 = Ethereum, 8453 = Base) }
      - { name: address, type: Utf8,  description: Wallet address to query transfers for }
    columns:
      - { name: hash,             type: Utf8 }
      - { name: from_address,     type: Utf8, expr: { kind: path, path: [from] } }
      - { name: to_address,      type: Utf8, expr: { kind: path, path: [to] } }
      - { name: contract_address, type: Utf8 }
      - { name: value,            type: Utf8 }   # keep as Utf8; cast in SQL to avoid precision loss
      - { name: token_symbol,     type: Utf8, expr: { kind: path, path: [tokenSymbol] } }
      - { name: block_time,       type: Timestamp, expr: { kind: format_timestamp, input: seconds, expr: { kind: path, path: [timeStamp] } } }
```
> Because `from` and `to` are SQL-awkward, alias them to `from_address`/`to_address` via `expr: { kind: path }`. Keep big integers (`value`) as `Utf8` and `CAST(value AS DOUBLE)/1e6` in SQL.

**For each spec, the bounty PR checklist:**
- One clean YAML under the repo's community sources path, matching the layout of existing community specs.
- Sensible `test_queries`, descriptions on every table/column, and a short README/PR description noting auth setup and any caveat (e.g. the Etherscan `status:"0"` behaviour).
- Open the PR to `withcoral/coral` **early** (DeFiLlama on Day 1–2) so review can complete before May 31. Drop a note in Discord #ask-for-help.

### Phase 3 — The data layer (Day 1 for CSV; Days 3–4 for reputation)
**Grantee registry (file-backed CSV).** This is your demo's spine and risk-free JOIN target. ~30–60 synthetic-but-realistic rows: `recipient_name, wallet, github_handle, project_slug, program, amount_approved_usdc`. Source spec:
```yaml
name: grantees
version: 0.1.0
dsl_version: 3
backend: file
tables:
  - name: registry
    description: DAO grantee registry (recipient, wallet, github handle, project).
    format: csv
    source:
      location: file:///ABSOLUTE/PATH/tide/data/grantees/
      glob: "**/*.csv"
    columns:
      - { name: recipient_name,       type: Utf8 }
      - { name: wallet,               type: Utf8 }
      - { name: github_handle,        type: Utf8 }
      - { name: project_slug,         type: Utf8 }
      - { name: program,              type: Utf8 }
      - { name: amount_approved_usdc, type: Float64 }
```
> Use a real absolute path. CSV tables need declared columns and support `format_options.has_header`.

**Reputation scoring (LLM → JSONL → file-backed source).** Sentiment can't run inside SQL, so pre-compute it. `scripts/score-reputation.ts`:
1. For each grantee `project_slug`, pull casts: `coral sql --format json "SELECT hash, text, timestamp FROM neynar.search_casts(q => '<slug>') LIMIT 50"`.
2. Batch the casts through Claude Haiku with a strict JSON-only prompt returning `{ cast_hash, sentiment_score: 0..1, relevance: 0..1 }`.
3. Write `data/reputation/casts_scored.jsonl` with `{ project_slug, cast_hash, sentiment_score, relevance, scored_at }`.
4. Expose as a file-backed `reputation` source (`format: jsonl`, columns declared; nested fields as `Json`).

The hero query then `LEFT JOIN reputation.casts_scored` — live social data, distilled to a clean numeric column the SQL can aggregate. Re-run the script on a timer (or a "Refresh" button) for freshness; it also showcases file-backed sources as a bonus.

### Phase 4 — The agent backend (Days 2–4)
`lib/coral.ts` — the bridge:
```ts
// runCoralSql: execute read-only SQL via the local Coral CLI, return rows + timing.
import { execFile } from "node:child_process";
export async function runCoralSql(sql: string) {
  const start = Date.now();
  const { stdout } = await execFileP("coral", ["sql", "--format", "json", sql]); // verify flag via `coral sql --help`
  return { rows: JSON.parse(stdout), ms: Date.now() - start };
}
```
> Confirm the exact JSON output flag with `coral sql --help` on Day 1 (`--format json` vs `--json`) and adapt. Capture cache-hit info if Coral surfaces it; otherwise infer "fast = cached" from latency for the demo footer.

`lib/agent.ts` + `api/ask/route.ts` — the loop (Anthropic SDK tool-use):
- System prompt: Tide is a treasury risk co-pilot; the catalog is Coral; **prefer ONE `sql` call with JOINs/CTEs over many round-trips** (this is Coral's own guidance and it's exactly what judges reward). Provide the available schemas/tables (from `coral.tables`) in the system prompt or let the model discover via a `describe_catalog` tool.
- Tools: `run_coral_sql(sql: string)`; optionally `list_catalog()` / `describe_table(schema, table)` that proxy the same CLI. The model writes SQL → tool executes → model reads rows → model answers, **streaming** tokens and emitting the executed SQL so the UI can show it.
- Guard rails: read-only only (Coral enforces this too), cap rows, timeout, and surface errors back to the model so it can self-correct its SQL.
- Model: `claude-opus-4-7` for the agent.

### Phase 5 — The frontend (Days 2–5)
Before writing any component, **read the `frontend-design` skill** (and apply a single restrained design language — this is the *Aesthetics & UX* score). Components:
- **ChatPanel** — plain-English questions; streamed answers; suggested starter prompts (the hero question + "flag the ones at risk").
- **SqlPreview** — shows the *exact* SQL the agent ran, syntax-highlighted, with the money footer: `5 sources · 384ms · cached`. This is the visual proof of "Best Use of Coral." Make it prominent, not hidden.
- **ResultsGrid** — sortable table; each row clickable to reveal the underlying per-source trace; **SourceChips** badge which sources contributed (on-chain / GitHub / Farcaster / DeFiLlama).
- **RiskBadge / Risk view** — red/amber/green derived from `tvl_change_7d`, exit-pattern flags, and reputation. The second hero question ("flag the ones at risk") lights this up.
- Empty/loading/error states that look intentional (judges notice).

### Phase 6 — Hero queries (lock these by Day 5)
Keep a `docs/QUERIES.md` with the 2–3 canonical statements, each tested against live Coral:
1. **Delivery + reputation** (the main hero query in §0).
2. **Risk flag** — JOIN `defillama.protocols` (`change_7d < -30`) with outgoing-transfer exit patterns from `etherscan` to surface treasuries draining + collapsing.
3. **Coverage gap** (optional) — grantees with payments but zero merged PRs and zero positive casts.

### Phase 7 — Polish, caching, demo mode (Day 5–6)
- Warm Coral's cache before recording (run the hero queries once); the second run shows the low-latency, cached footer.
- `scripts/snapshot-fixtures.ts` writes hero-query outputs to JSON; `DEMO_MODE=1` serves them so the deployed link and video are b/ bulletproof.
- README with architecture diagram, the hero query, setup, and the four source-spec links.

### Phase 8 — Deployment (Day 6)
- `Dockerfile`: base Node image → install `coral` → copy app → at container start, run `scripts/add-sources.sh` (idempotent `coral source add` for all four API sources reading keys from env-var inputs, plus the two file sources) → `pnpm build && pnpm start`.
- Deploy to **Railway/Render/Fly.io**; set `ETHERSCAN_API_KEY`, `COINGECKO_API_KEY`, `NEYNAR_API_KEY`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY` as secrets (these become Coral inputs via matching env-var names).
- Verify the public URL runs a live hero query end-to-end. Keep `DEMO_MODE` as the fallback.

### Phase 9 — Demo video (Day 6–7, ≤3:00)
Full script lives in `docs/DEMO-SCRIPT.md`. Beats:
1. **0:00–0:10** Real DAO grants page + the money number (Optimism ~20.4M OP to 374 projects in 2024). "Who actually shipped? Who's a risk?"
2. **0:10–1:05** Claude Code over Coral MCP: type the hero question; watch Claude write the five-source JOIN live; footer `5 sources · 384ms · 71% cached`.
3. **1:05–1:35** Results grid; click a row → per-source trace + attribution chips.
4. **1:35–2:05** "Flag the ones at risk" → second JOIN; two rows go red. 8-sec voiceover on the Wonderland/0xSifu pattern as the recognizable risk this catches in 400ms.
5. **2:05–2:35** Cut to GitHub: four merged/open PRs against `withcoral/coral`. "These sources now ship for every Coral user."
6. **2:35–3:00** The deployed Tide dashboard; Apache-2.0; built in a week with Claude Code + Coral. Logo, GitHub URL, live URL.
> Open on the working product, not slides. Lead with the elevator line. Record at 1080p+, clean audio, captions.

### Phase 10 — Bounty execution (parallel, finish Day 7)
- **Source-spec PRs** (×4): opened early, each with README + `test_queries`. Target 3+ accepted before deadline.
- **How-to guide** (Keychron): a 2–3 page Hashnode/dev.to post — "I built a DAO treasury risk agent with Claude Code + Coral: here's the route." Reproducible, shareable. Link it in the submission.
- **Discord showcase** (Claude Max + YouTube highlight): post in #show-and-tell with screenshots + write-up, then cross-post to LinkedIn/X tagging Coral.
- **Submit** via the official form: GitHub link, deployed link, YouTube link. One person submits.

---

## 5. Seven-day timeline

| Day | Focus | Ship by end of day |
|---|---|---|
| **Sun 24 (pre)** | Prep only (no code) | Accounts, keys, repo read, early-bird registered, repo starred, Discord joined |
| **Mon 25** | Foundations | MCP wired, github source, grantees CSV source, first cross-source query, Next.js scaffold, **DeFiLlama spec + PR #1**, DataFusion syntax confirmed |
| **Tue 26** | Market data + UI shell | **CoinGecko spec + PR #2**, chat UI + SQL preview skeleton, `runCoralSql` bridge |
| **Wed 27** | Social + agent loop | **Neynar spec + PR #3** (search fn), agent tool-use loop answering real questions |
| **Thu 28** | On-chain + reputation | **Etherscan spec + PR #4**, reputation scoring script → JSONL source, hero query v1 runs |
| **Fri 29** | Polish | Results grid, source chips, risk view, hero queries locked, cache warmed, README |
| **Sat 30** | Deploy + record | Docker → Railway/Fly live URL, DEMO_MODE fallback, record 3-min video, draft how-to guide |
| **Sun 31** | Ship | Discord showcase + socials, final commit, **submit form before deadline** |

---

## 6. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Source-spec PRs not reviewed before deadline | Medium | Open DeFiLlama PR on Day 1; ping maintainers in Discord; PRs still boost "Best Use of Coral" + "Learning" scores even if merge slips |
| Etherscan `status:"0"` rate-limit inside HTTP 200 | Med-high | Conservative paging (offset=50), `rate_limit` + `ok_path`/`error_path`, cache aggressively, document in PR |
| DataFusion SQL ≠ Postgres (INTERVAL/FILTER/cast) | Med | Confirm syntax Day 1 with throwaway `coral sql` queries before depending on it |
| Coral can't run on Vercel serverless (local-first) | High if unplanned | Deploy to a container host with coral baked in; env-var inputs; DEMO_MODE fallback |
| Sentiment needs an LLM inside the data path | Med | Pre-score to JSONL via a script; JOIN the file-backed `reputation` source |
| Four specs in a week is ambitious solo | Med | DeFiLlama is a ~2h spec; 3 of 4 still meets the Top-10 bar; Claude Code drafts, you lint/test |
| Live API flakiness during the demo | Med | Warm cache + `DEMO_MODE` fixtures; record when APIs are healthy |
| Coral maintainers reject a crypto source as niche | Low | DeFiLlama/CoinGecko/Etherscan are mainstream, language-agnostic; precedent exists (shopify, huggingface, hubspot) |
| `coral sql` JSON flag differs from assumed | Low | Check `coral sql --help` Day 1; adapt `lib/coral.ts` |

---

## 7. Definition of Done (submission checklist)

- [ ] New project, all code written during the event, first commit May 25.
- [ ] `withcoral/coral` starred; Coral Discord joined.
- [ ] Four source specs lint + `coral source test` green; PRs opened upstream (3+ ideally accepted).
- [ ] Hero query runs live across **5 sources** in one JOIN; SQL preview + attribution + timing footer visible in the UI.
- [ ] "Flag the ones at risk" second query lights the risk view.
- [ ] Deployed link works (container host) with DEMO_MODE fallback proven.
- [ ] README: architecture diagram, hero query, setup, source-spec links, Apache-2.0.
- [ ] ≤3-min YouTube demo, opens on the product, captions, clean audio.
- [ ] How-to guide published and linked (Keychron bounty).
- [ ] Discord #show-and-tell post + LinkedIn/X post tagging Coral.
- [ ] Submission form filed (GitHub + deployed + YouTube) before deadline.
- [ ] All materials say **Coral by withcoral.com / @withcoral** (not Coral Protocol).

---

## 8. Appendix — Coral cheat-sheet

```bash
coral --version
coral source list                          # what's installed
coral source add github                    # add a bundled source (prompts for token)
coral source lint ./coral/sources/x.yaml   # validate before install (no creds needed)
coral source add --file ./coral/sources/x.yaml   # install (reads inputs from env vars; --interactive to prompt)
coral source test x                         # strict pass/fail (runs test_queries)
coral sql "SELECT * FROM coral.tables"      # list tables
coral sql "SELECT column_name FROM coral.columns WHERE schema_name='etherscan' AND table_name='token_transfers'"
coral sql --format json "<SQL>"             # JSON output for the app (verify flag via --help)
claude mcp add --scope user coral -- coral mcp-stdio   # wire to Claude Code
npx skills add withcoral/skills             # install the source-authoring skill for your agent
```

**Introspection tables:** `coral.tables`, `coral.columns`, `coral.filters`, `coral.table_functions`, `coral.inputs`.
**MCP tools:** `sql`, `list_catalog`, `search_catalog`, `describe_table`, `list_columns`.
**Column types:** `Utf8`, `Int64`, `Float64`, `Boolean`, `Timestamp`, `Json`.
**JSON in SQL:** `json_get_str(col, 'key')`, `json_get_int`, `json_contains`, … (plain keys, not JSONPath).
**Golden rule:** prefer ONE `sql` call with JOINs/CTEs over many tool round-trips — it's faster, cheaper, and it's literally the thing being judged.
