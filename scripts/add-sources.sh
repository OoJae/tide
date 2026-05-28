#!/bin/bash
# Idempotent script to add all Coral sources.
# Reads API keys from environment variables.
set -e

echo "Adding Coral sources..."

# File-backed sources (no secrets needed)
coral source add --file ./coral/sources/grantees.yaml 2>&1 || true
coral source add --file ./coral/sources/github_activity.yaml 2>&1 || true
coral source add --file ./coral/sources/reputation.yaml 2>&1 || true
coral source add --file ./coral/sources/etherscan_transfers.yaml 2>&1 || true

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
