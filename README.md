# MangoJIT

**A treasury agent that protects Argentine pesos in dollars, on Celo mainnet.**
Built by Facundo Grillo and Gregorio Miranda for the *Agents on Open Rails* hackathon (Celo × Loops House).

People in Argentina who earn in pesos lose purchasing power every week the money sits idle. MangoJIT
lets them top up pesos (wARS) with Ripio's on-ramp and gives an agent a **capped permission** to move those
pesos into USD₮ on **Textile FX**, only at a fair price and within limits the user sets and can revoke.

- **Live app:** https://agents-on-open-rails.vercel.app
- **Read-only demo (agent wallet):** https://agents-on-open-rails.vercel.app/?address=0x477fb107278e0a21e39b424ad7b497E7fd472159
- **Strategy (how the agent decides):** [STRATEGY.md](STRATEGY.md)

## On-chain proof (Celo mainnet, chain id 42220)

| | |
|---|---|
| Agent wallet | [`0x477fb107278e0a21e39b424ad7b497E7fd472159`](https://celo.blockscout.com/address/0x477fb107278e0a21e39b424ad7b497E7fd472159) |
| ERC-8004 identity | **agentId 10050** in the Identity Registry `0x8004A169…a432`, [registration tx](https://celo.blockscout.com/tx/0xbad2370c5771eff8c2baa15580ea421619adcf40f1dc7fc21e56ed97dd18505d) |
| ERC-8021 attribution tag | `celo_d25b3d01e1b4`, appended to **every** transaction the agent or the app sends |
| First conversion | 3,000 wARS → 1.8193 USD₮ on Textile FX: [approve](https://celo.blockscout.com/tx/0x5eaab469b385026ab00a0b240bba42b7732750702f6a40ab96afe09ba032abb5) · [swap](https://celo.blockscout.com/tx/0x9cfd4f3835e07ba677b25b31880c1f39e8236c2d5b4b8f8a73121ad73fe49cf4) |
| Gas | Paid in USD₮ through Celo's fee abstraction (the agent holds no CELO) |

Returns versus keeping the pesos, rebuilt from the chain: `cd web && node scripts/pnl.mjs`.

## How it works

1. **Top up pesos.** The user buys wARS with Ripio's on-ramp, straight to their own wallet on Celo.
2. **Capped permission, not custody.** In the app, the user approves the agent wallet for a wARS cap (an ERC-20
   `approve`, tagged). The money stays in the user's wallet; the agent can only pull up to the cap, and the
   user can revoke it at any time.
3. **The agent protects the pesos.** [`agent-watch.mjs`](web/scripts/agent-watch.mjs) checks every minute for
   wARS sent to the agent and for users who approved it. For each, it applies the
   [policy](web/src/config/agent-policy.json): minimum and maximum size, daily cap, and a **price guard** that
   rejects any Textile quote more than 0.5 % worse than Textile's reference price. Then it gets a firm RFQ
   quote, swaps, and sends the USD₮ back to the user.
4. **Everything is visible.** The app shows balances, permissions, a live Textile quote, the agent's rules, its
   activity with links to every transaction, and how much the protected pesos are worth today versus keeping
   them in pesos.

### Technical highlights

- **Textile FX without an API key.** The agent proves control of its wallet by signing Textile's EIP-712
  "Taker Control" message, then executes the RFQ swap itself ([`lib/protect.mjs`](web/scripts/lib/protect.mjs)).
- **Attribution that cannot be forgotten.** The agent's viem wallet client is created with the ERC-8021
  `dataSuffix`, so every `writeContract` and `sendTransaction` carries the tag, and each run verifies the tag
  on-chain afterwards ([`lib/agent.mjs`](web/scripts/lib/agent.mjs)). The app's approvals are tagged too.
- **Ledger.** Every decision (trade, skip, abort) is logged with its reason, Textile `rfqId`, rate and
  reference rate in `web/data/agent-ledger.jsonl`.

## Status: what works and what does not yet

| | |
|---|---|
| ✅ Real wARS → USD₮ conversion on Textile FX, mainnet, tagged | done |
| ✅ ERC-8004 identity, ERC-8021 tags on every transaction | done |
| ✅ Capped-permission custody (approve / revoke) in the app | done |
| ✅ Policy enforced by the agent (size, daily cap, price guard) and shown in the app | done |
| ✅ Autonomous watcher (`agent-watch.mjs`) | done, runs from a terminal (`--send`) |
| ✅ Returns vs. pesos, verifiable from the chain (`pnl.mjs`, app card) | done |
| ⏳ Converting back to pesos (USD₮ → wARS) when needed | not automated: liquidity varies |
| ⏳ Paying APIs per use with x402 / buy | not implemented; limits are reserved in the policy |
| ⏳ WalletConnect / MiniPay-specific connection | browser wallets only (MetaMask, Rabby, …) |
| ⏳ Independent users | not yet |

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Agent scripts (need `web/.env.local`, see [`web/.env.example`](web/.env.example)). Without `--send` they only
simulate:

```bash
node scripts/agent-watch.mjs [--send] [--once]          # autonomous mode
node scripts/agent-protect.mjs 2000 [--user 0x…] [--send] # one conversion
node scripts/pnl.mjs                                      # returns vs. pesos (read-only)
node scripts/textile-quote.mjs 2000,10000                 # Textile quotes (read-only)
```

## Repository

- `web/`: Next.js 16 app (React 19, wagmi, viem, Tailwind) and the agent scripts in `web/scripts/`.
- `STRATEGY.md`: the agent's decision rule and how returns are measured.
- `docs/capturas/`: screenshots used in the submission.
- `TODO.md`: team task list (in Spanish).
