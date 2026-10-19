# Tesorería JIT (nombre provisorio)

App web de la hackatón **Agents on Open Rails** (Celo). El usuario carga pesos (wARS) con la rampa de Ripio,
el agente los protege en USD₮ vía Textile FX y paga por uso APIs e IA con x402, dentro de un presupuesto.

## Correr en local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000 y conectar una wallet (MiniPay o MetaMask) en **Celo mainnet**.

## Estructura

- `src/config/app.ts`: nombre de la app, tokens verificados en Celo (wARS, USD₮, USDC) y link de la rampa de Ripio.
- `src/lib/wagmi.ts`: conexión a la wallet (solo Celo mainnet).
- `src/components/`: saldos, reglas del agente, ahorro y actividad.

## Pendiente

- Backend del agente: detectar ingresos de wARS, convertir en Textile FX, pagar con x402/buy.
- Identidad ERC-8004 del agente y etiqueta de atribución (ERC-8021) en todas las transacciones.
- Guardar las reglas del presupuesto en el backend (hoy quedan en el navegador).
