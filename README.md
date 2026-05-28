# Tide

> On-chain risk & reputation co-pilot for DAO treasuries and crypto funds.

Tide turns scattered on-chain, social, and development data into **one SQL surface via [Coral](https://withcoral.com)** and an agent that answers questions no single tool can. Ask things like: *"Show every grantee we paid >$10k of USDC who also merged a PR this month and is positively cited on Farcaster, and flag any whose protocol TVL just collapsed."*

That answer is a **single cross-source JOIN** across on-chain transfers, GitHub, Farcaster, DeFiLlama, and a local grantee registry.

**Built for [Pirates of the Coral-bean](https://withcoral.com/discord) hackathon** — Track 1: Enterprise Agent.

## Architecture

```
                         TIDE WEB APP (Next.js 15)
                 Chat UI + live SQL preview + results grid
                    source-attribution chips + risk view
                                 |
                        POST /api/ask (streamed)
                                 |
                         Agent (MiMo-V2.5-Pro)
                    tool: run_coral_sql(sql) -> Coral CLI
                                 |
            +--------------------+--------------------+
            |                    |                    |
     CORAL (local query engine)                        |
     one SQL plane, cross-source JOIN, caching         |
            |                    |                    |
     etherscan    defillama    coingecko    neynar     github
            |                    |                    |
            +--------------------+--------------------+
                                 |
                   + file-backed sources:
                   grantees.registry (CSV)
                   reputation.casts_scored (JSONL)
```

## The Hero Query

```sql
SELECT
  g.recipient_name,
  g.amount_approved_usdc,
  d.tvl AS protocol_tvl,
  d.change_7d AS tvl_change_7d,
  COUNT(DISTINCT ga.pr_number) FILTER (WHERE ga.state = 'merged') AS merged_prs,
  COUNT(DISTINCT rep.cast_hash) FILTER (WHERE rep.sentiment_score > 0.5) AS positive_mentions,
  AVG(rep.sentiment_score) AS avg_sentiment
FROM grantees.registry g
JOIN defillama.protocols d ON d.slug = g.project_slug
LEFT JOIN github_activity.prs ga ON ga.org = g.github_handle
LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
GROUP BY g.recipient_name, g.amount_approved_usdc, d.tvl, d.change_7d
ORDER BY d.tvl DESC;
```

## Data Sources

| Source | Backend | Auth | Description |
|--------|---------|------|-------------|
| `grantees` | CSV file | none | DAO grantee registry |
| `github_activity` | CSV file | none | Pre-fetched PR data |
| `reputation` | JSONL file | none | Pre-scored Farcaster sentiment |
| `defillama` | HTTP | none | DeFi protocol TVL and metrics |
| `coingecko` | HTTP | API key | Crypto market data |
| `etherscan` | HTTP | API key | ERC-20 token transfers |
| `neynar` | HTTP | API key | Farcaster cast search |
| `github` | Bundled | token | Full GitHub API access |

## Quick Start

```bash
# 1. Install Coral
brew install withcoral/tap/coral

# 2. Clone and install
git clone https://github.com/your-username/tide.git && cd tide
pnpm install

# 3. Set up env vars
cp .env.example .env.local
# Add your API keys: MIMO_API_KEY, COINGECKO_API_KEY, ETHERSCAN_API_KEY, etc.

# 4. Register Coral sources
source .env.local && ./scripts/add-sources.sh

# 5. Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and ask a question.

## Tech Stack

- **[Coral](https://withcoral.com)** — local-first query layer (any API/file/db as read-only SQL for agents)
- **[Next.js 15](https://nextjs.org)** (App Router) + TypeScript + Tailwind CSS v4
- **[MiMo-V2.5-Pro](https://mimo.xiaomi.com)** (Xiaomi) — Anthropic-compatible API for the agent
- **Docker** for deployment

## Deployment

```bash
# Build and run locally
docker build -t tide . && docker run -p 3000:3000 --env-file .env.local tide

# Or deploy to Railway
railway login && railway init && railway up
```

Set these environment variables on your hosting platform:
- `MIMO_API_KEY` / `MIMO_BASE_URL`
- `COINGECKO_API_KEY`
- `ETHERSCAN_API_KEY`
- `NEYNAR_API_KEY`
- `GITHUB_TOKEN` (for the bundled GitHub source)

## Project Structure

```
coral/sources/         # 8 Coral source specs (YAML)
data/grantees/         # Grantee registry CSV
data/github/           # GitHub activity CSV
data/reputation/       # Scored Farcaster casts JSONL
data/fixtures/         # DEMO_MODE cached query results
scripts/               # add-sources.sh, snapshot-fixtures.ts
src/app/api/ask/       # Agent loop (SSE streaming + tool use)
src/app/components/    # UI components (SqlPreview, ResultsGrid, etc.)
src/lib/               # coral.ts (CLI bridge), agent.ts (prompt + tools)
```

## License

Apache-2.0

---

*Built with [Claude Code](https://claude.ai/code) + [Coral](https://withcoral.com) for the Pirates of the Coral-bean hackathon.*
