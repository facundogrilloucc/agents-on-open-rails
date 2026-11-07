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
| **Autonomous run with an independent user wallet** | User `0xbeBC…443F` holds 3,000 wARS and **no CELO**. It signs an EIP-2612 permit; the agent submits it and pays the gas: [permit](https://celo.blockscout.com/tx/0xfc04d39ce0f907d890667cdc82a5bb4d93ad4f8bfec9ddc2e15731378e6bb64e). Then `agent-watch.mjs` detects the permission and, with no human action, pulls the wARS, gets a firm RFQ quote (`rfq_lRqj5uEs74So5IrK`, 3 bps over Textile's reference) and returns 1.8192 USD₮ to the user: [pull](https://celo.blockscout.com/tx/0xaf0472955c3edd6abfb65e6eefd9ffe8349031b470775f4c7d6e8bdf358ef7fd) · [approve](https://celo.blockscout.com/tx/0x2b9745171281175b005107ae225f9fd3655c476154e910b1e71d1d2c8af4d7db) · [swap](https://celo.blockscout.com/tx/0x3109ce6f300043104bde79d2efe74e7ccc22c9a1e9fabafa0c4f0fe1e3ffd6d3) · [return](https://celo.blockscout.com/tx/0x3dc5392ea3cdd979650c2cd9a1acbb9bfc8f33a88a0263c5da4fdb6743d86a58). Decision log: [`web/data/agent-ledger.jsonl`](web/data/agent-ledger.jsonl) |
| Gas | Paid in USD₮ through Celo's fee abstraction (the agent holds no CELO). Total so far: 0.026 USD₮ for every agent transaction |

Returns versus keeping the pesos, rebuilt from the chain: `cd web && node scripts/pnl.mjs`. As of 2026-11-07: 6,000 wARS
→ 3.6384 USD₮ in 2 conversions (average 1 USD₮ = 1,649.06 wARS), −0.31 % after fees and gas, which is the execution cost
right after trading; it turns positive as the peso depreciates.

## How it works

1. **Top up pesos.** The user buys wARS with Ripio's on-ramp, straight to their own wallet on Celo.
2. **Capped permission, not custody.** In the app, the user approves the agent wallet for a wARS cap. The money
   stays in the user's wallet; the agent can only pull up to the cap, and the user can revoke it at any time.
   **No CELO needed:** wARS supports EIP-2612, so the user can just *sign* the permission ("Autorizar sin gas")
   and the agent submits it, paying the gas in USD₮ and tagging it ([`/api/permit`](web/src/app/api/permit/route.ts)).
   A user who just bought pesos on Ripio can start right away.
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
| ✅ Capped-permission custody (approve / revoke) in the app, including gasless EIP-2612 permit | done (gasless permit needs the agent key on the server: works locally; on Vercel once env vars are set) |
| ✅ Policy enforced by the agent (size, daily cap, price guard) and shown in the app | done |
| ✅ Autonomous watcher (`agent-watch.mjs`) | done, runs from a terminal (`--send`) |
| ✅ Returns vs. pesos, verifiable from the chain (`pnl.mjs`, app card) | done |
| ⏳ Converting back to pesos (USD₮ → wARS) when needed | not automated: liquidity varies |
| ⏳ Paying APIs per use with x402 / buy | not implemented; limits are reserved in the policy |
| ⏳ WalletConnect / MiniPay-specific connection | browser wallets only (MetaMask, Rabby, …) |
| ⏳ Independent users | one independent wallet so far (above); more in progress |

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
