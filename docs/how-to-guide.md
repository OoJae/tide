# I Built a DAO Treasury Risk Agent with Claude Code + Coral -- Here's How

A step-by-step walkthrough of building Tide, an on-chain risk and reputation co-pilot for DAO treasuries, using Coral's local-first SQL query layer and an AI agent powered by the Anthropic SDK.

---

## The Problem: DAO Treasury Management is Fragmented

If you manage a DAO treasury or run a grants program, you know the pain. Your data lives in at least five places: grantee registries in spreadsheets, protocol TVL on DeFiLlama, development activity on GitHub, on-chain transfers on Etherscan, and community sentiment scattered across Farcaster and Twitter.

Answering a simple question like "Which of our grantees have declining TVL, low developer activity, and negative community sentiment?" means opening five browser tabs, exporting five CSVs, and doing a manual VLOOKUP in a spreadsheet. It is slow, error-prone, and does not scale.

Tide solves this with a single SQL query that JOINs across all five data sources. One question, one query, one answer -- powered by Coral and an AI agent.

## What is Coral

[Coral](https://withcoral.com) (by @withcoral) is a local-first query layer that exposes any API, file, or database as read-only SQL tables. You define a YAML source spec describing the endpoint, columns, and pagination strategy, and Coral handles the rest -- fetching, flattening, caching, and serving it through a DataFusion SQL engine.

The key insight: Coral does not care where the data comes from. A CSV file, a REST API, a PostgreSQL database -- they all become tables you can JOIN. This is what makes the Tide hero query possible: five different sources, five different formats, one SQL statement.

Coral runs locally via its CLI (`coral sql`, `coral source add`, `coral source test`). It is not a hosted service -- you install it, point it at your source specs, and query. This matters for hackathons: no accounts, no API keys for Coral itself, just YAML files and a command line.

## Architecture: The Tide Stack

Tide is a Next.js 15 app (App Router, TypeScript, Tailwind, shadcn/ui) with three layers:

```
User Question
     |
     v
+-----------+     SSE stream     +----------------+
|  Chat UI  | <---------------- | /api/ask route |
+-----------+                    +----------------+
     |                                  |
     v                                  v
SourceChips                    Anthropic SDK (MiMo-V2.5-Pro)
RiskBadge                      tool-use loop:
ResultsGrid                      - run_coral_sql
SQLPreview                       - list_catalog
                                 - describe_table
                                        |
                                        v
                              +-------------------+
                              |   Coral CLI       |
                              |   (coral sql)     |
                              +-------------------+
                                        |
                        +-------+-------+-------+-------+
                        |       |       |       |       |
                     grantees  defillama  github  etherscan  reputation
                       (CSV)    (HTTP)    (CSV)    (CSV)     (JSONL)
```

**Backend**: Next.js API route at `/api/ask` runs an agentic loop. It calls the MiMo-V2.5-Pro model (Xiaomi, Anthropic-compatible API) with tool-use definitions. The model decides what SQL to write, calls `run_coral_sql`, reads the results, and responds.

**Coral layer**: Nine source specs define how to fetch and flatten data from grantees (CSV), DeFiLlama (HTTP), GitHub activity (CSV), Etherscan transfers (CSV), Farcaster reputation (JSONL), CoinGecko (HTTP), Neynar (HTTP), Etherscan live (HTTP), and GitHub (bundled API).

**Frontend**: A chat UI that streams responses via SSE. It renders SQL previews, colored source attribution badges (SourceChips), risk indicators (RiskBadge with red/amber/green), and a sortable results grid.

## Building a Source Spec: DeFiLlama as an Example

Every Coral source starts as a YAML file. Here is the DeFiLlama spec -- the simplest one in Tide, because it is a public API with no authentication:

```yaml
name: defillama
version: 0.1.0
dsl_version: 3
backend: http
description: >-
  DeFi protocol TVL, market cap, and change metrics from DeFiLlama.
  No authentication required.
base_url: https://api.llama.fi
test_queries:
  - SELECT name, slug, tvl FROM defillama.protocols ORDER BY tvl DESC LIMIT 1
  - SELECT slug, change_7d FROM defillama.protocols WHERE change_7d < -10 LIMIT 5
tables:
  - name: protocols
    description: >-
      All DeFi protocols tracked by DeFiLlama with TVL, market cap,
      and price change metrics over 1d, 7d, and 30d windows.
    request:
      method: GET
      path: /protocols
    response:
      rows_path: []
      row_strategy: direct
    pagination:
      mode: none
    columns:
      - name: name
        type: Utf8
        description: Protocol display name.
      - name: slug
        type: Utf8
        description: Protocol slug identifier used for cross-referencing.
      - name: category
        type: Utf8
        description: DeFi category (e.g. Liquid Staking, Lending, DEX).
      - name: tvl
        type: Float64
        description: Total value locked in USD.
      - name: change_1d
        type: Float64
        description: TVL percentage change over the last 1 day.
      - name: change_7d
        type: Float64
        description: TVL percentage change over the last 7 days.
```

Let me break down what each section does:

**`dsl_version: 3`** -- Coral's YAML schema version. Always 3 for current specs.

**`backend: http`** -- This source fetches from a REST API. The alternative is `backend: file` for local CSV/JSONL files.

**`base_url`** -- The root URL for all requests. Paths in the table definition are relative to this.

**`test_queries`** -- Two or three SQL queries that Coral runs during `coral source test` to verify the spec works. These are real SQL -- if they fail, your spec is broken.

**`tables`** -- One or more table definitions. Each table has a `request` (method + path), `response` (how to parse the JSON), `pagination` (how to handle multi-page results), and `columns` (the schema).

**`columns`** -- Each column has a `name`, `type` (Utf8, Int64, Float64, Boolean, Timestamp, Json), and `description`. Coral flattens nested fields using double underscores (e.g., `author__username`), never dots.

**`rows_path: []` and `row_strategy: direct`** -- The DeFiLlama `/protocols` endpoint returns a JSON array at the root. `rows_path: []` means "the array is at the top level." `row_strategy: direct` means each array element is one row. For nested responses, you would set `rows_path: ["data", "items"]` to drill into the JSON.

### Linting and Testing

After writing the spec, validate it with Coral:

```bash
# Check YAML structure and column types
coral source lint coral/sources/defillama.yaml

# Register the source with Coral
coral source add --file coral/sources/defillama.yaml

# Run the test_queries to verify the source works
coral source test defillama
```

If `coral source test` passes green, the source is live. You can immediately query it:

```bash
coral sql "SELECT name, tvl FROM defillama.protocols ORDER BY tvl DESC LIMIT 5"
```

The output is JSON by default. For the app, we use `coral sql --format json` to get parseable results that feed directly into the frontend grid.

## The Hero Query: A 5-Source JOIN

This is the query that demonstrates what Coral makes possible. It JOINs five different data sources in a single SQL statement:

```sql
SELECT g.recipient_name,
       g.amount_approved_usdc,
       d.tvl,
       d.change_7d,
       COUNT(DISTINCT ga.pr_number) FILTER (WHERE ga.state = 'merged') AS merged_prs,
       COUNT(DISTINCT rep.cast_hash) FILTER (WHERE rep.sentiment_score > 0.5) AS positive_mentions,
       AVG(rep.sentiment_score) AS avg_sentiment,
       COALESCE(SUM(CAST(et.value AS DOUBLE)) / 1e6, 0) AS usdc_received
FROM grantees.registry g
JOIN defillama.protocols d ON d.slug = g.project_slug
LEFT JOIN github_activity.prs ga ON ga.org = g.github_handle
LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
LEFT JOIN etherscan_transfers.transfers et ON et.wallet = g.wallet
GROUP BY g.recipient_name, g.amount_approved_usdc, d.tvl, d.change_7d
ORDER BY d.tvl DESC
```

Here is what each JOIN does:

**`grantees.registry g`** -- The anchor table. A CSV file mapping grantee names to wallet addresses, GitHub handles, project slugs, and approved USDC amounts.

**`JOIN defillama.protocols d ON d.slug = g.project_slug`** -- Fetches live TVL and 7-day change from DeFiLlama's HTTP API. The `slug` column is the join key -- both sources use the same slug format (e.g., "aave", "uniswap"). This is an inner JOIN, so grantees without a DeFiLlama listing are excluded.

**`LEFT JOIN github_activity.prs ga ON ga.org = g.github_handle`** -- Counts merged pull requests from a pre-fetched CSV of GitHub activity. LEFT JOIN because some grantees may have no GitHub activity.

**`LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug`** -- Aggregates Farcaster sentiment from a pre-scored JSONL file. Filters for positive mentions (sentiment_score > 0.5).

**`LEFT JOIN etherscan_transfers.transfers et ON et.wallet = g.wallet`** -- Sums USDC received from on-chain transfers. The `value` field is in raw USDC units (6 decimals), so we divide by 1e6.

The result: a single table where each row is a grantee with their approved funding, current TVL, TVL trend, development activity, community sentiment, and actual USDC received. This is the "one query, five sources" promise of Coral in action.

### The Risk Flag Query

A simpler variant that flags at-risk grantees:

```sql
SELECT g.recipient_name, d.tvl, d.change_7d, AVG(rep.sentiment_score) AS avg_sentiment
FROM grantees.registry g
JOIN defillama.protocols d ON d.slug = g.project_slug
LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
WHERE d.change_7d < -5
GROUP BY g.recipient_name, d.tvl, d.change_7d
ORDER BY d.change_7d ASC
```

Any grantee with a 7-day TVL decline greater than 5% surfaces here. Combined with low sentiment scores, these are the ones "at risk" -- the query that lights up the RiskBadge in red.

## The Agent Loop: Anthropic SDK Tool-Use

Tide does not hardcode queries. Instead, it runs an AI agent that decides what to ask based on the user's natural language question. The loop is in `/api/ask/route.ts`:

```typescript
const anthropic = new Anthropic({
  apiKey: process.env.MIMO_API_KEY,
  baseURL: process.env.MIMO_BASE_URL,
});
```

The agent uses MiMo-V2.5-Pro (Xiaomi's model, accessible via Anthropic-compatible API) with three tools:

```typescript
export const TOOL_DEFINITIONS = [
  {
    name: "run_coral_sql",
    description: "Execute a read-only SQL query against the Coral query engine.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "The SQL query to execute." },
      },
      required: ["sql"],
    },
  },
  {
    name: "list_catalog",
    description: "List all available tables and schemas in the Coral catalog.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "describe_table",
    description: "Get the columns and types for a specific table.",
    input_schema: {
      type: "object",
      properties: {
        schema: { type: "string" },
        table: { type: "string" },
      },
      required: ["schema", "table"],
    },
  },
];
```

The agent loop itself is a standard tool-use pattern:

```typescript
while (continueLoop) {
  const response = await anthropic.messages.create({
    model: "mimo-v2.5-pro",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages: conversation,
  });

  // Stream text blocks to the client via SSE
  const textBlocks = response.content.filter((b) => b.type === "text");
  for (const block of textBlocks) {
    send({ type: "text", text: block.text });
  }

  // Handle tool calls
  const toolBlocks = response.content.filter((b) => b.type === "tool_use");
  if (toolBlocks.length === 0) {
    continueLoop = false;  // Model is done
    break;
  }

  // Execute each tool and collect results
  for (const tool of toolBlocks) {
    if (tool.name === "run_coral_sql") {
      const sql = tool.input.sql;
      const coralResult = await runCoralSql(sql);
      // Send SQL + results to frontend for rendering
      send({ type: "sql_result", sql, rows: coralResult.rows, ms: coralResult.ms });
      toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(coralResult) });
    }
    // ... list_catalog, describe_table handlers
  }

  conversation.push({ role: "user", content: toolResults });
}
```

The `runCoralSql` function is a thin wrapper around the Coral CLI:

```typescript
export async function runCoralSql(sql: string): Promise<CoralResult> {
  const start = Date.now();
  const { stdout } = await execFileP("coral", ["sql", "--format", "json", sql]);
  const ms = Date.now() - start;
  const rows = JSON.parse(stdout);
  return { rows, ms, cached: ms < 50 };
}
```

It shells out to `coral sql --format json` and parses the JSON output. Latency under 50ms is inferred as a cache hit. This is intentionally simple -- Coral handles all the complexity of fetching, flattening, and caching.

The system prompt tells the model about all available sources, join keys, and rules like "prefer ONE sql call with JOINs over many round-trips." This is the key instruction that makes the agent write efficient cross-source queries instead of doing five separate lookups.

### SSE Streaming

The entire response is streamed to the frontend via Server-Sent Events. Each event is a JSON object with a `type` field:

- `text` -- LLM-generated prose
- `tool_call` -- which tool is being invoked and with what input
- `sql_result` -- the SQL query, result rows, execution time, and cache status
- `tool_error` -- if a tool call failed
- `done` -- the agent is finished

The frontend renders these progressively: SQL appears in a preview pane as soon as it is executed, rows populate the results grid, and the RiskBadge updates based on the data.

## What I Learned

### DataFusion SQL is Powerful

Coral runs on Apache DataFusion, not Postgres. This means you get `FILTER (WHERE ...)` clauses, `INTERVAL` arithmetic, and CTEs -- but not `ILIKE` or `JSONB` operators. The syntax differences are small but important. Always test your SQL with `coral sql` before wiring it into the agent.

### Cross-Source JOINs Change Everything

The moment you can JOIN an HTTP API with a CSV file with a JSONL file in a single query, the way you think about data changes. Instead of building ETL pipelines to normalize everything into one database, you just define the schemas and let Coral handle the rest. The hero query would have required a multi-day data engineering effort without Coral. With it, it is a 10-line SQL statement.

### One SQL Call Beats Ten Round-Trips

The agent's system prompt enforces a "prefer ONE sql call" rule. This is not just about latency -- it is about cost. Each LLM round-trip costs tokens. If the agent does five separate queries, that is five tool-use cycles. One JOIN query is one cycle. The difference compounds fast.

### Source Specs are the Hard Part

Writing the YAML specs is where most of the debugging happens. Getting `rows_path` right for nested JSON responses, choosing the correct column types, and writing test queries that actually pass -- this takes iteration. The `coral source lint` and `coral source test` cycle is essential. Do not skip it.

### DEMO_MODE Saves Presentations

When you are demoing on stage and the DeFiLlama API is slow or Etherscan rate-limits you, a cached fixture file is a lifesaver. Tide's DEMO_MODE loads pre-saved query results from JSON files when the prompt matches a known fixture. The UI looks identical -- SQL preview, results grid, timing -- but the data comes from disk instead of live APIs.

## Try It Yourself

**Repo**: [github.com/OoJae/Tide](https://github.com/OoJae/Tide)

**Coral docs**: [withcoral.com](https://withcoral.com)

To run Tide locally:

```bash
# 1. Install Coral CLI
# See https://withcoral.com for installation instructions

# 2. Clone and install
git clone https://github.com/OoJae/Tide.git
cd Tide
pnpm install

# 3. Add Coral sources
for spec in coral/sources/*.yaml; do
  coral source add --file "$spec"
done

# 4. Set environment variables
cp .env.example .env
# Add MIMO_API_KEY and MIMO_BASE_URL

# 5. Run the dev server
pnpm dev
```

To build your own source spec from scratch:

```bash
# 1. Write your YAML spec (see defillama.yaml for the template)
# 2. Lint it
coral source lint coral/sources/my-source.yaml

# 3. Register it
coral source add --file coral/sources/my-source.yaml

# 4. Test it
coral source test my-source

# 5. Query it
coral sql "SELECT * FROM my-source.table LIMIT 5"
```

The Pirates of the Coral-bean hackathon runs on the Coral Discord. If you are building with Coral, that is the place to ask questions and share what you are working on.

---

*Tide was built for the Pirates of the Coral-bean hackathon (WeMakeDevs x Coral), Track 1: Enterprise Agent. Solo build in 7 days, Claude Code assisted.*
