import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface CoralResult {
  rows: Record<string, unknown>[];
  ms: number;
  cached: boolean;
}

export async function runCoralSql(sql: string): Promise<CoralResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileP("coral", [
      "sql",
      "--format",
      "json",
      sql,
    ]);
    const ms = Date.now() - start;
    const rows = JSON.parse(stdout);
    // Infer cache from latency (< 50ms likely cached)
    const cached = ms < 50;
    return { rows, ms, cached };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    throw new Error(
      `Coral SQL error: ${error.stderr || error.message || "unknown error"}`
    );
  }
}

export async function listCatalog(): Promise<Record<string, unknown>[]> {
  return (
    await runCoralSql(
      "SELECT * FROM coral.tables WHERE schema_name IN ('grantees', 'defillama', 'github_activity', 'etherscan', 'etherscan_transfers', 'reputation', 'coingecko') ORDER BY schema_name"
    )
  ).rows;
}

export async function describeTable(
  schema: string,
  table: string
): Promise<Record<string, unknown>[]> {
  return (
    await runCoralSql(
      `SELECT column_name, data_type, description FROM coral.columns WHERE schema_name = '${schema}' AND table_name = '${table}'`
    )
  ).rows;
}
