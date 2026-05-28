# Tide Demo Script

> Target: 3 minutes, 1080p+, clean audio, captions.
> Open on the working product, not slides. Lead with the elevator line.

---

## 0:00–0:10 — The Hook

**Screen:** A real DAO grants dashboard (e.g., Optimism's grants page).

**Voiceover:**
> "DAOs paid out over $20 million in grants last year. But which grantees actually shipped? And which ones are silently becoming a risk? Today, finding out takes hours of manual work across five different tools. Tide does it in one question."

---

## 0:10–1:05 — The Hero Query

**Screen:** Tide chat interface. Type the hero question.

**Action:** Type or click the starter prompt:
> "Show me every grantee with their protocol TVL, merged PRs, and Farcaster sentiment"

**What happens on screen:**
1. MiMo generates a cross-source SQL JOIN (visible in the SQL preview panel)
2. Coral executes it across 5 sources in ~5 seconds
3. SQL preview shows syntax-highlighted query with source attribution chips
4. Results grid populates with grantee data

**Voiceover:**
> "Tide is an AI co-pilot for DAO treasuries. It connects on-chain transfers, DeFi TVL, GitHub activity, and Farcaster sentiment into a single SQL surface powered by Coral. One question, five data sources, one answer."

**Point out:**
- The SQL preview — "this is the exact query Coral executed"
- The source chips — "grantees, defillama, reputation, github — all joined live"
- The timing footer — "5 sources, 5 seconds, cached on the second run"

---

## 1:05–1:35 — Deep Dive

**Screen:** Click a row in the results grid to show details.

**Voiceover:**
> "Each row is a grantee. Click to see the breakdown — TVL, 7-day change, merged PRs, community sentiment. All from different sources, unified in one view."

**Action:** Point out the RiskBadge on a row with declining TVL.

> "See this red badge? Tide flagged this protocol because its TVL dropped 10% this week and sentiment is negative. That's the kind of signal that used to take a spreadsheet, Etherscan, and three browser tabs."

---

## 1:35–2:05 — The Risk View

**Screen:** Type the second hero question.

**Action:** Type or click:
> "Flag grantees whose protocol TVL dropped more than 5% this week"

**What happens:**
1. MiMo generates a risk-focused query
2. Results show only at-risk grantees
3. RiskBadges light up red and amber

**Voiceover:**
> "The second question lights up the risk view. Six grantees flagged — Rocket Pool down 10%, Balancer down 8%, Aave down 7%. For a treasury manager, this is a 400-second reconciliation reduced to 4 seconds."

---

## 2:05–2:35 — The Source Specs

**Screen:** Quick cut to the Coral source spec files or the GitHub PRs.

**Voiceover:**
> "Tide is built on Coral — the local-first query engine that makes any API, file, or database readable as SQL. I authored four new source specs for this hackathon: DeFiLlama, CoinGecko, Neynar for Farcaster, and Etherscan. They're open source and available as PRs to the Coral repo."

**Show:** The 4 source spec YAML files briefly.

---

## 2:35–3:00 — The Close

**Screen:** The deployed Tide dashboard URL.

**Voiceover:**
> "Tide is live — try it yourself at the deployed link. Built in a week with Claude Code and Coral. Apache-2.0 licensed. The four source specs ship for every Coral user."

**Show:** GitHub repo URL, deployed URL, Coral attribution.

**End card:** Tide logo + "Built for Pirates of the Coral-bean"

---

## Recording Checklist

- [ ] 1080p or higher
- [ ] Clean audio (no background noise)
- [ ] Captions added
- [ ] Opens on the working product, not slides
- [ ] Hero query runs successfully before recording (warm Coral cache)
- [ ] DEMO_MODE=1 as fallback if APIs are flaky
- [ ] Under 3:00 total
