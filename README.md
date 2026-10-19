# Agents on Open Rails — Tesorería JIT

Proyecto de Facundo Grillo y Gregorio para la hackatón **Agents on Open Rails** (Celo × Loops House).

**Tesorería JIT** (nombre provisorio) es una billetera de agente para freelancers y devs argentinos:
cargás pesos (wARS) con la rampa de Ripio, el agente los protege convirtiéndolos a USD₮ en Textile FX
y paga por uso APIs e IA vía x402, dentro de un presupuesto que definís vos.

- Red: **Celo mainnet** (chain id 42220).
- Wallet del agente: `0x477fb107278e0a21e39b424ad7b497E7fd472159` (identidad ERC-8004).
- Todas las transacciones llevan la etiqueta de atribución ERC-8021.

## Estructura

- [`web/`](web/): app Next.js (ver [web/README.md](web/README.md)).
- `web/scripts/`: scripts del agente (cotizaciones de Textile, registro ERC-8004).

## Correr en local

```bash
cd web
npm install
npm run dev
```
