# Strategy: how the Tesorería JIT agent decides

The agent is a **treasury agent** for people who earn and hold Argentine pesos. Its job is to manage the
user's currency exposure: move pesos (wARS) into dollars (USD₮) on Textile FX, but only at a fair price and
only inside limits the user controls. It is a **taker** on Textile's RFQ market, not a market maker.

All rules live in one file, [`web/src/config/agent-policy.json`](web/src/config/agent-policy.json). The
scripts read it before every action ([`web/scripts/lib/policy.mjs`](web/scripts/lib/policy.mjs)) and the web
app shows the same file to the user, so what the user sees is what the agent enforces.

## Why convert at all

Holding pesos loses value: the peso keeps depreciating against the dollar. A freelancer who gets paid in
pesos and keeps them idle loses purchasing power every week. Converting as soon as the money arrives, at a
price close to the market reference, locks in the dollar value. The agent does this without the user having
to watch the market or buy dollars manually.

## Decision rule (every conversion)

Implemented in [`web/scripts/lib/protect.mjs`](web/scripts/lib/protect.mjs).

1. **Is there enough to convert?** The amount must be at least `minConvertWars` (1,700 wARS). Textile's
   current minimum order is about 1,650 wARS, and smaller trades waste a larger share on fees and gas.
2. **Is it inside the limits?** At most `maxConvertPerRunWars` (50,000 wARS) per operation and
   `maxDailyWars` (200,000 wARS) per rolling 24 h, counted from the agent's own ledger. This caps the damage
   of a bug or a bad market.
3. **Is the user's permission enough?** For user funds, the agent only moves what the user approved with an
   ERC-20 allowance (`approve`) to the agent wallet, and never more than the user's balance. The user can
   revoke at any time from the app.
4. **Is the price fair?** The agent compares Textile's quote with Textile's reference price
   (`/api/price`, wARS per USD₮). If the quote is worse than the reference by more than `maxSlippageBps`
   (50 bps = 0.5 %), it does not trade. It checks twice: on the indicative quote (`/rfq/preview`), and again
   on the firm quote (`/rfq/request`) right before signing. Typical quotes today are 10 to 20 bps above the
   reference, so the guard only blocks unusual prices.
5. **Execute and give back.** It approves Textile's reactor for exactly the amount, sends the swap before the
   quote expires, reports the hash to Textile, and, for user funds, transfers the USD₮ back to the user.
   If anything fails after taking a user's wARS, it returns them.

Every decision (trade, skip, abort) is appended to `web/data/agent-ledger.jsonl` with the reason, the
Textile `rfqId`, the rate, the reference rate and the hashes.

## Autonomy

[`web/scripts/agent-watch.mjs`](web/scripts/agent-watch.mjs) runs the rule every `intervalSeconds` (60 s):

- **wARS that arrive at the agent wallet** (for example, from Ripio's on-ramp) are converted automatically.
- **Users who approved the agent** are discovered from on-chain `Approval` events on wARS (Blockscout). For
  each one, the agent converts up to the approved amount and sends the USD₮ back.
- After a failure, that source waits 10 minutes before retrying. The policy file is re-read on every pass.

Without `--send` it only observes and prints what it would do.

## How returns are measured

[`web/scripts/pnl.mjs`](web/scripts/pnl.mjs) rebuilds every conversion from the chain (Blockscout), so anyone
can verify it. The benchmark is **"the same wARS kept in pesos"**:

- value today (wARS) = USD₮ received × today's reference rate (wARS per USD₮)
- return (wARS) = value today − wARS sold − gas paid (converted to wARS)

Costs are counted: Textile's fee and spread are inside the rate, and gas (paid in USD₮ through Celo's fee
abstraction) is read from the chain. Right after a trade, the return is slightly negative (the cost of
execution, about 0.2 to 0.3 %). It turns positive as the peso depreciates, which is the point of the agent.

The web app shows the same comparison in "Pesos protegidos en dólares".

## What the agent does not do (yet)

- **Convert back (USD₮ → wARS) when the user needs pesos.** Textile quotes that direction, but its
  liquidity varies a lot (we have seen it drop to about 40 USD₮), so it is not automated.
- **Pay for APIs with x402 or buy.** The spending limits are in the policy file (`spend`, marked
  `planned`) but no payment flow is implemented.
- **Market making.** The agent never quotes prices to others.
