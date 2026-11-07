# Tesorería JIT (nombre provisorio)

App web de la hackatón **Agents on Open Rails** (Celo). El usuario carga pesos (wARS) con la rampa de Ripio,
con un permiso con tope el agente los protege en USD₮ vía Textile FX, dentro de la política de `src/config/agent-policy.json`.
Ver el [README principal](../README.md) y [STRATEGY.md](../STRATEGY.md).

## Correr en local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000 y conectar una wallet del navegador (MetaMask, Rabby…) en **Celo mainnet**.

## Estructura

- `src/config/app.ts`: nombre de la app, tokens verificados en Celo (wARS, USD₮, USDC) y link de la rampa de Ripio.
- `src/lib/wagmi.ts`: conexión a la wallet (solo Celo mainnet).
- `src/config/agent-policy.json`: reglas del agente (las leen los scripts y las muestra la app).
- `src/components/`: saldos, permisos, cotización, reglas, rendimiento y actividad.
- `scripts/`: el agente (`agent-watch.mjs`, `agent-protect.mjs`, `pnl.mjs`, `register-agent.mjs`).
- `data/agent-ledger.jsonl`: registro de decisiones y operaciones del agente.

## Pendiente

- Pagos por uso con x402 / buy (los topes ya están reservados en la política).
- Volver a pesos (USD₮ → wARS) cuando el usuario los necesite.
- WalletConnect y MiniPay.
