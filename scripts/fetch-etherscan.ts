/**
 * Fetch USDC transfer history for each grantee wallet from Etherscan.
 * Outputs data/etherscan/transfers.csv for use as a file-backed Coral source.
 *
 * Usage: npx tsx scripts/fetch-etherscan.ts
 * Requires: ETHERSCAN_API_KEY in .env.local
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const USDC_CONTRACT = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const CHAIN_ID = 1; // Ethereum mainnet
const ETHERSCAN_API = "https://api.etherscan.io/v2/api";

async function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

async function fetchTransfers(address: string, apiKey: string): Promise<Record<string, string>[]> {
  const url = `${ETHERSCAN_API}?module=account&action=tokentx&contractaddress=${USDC_CONTRACT}&address=${address}&chainid=${CHAIN_ID}&page=1&offset=100&sort=desc&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json() as { status: string; result: Record<string, string>[] | string };
  if (data.status !== "1" || !Array.isArray(data.result)) {
    console.warn(`  No transfers for ${address}: ${data.result}`);
    return [];
  }
  return data.result;
}

async function main() {
  const env = await loadEnv();
  const apiKey = env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error("ETHERSCAN_API_KEY not found in .env.local");
    process.exit(1);
  }

  // Load grantee registry
  const csvPath = join(process.cwd(), "data", "grantees", "registry.csv");
  const csv = readFileSync(csvPath, "utf-8");
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  const grantees = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i]));
    return row;
  });

  console.log(`Fetching USDC transfers for ${grantees.length} grantee wallets...`);

  const allTransfers: string[] = [];
  const outHeaders = [
    "recipient_name", "wallet", "hash", "from_address", "to_address",
    "value", "token_symbol", "block_time", "block_number", "chainid",
  ];
  allTransfers.push(outHeaders.join(","));

  for (const g of grantees) {
    console.log(`  ${g.recipient_name} (${g.wallet})...`);
    const transfers = await fetchTransfers(g.wallet, apiKey);

    // Filter to only incoming transfers (to = grantee wallet)
    const incoming = transfers.filter(
      (t) => t.to?.toLowerCase() === g.wallet.toLowerCase()
    );

    for (const t of incoming) {
      allTransfers.push([
        `"${g.recipient_name}"`,
        g.wallet,
        t.hash,
        t.from,
        t.to,
        t.value,
        t.tokenSymbol || "USDC",
        t.timeStamp,
        t.blockNumber,
        String(CHAIN_ID),
      ].join(","));
    }

    console.log(`    ${incoming.length} incoming USDC transfers`);

    // Rate limit: 5 calls/sec on free tier
    await new Promise((r) => setTimeout(r, 250));
  }

  // Write CSV
  const outDir = join(process.cwd(), "data", "etherscan");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "transfers.csv");
  writeFileSync(outPath, allTransfers.join("\n") + "\n");
  console.log(`\nWrote ${allTransfers.length - 1} transfers to ${outPath}`);
}

main().catch(console.error);
