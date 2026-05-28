#!/usr/bin/env tsx
/**
 * snapshot-fixtures.ts
 *
 * Runs the canonical hero queries against Coral and saves results to JSON
 * for DEMO_MODE fallback. Run this when APIs are healthy to guarantee
 * the deployed link and demo video never break.
 *
 * Usage: npx tsx scripts/snapshot-fixtures.ts
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const execFileP = promisify(execFile);

async function runCoralSql(sql: string) {
  const start = Date.now();
  const { stdout } = await execFileP("coral", ["sql", "--format", "json", sql]);
  const ms = Date.now() - start;
  const rows = JSON.parse(stdout);
  return { rows, ms, cached: false, rowCount: rows.length };
}

const FIXTURES = [
  {
    name: "top-grantees-by-tvl",
    prompt: "Show me the top grantees by protocol TVL",
    sql: `SELECT g.recipient_name, g.amount_approved_usdc, d.tvl, d.change_7d,
           COUNT(DISTINCT ga.pr_number) FILTER (WHERE ga.state = 'merged') AS merged_prs,
           COUNT(DISTINCT rep.cast_hash) FILTER (WHERE rep.sentiment_score > 0.5) AS positive_mentions,
           AVG(rep.sentiment_score) AS avg_sentiment
    FROM grantees.registry g
    JOIN defillama.protocols d ON d.slug = g.project_slug
    LEFT JOIN github_activity.prs ga ON ga.org = g.github_handle
    LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
    GROUP BY g.recipient_name, g.amount_approved_usdc, d.tvl, d.change_7d
    ORDER BY d.tvl DESC`,
  },
  {
    name: "risk-flag",
    prompt: "Flag the grantees whose protocol TVL dropped more than 5% this week",
    sql: `SELECT g.recipient_name, d.tvl, d.change_7d, d.change_1d,
           AVG(rep.sentiment_score) AS avg_sentiment
    FROM grantees.registry g
    JOIN defillama.protocols d ON d.slug = g.project_slug
    LEFT JOIN reputation.casts_scored rep ON rep.project_slug = g.project_slug
    WHERE d.change_7d < -5
    GROUP BY g.recipient_name, d.tvl, d.change_7d, d.change_1d
    ORDER BY d.change_7d ASC`,
  },
];

async function main() {
  const outDir = join(import.meta.dirname, "..", "data", "fixtures");
  mkdirSync(outDir, { recursive: true });

  for (const fixture of FIXTURES) {
    console.log(`Running: ${fixture.name}`);
    try {
      const result = await runCoralSql(fixture.sql);
      const outPath = join(outDir, `${fixture.name}.json`);
      writeFileSync(
        outPath,
        JSON.stringify(
          {
            prompt: fixture.prompt,
            sql: fixture.sql,
            ...result,
            snapshotAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
      console.log(`  → ${result.rowCount} rows, ${result.ms}ms → ${outPath}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }

  console.log("\nDone. Fixture files saved to data/fixtures/");
}

main();
