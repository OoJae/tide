# Pirates of the Coral-bean: Five Winning Ideas and a Championing Recommendation

> Research report underpinning the decision to build **Tide**. Companion to `Tide-Build-Plan.md` and `Tide-Claude-Code-Master-Prompt.md`.

## TL;DR
- **Build "Tide" — an on-chain risk and reputation co-pilot for crypto-native DAOs and funds — and submit it to Track 1 (Enterprise Agent).** It is the only one of the five concepts below that simultaneously (a) showcases Coral's killer cross-source SQL JOIN with data nobody else at this hackathon will touch, (b) lets a solo developer ship 3–4 *new* community source specs (DeFiLlama, CoinGecko, Etherscan, Neynar/Farcaster) — stacking the "Top 10 source specs → $100 cash + $50 donation to sea-life charity" bounty up to 4×, and (c) leans directly into existing crypto/trading/data-science strengths so the demo narrative sounds authentic in three minutes.
- **Track 1 (Enterprise Agent, MacBook Neo) is the better target than Track 2 (Apple iPad).** Track 1's prize is materially larger, and the hackathon page's own Track 1 examples (AI SRE, Sprint Health, Customer Escalation) all read as "DevOps clones built by enterprise engineers" — meaning a *crypto-native* enterprise pitch differentiates instantly. Every serious Track 2 entry is forced to first build a custom Gmail/Calendar/YouTube source connector (the hackathon explicitly flags those as "not built yet"), which compresses what they can ship.
- **Stack the bounties:** ship the project + 3–4 upstreamed source specs (PRs to `withcoral/coral`) + a Hashnode/dev.to "how-to" guide + a Discord #show-and-tell post tagging Coral on LinkedIn/X. A realistic ceiling: **track win (MacBook Neo) + 3× accepted source-spec bounties (~$300 cash + $150 charity donation) + Keychron for best guide + Claude Max voucher for top-50 showcase + early-bird $50 Amazon gift card if registered by May 18** — five distinct prize lanes from one project, plus indirect exposure on Kunal Kushwaha's YouTube channel (~863K subscribers as of January 2026).

---

## Key Findings

### Coral, ground-truth (verified against withcoral.com/docs)
Coral (withcoral.com — *not* to be confused with Coral Protocol on Solana, a different company) is a local-first, open-source query layer that exposes any API, database or file as **read-only SQL tables**, executes SQL JOINs across them, and is callable from a CLI or over MCP (so Claude Code can invoke it natively). The product's structural wedge is *cross-source SQL joins for agents*. Coral's own published benchmark (in the `withcoral/coral` README) reports that across 82 real-world AI tasks using Claude Opus 4.6 against direct provider MCPs (Datadog, Sentry, Linear, Slack, GitHub), Coral made Claude **20% more accurate, 2× more cost-efficient, and 42% lower latency**; on the multi-hop coding-agent subset, **accuracy improved 31% and cost-efficiency 3.4×**. These are first-party numbers — strong, but cite precisely and don't overclaim.

**Confirmed Coral capabilities relevant to scope:**
- Source specs are YAML with `dsl_version: 3`, `backend: http` or `backend: file`.
- Column types: `Utf8`, `Int64`, `Float64`, `Boolean`, `Timestamp` (epoch microseconds internally), `Json` (queryable with `json_get_*` functions).
- Auth: `HeaderAuth`, `BasicAuth`, `CustomAuth` (e.g. `aws_sigv4`). OAuth authorization-code + PKCE supported during interactive setup, but **automatic token refresh is not implemented yet** — favour static API keys or long-lived tokens.
- Pagination modes: `none`, `auto`, `cursor_query`, `cursor_body`, `page`, `offset`, `link_header`.
- **SQL `WHERE` clauses push down into request params** via value sources `filter`, `filter_int`, `filter_bool`, `filter_split`, plus `arg*` equivalents for table functions — so `WHERE chainid = 8453` becomes a URL query param.
- Provider-ranked search is a table function (`kind: search`) invoked from SQL with named args: `FROM github.search_issues(q => '...')`.
- Agent-friendly authoring loop: `coral source lint` → `coral source add --file` → `coral source test`, with introspection via `coral.tables`, `coral.columns`, `coral.filters`, `coral.table_functions`, `coral.inputs`.
- There is an official **Coral source-spec authoring skill** for coding agents: `npx skills add withcoral/skills`.
- MCP server (`coral mcp-stdio`) exposes tools `sql`, `list_catalog`, `search_catalog`, `describe_table`, `list_columns`. Claude Code install: `claude mcp add --scope user coral -- coral mcp-stdio`.
- SQL dialect is **DataFusion-flavoured**, not Postgres — verify `INTERVAL`, `FILTER (WHERE ...)`, and casts early.

**Bundled sources (shipping in the binary, ~24, all read-only):** `claude`, `clickup`, `cloudwatch_logs`, `cloudwatch_metrics`, `codex`, `confluence`, `datadog`, `github`, `gitlab`, `grafana`, `incident_io`, `intercom`, `jira`, `launchdarkly`, `linear`, `notion`, `openobserve`, `pagerduty`, `posthog`, `sentry`, `slack`, `statusgator`, `stripe`, `wandb`, plus file-backed Parquet/JSONL/JSON/CSV.

**Community sources (importable, ~70):** include `auth0`, `cloudflare`, `databricks`, `figma`, `google_drive`, `hn`, `hubspot`, `huggingface`, `k8s`, `neo4j`, `neondb`, `osv`, `pinecone`, `shopify`, `vercel`, `weaviate`, and many more. Note **OSV already exists** as a community source despite some early hackathon copy implying otherwise.

**Flagged as "not built yet" (bounty-eligible):** Gmail, Google Calendar, Discord, LinkedIn, YouTube, Twitter, Apple Health, Google Sheets — plus *any* useful new source.

### Hackathon, ground-truth
- **Dates:** May 25–31 2026, fully online.
- **Tracks:** Track 1 Enterprise Agent (MacBook Neo per teammate, up to 4); Track 2 Personal Agent (Apple iPad per teammate). One winning crew per track. No splitting.
- **Total pool:** $10,000+.
- **Eligibility:** ⭐ star `withcoral/coral`, join Coral Discord, build a *new* project during the event, submit GitHub link + deployed link + ≤3-min YouTube demo.
- **Six judging criteria:** Potential Impact; Creativity & Originality; Learning & Growth; Technical Implementation; Aesthetics & UX; Best Use of Coral (explicitly "SQL interface, cross-source joins, schema learning, caching, and MCP integration").
- **Stackable bounties:** Top 10 source-spec PRs → $100 cash + $50 charity donation each; best "how-to" guide → Keychron keyboard; top-50 Discord showcase → 5× Claude Max 1-month vouchers + YouTube highlight; early bird (register by May 18) → random crew gets ₹5,000 / $50 gift card; social share at registration → 10 random swag boxes.

### What wins agentic / sponsor-centric data hackathons (2025 patterns)
1. **Deep, structural use of the sponsor's unique capability.** For Coral that is the **cross-source SQL JOIN** — the demo SQL must be the hero of the video.
2. **A believable, named problem with a money or time number attached.**
3. **A three-minute demo that opens on the working product, not slides.**
4. **Polish over feature count** — one magical query that lands in 30 seconds beats five half-built features.
5. **Contributing back to the OSS sponsor** (source specs, PRs, guides) — consistently rewarded and here explicitly bountied.

---

## The Five Ideas

### Idea #1 — Tide: on-chain risk & reputation co-pilot for DAO treasuries (TRACK 1) — **WINNER**
**Concept.** DAOs, L2 foundations, and crypto funds manage payouts, grants, and operations across on-chain wallets, off-chain coordination tools (Linear/Notion/GitHub), and public reputation (Farcaster, DeFiLlama, CoinGecko). They reconcile this by hand. Tide answers, in one SQL JOIN, questions like *"Show me every grantee wallet we paid >$10k that's also delivered a merged GitHub PR this month and is positively cited on Farcaster."*

**Sources.** Existing: `github`, `linear`, `notion`, `slack`, file-backed CSV/JSONL. To build (bounty-eligible): **DeFiLlama** (no auth, ~2–3h), **CoinGecko** (demo key, ~3–4h), **Neynar/Farcaster** (cursor + search fn, ~3–5h), **Etherscan** (V2 multichain, ~4–6h).

**Why it wins.** Impact 10 (Optimism alone distributed ~20.4M OP to 374 projects across 3 Retro Funding rounds in 2024, plus 23M OP via the Grants Council — tens of millions from one ecosystem; aggregate across chains → hundreds of millions/yr). Originality 10 (no crypto entry expected). Best Use of Coral 10 (four new sources, JOINs everywhere, caching, MCP). Learning 9 (four authored specs). Technical 9 (time-window joins, filter pushdown, search fns). UX 8 (Next.js chat + live SQL preview + attribution chips). **Total 56/60.**

**Risks.** Etherscan returns errors as `{"status":"0"}` inside HTTP 200 (use conservative paging + `rate_limit`/`error_path` handling). Farcaster sentiment needs an LLM — pre-score to a file-backed source rather than calling an LLM inside SQL. Source-spec PRs need review time — submit early. DataFusion SQL ≠ Postgres — test early.

### Idea #2 — IncidentLens: AI SRE Investigator (TRACK 1)
PagerDuty + Datadog + GitHub + StatusGator + Cloudflare (+ optional AWS Health) → one query that classifies an incident as deploy-caused vs. upstream vs. WAF. **Total ~47/60. Weakness: it's the hackathon's own example — maximum crowding.** Highest feasibility (almost all sources exist).

### Idea #3 — Coral Atlas: Geospatial / Hazard Intelligence (TRACK 1)
Asset registers (Parquet) + USGS earthquakes + NOAA storms + NASA FIRMS wildfires + Linear tickets → "every asset within 50km of an M4+ quake where production dropped >20%." **Total ~52/60.** Four no-auth sources, striking map UI. Weakness: narrower enterprise buyer universe; geospatial in DataFusion SQL needs bbox pre-filtering (no PostGIS).

### Idea #4 — Plot Twist: Personal Trading & Content-Creator Twin (TRACK 2)
Own trade CSV + Etherscan + CoinGecko + DeFiLlama + Beehiiv/Ghost + Farcaster → "which posts I wrote correlated with my best trades?" **Total ~48/60.** Reuses 3–4 of Tide's specs — the natural **fallback** if Tide hits a blocker. Weakness: n=1 personal problem caps impact.

### Idea #5 — Maintainer Mate: OSS Maintainer Co-pilot (TRACK 1/2)
GitHub + Slack + OSV + crates_io/PyPI → triage issues, dedupe, draft release notes, rank security issues by downstream blast radius. **Total ~49/60.** High feasibility, but anchors to the hackathon's stated personal-track example.

### Scorecard

| Criterion | Tide #1 | IncidentLens #2 | Atlas #3 | Plot Twist #4 | Maintainer #5 |
|---|---|---|---|---|---|
| Potential Impact | **10** | 9 | 9 | 6 | 9 |
| Creativity & Originality | **10** | 6 | 9 | 9 | 7 |
| Learning & Growth | 9 | 6 | 9 | 8 | 7 |
| Technical Implementation | 9 | 9 | 8 | 8 | 9 |
| Aesthetics & UX | 8 | 8 | 8 | 8 | 8 |
| Best Use of Coral | **10** | 9 | 9 | 9 | 9 |
| **Total / 60** | **56** | 47 | 52 | 48 | 49 |
| New source specs | **4** | 0–1 | 4 | 3–4 | 2 |

---

## Recommendation: Build Tide, Track 1

**Why Track 1 over Track 2.** Bigger prize (MacBook vs iPad). Track 2's examples are dominated by "not built yet" sources, forcing competitors to spend their week building a Gmail/Calendar/YouTube connector before they can build anything. Track 1's examples skew to existing DevOps sources, so the field clusters around "yet another AI SRE." A crypto-native enterprise pitch is a structural arbitrage. DAOs and crypto funds are *real* organizations with *real* treasuries — the Enterprise framing is honest, not a stretch.

**Bounty stack (realistic ceiling).** MacBook Neo (track win) + ~$300–$450 cash + ~$150–$200 charity donation (3 of 4 specs accepted) + Keychron (best guide) + Claude Max voucher (top-50 showcase) + ₹5,000/$50 gift card (early bird draw) + indirect exposure to ~863K-subscriber YouTube audience.

**Demo sketch (3:00).** Cold-open on a real DAO grants page and the money number → type a plain-English question into Claude Code over Coral MCP → watch Claude write a five-source JOIN, footer reads `5 sources · 384ms · 71% cached` → follow-up "flag the ones at risk" runs a second JOIN catching exit patterns (8-second voiceover on the Wonderland/0xSifu story as the recognizable risk pattern) → cut to four merged PRs against `withcoral/coral` → close on the deployed Tide dashboard. Apache-2.0, built in a week with Claude Code + Coral.

**Caveats.** Track-win projections are speculative (field not yet observable). The source-spec bounty caps at 10 across the whole event — land the first clean PRs early. Coral is young (some DSL features like OAuth auto-refresh not yet implemented) — build defensively. Cite the benchmark numbers precisely. Two unrelated "Corals" exist — always reference **Coral by withcoral.com / @withcoral**.
