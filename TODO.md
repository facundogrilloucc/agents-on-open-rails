# ToDo del equipo

Cierre de la hackatón: **lun 9 nov, 06:00 (Argentina)**. Entregamos el **8 de noviembre**.
Detalle y contexto de cada tema: bóveda de Obsidian (`00 Inicio.md`) y [`README.md`](README.md).

## Reglas para todos

- **Nunca** commitear `web/.env.local`, claves privadas ni la API key de Obsidian. El repo es público.
- **Ninguna transacción en Celo mainnet** hasta confirmar el código de atribución (`celo_976812496a25`).
  Todo lo que firma va con la etiqueta ERC-8021 (ver `web/scripts/register-agent.mjs`).
- La clave del agente (`0x477f…2159`) la tiene solo Facundo. Para probar, cada uno usa su propia wallet de desarrollo.
- Antes de subir cambios: `cd web && npx tsc --noEmit && npm run lint`.
- Después de cambios grandes: `/graphify --update`, commitear `graphify-out/` (sin la caché) y `node scripts/graph-to-obsidian.mjs`.
- Mensajes de commit en español, cortos y claros.

---

## Gregorio

### 1. Puesta en marcha (prioridad alta, hoy)
- [ ] Clonar el repo, `cd web && npm install && npm run dev` y abrir http://localhost:3000.
- [ ] Copiar `web/.env.example` a `web/.env.local` (dejar `AGENT_PRIVATE_KEY` vacío).
- [ ] Crear una **wallet de desarrollo propia** (MetaMask) en Celo mainnet y pasarle la dirección pública a Facundo.
- [ ] Probar el script de cotizaciones: `cd web && node scripts/textile-quote.mjs 2000,10000`.
- [ ] Indicar la ruta local de la bóveda (carpeta de Google Drive) en la variable de entorno `OBSIDIAN_VAULT_PATH`
      (o en `~/.config/obsidian-mcp/vault_path`). La usan la skill `obsidian-docs` y el script del grafo.
- [ ] Exportar el grafo a la bóveda **solo** con `node scripts/graph-to-obsidian.mjs` (va a `08 Grafo del código/`).
      No exportar graphify a otras carpetas de la bóveda: se duplicarían las notas.
- [ ] Leer las reglas de convivencia en `.claude/skills/obsidian-docs/SKILL.md` (los agentes de los dos escriben en la misma bóveda).

### 2. Cotización de Textile en la app (prioridad alta)
Mostrar en el panel a cuánto se convierten los pesos ahora mismo.
- [ ] Ruta de API en Next: `web/src/app/api/textile/quote/route.ts` que llame a `POST https://app.textilecredit.com/v2/rfq/preview`
      (formato en `web/scripts/textile-quote.mjs`). Se hace del lado del servidor para evitar problemas de CORS.
- [ ] Componente `TextileQuote` en el panel: monto en wARS → USD₮ estimados, tipo de cambio y comisión. Actualizar cada ~30 s.
- [ ] Manejar el caso `status: "no_quote"` (por ejemplo, USD₮ → wARS por encima de ~42 USD₮ no tiene liquidez).
- **Listo cuando:** el panel muestra la cotización real y no rompe si Textile no responde.

### 3. Actividad real del agente (prioridad media)
Reemplazar el estado vacío de `web/src/components/AgentActivity.tsx` por datos de la blockchain (solo lectura).
- [ ] Leer con viem los eventos `Transfer` de wARS, USD₮ y USDC donde participe la wallet del agente (`AGENT_ADDRESS` en `web/src/config/app.ts`).
- [ ] Listar fecha, tipo (entrada / conversión / pago), monto y link a `https://celoscan.io/tx/<hash>`.
- **Listo cuando:** muestra "sin movimientos" hoy y va a mostrar los reales apenas el agente opere.

### 4. Ahorro frente a quedarse en pesos (prioridad media)
- [ ] En `web/src/components/SavingsCard.tsx`: valor actual en pesos de los USD₮ del usuario vs. los wARS que puso.
      Precio actual: `GET https://app.textilecredit.com/api/price?pair=wars-usdt&chainId=42220` (USD₮ por 1 wARS).
- [ ] Explicar la cuenta en un texto chico debajo del número.

### 5. Investigación de x402 y buy (prioridad media)
Escribir lo encontrado en la bóveda (nota nueva en `03 Técnico/`).
- [ ] Cómo funciona el cliente x402 con el facilitador de Celo (x402.celo.org): pasos, librerías, qué firma el cliente.
- [ ] Qué servicios de buy (usebuy.ai, `celo-org/buy-skill`) conviene pagar: precio, moneda (USDC / USD₮ / wARS), para qué servirían a un freelancer o dev.
- [ ] Si x402 acepta firmas de smart wallets o solo de wallets comunes (EOA).

### 6. Experiencia en celular y MiniPay (prioridad baja)
- [ ] Revisar la app a 375 px de ancho y corregir lo que se rompa.
- [ ] Probar la conexión desde MiniPay si alguno lo tiene instalado.

### 7. Material para la entrega (cerca del final)
- [ ] 2 a 4 capturas de la app publicada (máx. 4 MB cada una).
- [ ] Guion y grabación del video demo (2 a 3 minutos).

---

## Facundo

- [ ] Publicar la app en Vercel (conectada al repo) → URL para la entrega.
- [ ] Confirmar el código de atribución en la plataforma o en Telegram / office hours.
- [ ] Cargar ~USD 1 de gas en la wallet del agente y registrar la identidad ERC-8004 (`node scripts/register-agent.mjs --send`).
- [ ] Prueba real en Textile con un monto chico (desde la app de Textile).
- [ ] Definir cómo custodia el agente los fondos de los usuarios (wallet por usuario, Para o contrato con permisos).
- [ ] Completar y enviar la entrega en Loops House.

## Juntos (cuando esté definida la custodia)

- [ ] Backend del agente: detectar wARS entrantes → convertir en Textile → pagar servicios con x402 dentro del presupuesto.
- [ ] Guardar las reglas de presupuesto en el backend (hoy quedan en el navegador).
- [ ] Conseguir los primeros usuarios reales (devs y estudiantes de la UCC).
