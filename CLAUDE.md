# CLAUDE.md — Tide project context

## Project
Tide: an on-chain risk & reputation co-pilot for DAO treasuries. Hackathon entry for Pirates of the Coral-bean (WeMakeDevs × Coral), Track 1 Enterprise Agent. Solo build, ~7 days, Claude Code assisted.

## The win condition
A single cross-source SQL JOIN across 5 sources (grantees CSV + etherscan + github + reputation JSONL + defillama), shown live, with the SQL visible in the UI. Judging criteria: Potential Impact, Creativity & Originality, Learning & Growth, Technical Implementation, Aesthetics & UX, Best Use of Coral. The hero query and the four upstreamed source specs are how we score.

## Coral is the sponsor tool — respect these facts
- Coral = withcoral.com, the local-first "any API/file/db as read-only SQL for agents" query layer. NOT Coral Protocol (Solana). Always reference @withcoral.
- Source specs: YAML, dsl_version 3, backend http|file. Column types: Utf8, Int64, Float64, Boolean, Timestamp, Json. Nested fields flattened with double underscores (author__username), never dots.
- Auth: HeaderAuth / BasicAuth / CustomAuth. Credentials are `kind: secret` inputs; referenced via `from: input` or `{{input.KEY}}`. OAuth auto-refresh is NOT implemented — prefer static keys.
- WHERE-clause pushdown: `from: filter` / `filter_int` / `filter_bool`. Search endpoints = `kind: search` table functions, called as `FROM src.fn(q => '...')`.
- Pagination: none|auto|page|offset|cursor_query|cursor_body|link_header.
- SQL is DataFusion-flavored, not Postgres.
- MCP tools: sql, list_catalog, search_catalog, describe_table, list_columns. Introspection: coral.tables, coral.columns, coral.filters, coral.table_functions, coral.inputs.

## Iron rules
1. NEVER author a source spec from memory. Always: read live docs + bundled sources/core/ examples → write → `coral source lint` → `coral source add --file` → `coral source test` → inspect coral.columns → refine. Green test or it's not done.
2. Verify before depending: DataFusion syntax, the `coral sql` JSON flag, exact flattened column names.
3. Prefer ONE sql call with JOINs/CTEs over multiple tool round-trips.
4. Hackathon compliance: new project, all code during the event, first commit May 25, small frequent commits.
5. Coral can't run on serverless — deploy to a container host with coral baked in; keep a DEMO_MODE fixtures fallback.
6. When blocked by a Coral limitation: check docs first, then surface options to the human — don't silently hack around it.

## Stack
Next.js 15 (App Router) + TS + Tailwind + shadcn/ui. Anthropic SDK → MiMo-V2.5-Pro (Xiaomi, Anthropic-compatible API). pnpm. Docker → Railway/Fly.io.

## Layout
coral/sources/{defillama,coingecko,neynar,etherscan}.yaml · data/grantees/registry.csv · data/reputation/casts_scored.jsonl · scripts/{score-reputation,add-sources,snapshot-fixtures} · src/app/api/ask/route.ts · lib/{coral,agent}.ts · components/{ChatPanel,SqlPreview,ResultsGrid,SourceChips,RiskBadge}

## Definition of done
Four specs test-green + PR'd upstream; hero query live across 5 sources with SQL/attribution/timing in the UI; "flag the ones at risk" lights the risk view; deployed link works (+DEMO_MODE); README with diagram + hero query; ≤3-min demo; how-to guide; Discord showcase; submission filed.
