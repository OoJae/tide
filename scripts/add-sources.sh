#!/bin/bash
# Idempotent script to add all Coral sources.
# Reads API keys from environment variables.
set -e

echo "Adding Coral sources..."

# Rewrite hardcoded local paths to container paths (file-backed sources)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
for f in grantees github_activity reputation etherscan_transfers; do
  SRC="./coral/sources/${f}.yaml"
  TMP="/tmp/${f}.yaml"
  sed "s|file:///Users/oluwademilade/Desktop/Tide/|file://${PROJECT_ROOT}/|g" "$SRC" > "$TMP"
  coral source add --file "$TMP" 2>&1 || true
  rm -f "$TMP"
done

# HTTP sources (require API keys as env vars)
coral source add --file ./coral/sources/defillama.yaml 2>&1 || true
coral source add --file ./coral/sources/coingecko.yaml 2>&1 || true
coral source add --file ./coral/sources/neynar.yaml 2>&1 || true
coral source add --file ./coral/sources/etherscan.yaml 2>&1 || true

# Bundled sources
if [ -n "$GITHUB_TOKEN" ]; then
  coral source add github 2>&1 || true
fi

echo "All sources added. Run 'coral source list' to verify."
coral source list 2>&1 || true
