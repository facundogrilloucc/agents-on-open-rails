# ToDo del equipo

## 🚨 Cierre: lun 9 nov, 06:00 (Argentina) — entregar el domingo 8

### 📌 Grego, leé esto primero (actualizado sáb 7/11 a la noche por Facundo)

**Qué cambió hoy** (todo en `main`, detalle en el [README](README.md) y en [STRATEGY.md](STRATEGY.md)):
- El proyecto se llama **MangoJIT** (logo del mango en la app).
- **Agente autónomo** `web/scripts/agent-watch.mjs`: detecta wARS que llegan al agente o usuarios que le dieron permiso,
  convierte en Textile y devuelve los USD₮, sin intervención. Corrió de verdad con la MetaMask de Facundo
  (log en `docs/logs/agent-watch-2026-11-07.log`).
- **Política que el agente aplica** (`web/src/config/agent-policy.json`): topes de monto, tope diario y **guard de precio**
  (rechaza cotizaciones > 0,5 % peores que la referencia de Textile). Reemplaza las "reglas" que solo se guardaban en el navegador.
  Hay una operación rechazada de prueba documentada en el README.
- **Permiso sin gas** (EIP-2612): botón "Autorizar sin gas" en Permisos. El usuario firma y el agente paga el gas en USD₮.
  Sirve para usuarios **sin CELO** (Ripio fallaba al vender CELO). Anda en `localhost` y en la app publicada (variables cargadas en Vercel el 7/11).
- Registro de decisiones (`web/data/agent-ledger.jsonl`), rendimiento vs. pesos (`node scripts/pnl.mjs`) y **saldos en pesos** en la app.
- Respuesta de los organizadores en Telegram (Textile FX): *"We read your agent wallet. We don't care about volume. Only innovation and returns."*

**⚠️ El evaluador IA de Loops lee la copia del repo del momento en que se envió la entrega** (commit `1bc7df2`), por eso
no ve nada de lo de hoy. Hay que **volver a guardar la entrega** para que la tome de nuevo. Queda **1 sola evaluación**
en el equipo (cuenta de Facundo): la usamos después de volver a guardar.

**Para el domingo:**
- [ ] **Volver a guardar la entrega** (cualquiera de los dos): Playground → **Submit** → aparece "Draft restored" con campos
      vacíos → tocar **"Discard draft"** primero (carga la entrega guardada) → pegar la **descripción nueva** (está en la bóveda,
      `01 Hackatón/Entrega.md`, sección "Descripción nueva"; la vieja prometía x402) → revisar tracks (Textile FX + LatAm) → guardar/enviar.
      Avisarse antes de enviar.
- [ ] **Video demo de 2:30–3:00** — guion completo en la bóveda: `01 Hackatón/Guion del video.md`. Hace falta una wallet con
      ~3.000 wARS y **sin CELO**. Si sos vos el que prueba, también contás como usuario real. Subir a YouTube como "no listado"
      y pegar el link en la entrega.
- [ ] **Usuarios reales (2 o 3, UCC):** que carguen wARS con Ripio, entren a la app y toquen "Autorizar sin gas"; con el
      agente corriendo, se convierte solo. Anotar su wallet, el hash y una frase de cada uno para el README.
- [x] **Facundo:** cargar `AGENT_PRIVATE_KEY` y `ATTRIBUTION_CODE` en Vercel (hecho 7/11; la ruta responde. Si un usuario ve "Configuración del agente inválida", la clave quedó mal) (Settings → Environment Variables) para que
      "Autorizar sin gas" ande en la app publicada. Solo él toca la clave.
- [ ] Usar la última evaluación del AI Evaluator **después** de volver a guardar la entrega.

### Gregorio (dueño de la entrada en Loops House: `celo_d25b3d01e1b4`, ya tiene la wallet del agente vinculada)
- [x] **Crear el equipo (enviado 2026-11-07, tracks Textile FX + LatAm):** en Loops House → Playground → **Submit**, guardar el proyecto desde TU cuenta
      (Submit pide capturas: **Facundo las saca y te las pasa** cuando el agente esté registrado y haya convertido). Datos para copiar
      (nombre, descripción, repo, wallet del agente) en la bóveda: `01 Hackatón/Entrega.md`.
      URL de la app: https://agents-on-open-rails.vercel.app
- [x] **Invitar a Facundo** desde **Team** para que los dos puedan editar la entrega.
- [x] Capturas listas (2026-11-07): `docs/capturas/` en el repo y `01 Hackatón/Capturas/` en la bóveda. Subir las 4 en Submit. Link de demo:
      https://agents-on-open-rails.vercel.app/?address=0x477fb107278e0a21e39b424ad7b497E7fd472159
- [ ] (Si da el tiempo) Video demo de 2–3 min → ver "Para el domingo" arriba.
- [ ] (Si da el tiempo) WalletConnect (tarea 2b, parte B).

### Facundo (o Gregorio, que creó la wallet del agente en su MetaMask y tiene la clave)
- [x] Cargar en la wallet del agente `0x477f…2159`: ~USD 1 de gas (USD₮ o CELO) + ~6.000 wARS.
- [x] Crear `web/.env.local` desde `web/.env.example` (ya trae `ATTRIBUTION_CODE=celo_d25b3d01e1b4`) y agregar `AGENT_PRIVATE_KEY`.
- [x] Registrar la identidad ERC-8004 → **agentId 10050** (2026-11-07).
- [x] Primera conversión real: 3.000 wARS → 1,82 USD₮ en Textile, con etiqueta (2026-11-07).

---

Cierre de la hackatón: **lun 9 nov, 06:00 (Argentina)**. Entregamos el **8 de noviembre**.
Detalle y contexto de cada tema: bóveda de Obsidian (`00 Inicio.md`) y [`README.md`](README.md).

## Reglas para todos

- **Nunca** commitear `web/.env.local`, claves privadas ni la API key de Obsidian. El repo es público.
- Código de atribución del equipo: `celo_d25b3d01e1b4` (confirmado en Loops House: "Tag seen on-chain").
  El que se calcula desde el repo, `celo_976812496a25`, **no** es el correcto.
  Todo lo que firma va con la etiqueta ERC-8021 (ver `web/scripts/register-agent.mjs`).
- La wallet del agente (`0x477f…2159`) la creó Gregorio en su MetaMask: la clave privada se exporta desde ahí y va solo en `web/.env.local` de quien corra los scripts. Para probar, cada uno usa su propia wallet de desarrollo.
- Antes de subir cambios: `cd web && npx tsc --noEmit && npm run lint`.
- Después de cambios grandes: `/graphify --update`, commitear `graphify-out/` (sin la caché) y `node scripts/graph-to-obsidian.mjs`.
- Mensajes de commit en español, cortos y claros.

---

## Gregorio

### 1. Puesta en marcha (prioridad alta, hoy)
- [x] Clonar el repo, `cd web && npm install && npm run dev` y abrir http://localhost:3000.
- [x] Copiar `web/.env.example` a `web/.env.local` (dejar `AGENT_PRIVATE_KEY` vacío).
- [ ] Crear una **wallet de desarrollo propia** (MetaMask) en Celo mainnet y pasarle la dirección pública a Facundo.
- [x] Probar el script de cotizaciones: `cd web && node scripts/textile-quote.mjs 2000,10000`.
- [x] Indicar la ruta local de la bóveda (carpeta de Google Drive) en la variable de entorno `OBSIDIAN_VAULT_PATH`
      (o en `~/.config/obsidian-mcp/vault_path`). La usan la skill `obsidian-docs` y el script del grafo.
- [x] Exportar el grafo a la bóveda **solo** con `node scripts/graph-to-obsidian.mjs` (va a `08 Grafo del código/`).
      No exportar graphify a otras carpetas de la bóveda: se duplicarían las notas.
- [x] Leer las reglas de convivencia en `.claude/skills/obsidian-docs/SKILL.md` (los agentes de los dos escriben en la misma bóveda).

### 2. Cotización de Textile en la app (prioridad alta)
Mostrar en el panel a cuánto se convierten los pesos ahora mismo.
- [x] Ruta de API en Next: `web/src/app/api/textile/quote/route.ts` que llame a `POST https://app.textilecredit.com/v2/rfq/preview`
      (formato en `web/scripts/textile-quote.mjs`). Se hace del lado del servidor para evitar problemas de CORS.
- [x] Componente `TextileQuote` en el panel: monto en wARS → USD₮ estimados, tipo de cambio y comisión. Actualizar cada ~30 s.
- [x] Manejar el caso `status: "no_quote"` (por ejemplo, USD₮ → wARS por encima de ~42 USD₮ no tiene liquidez).
- **Listo cuando:** el panel muestra la cotización real y no rompe si Textile no responde.

### 2b. Entrar sin extensión de wallet (prioridad alta — bloqueante para previsualizar)
Exigir una extensión instalada es una barrera para el usuario y hoy impide ver el panel (`Tu tesorería`) sin wallet.
Decidido (2026-10-24): **modo solo lectura + WalletConnect**, además del conector actual `injected()`.

> ⚠️ Con la dirección pública solo se puede **ver**; para **firmar** hace falta una wallet. La app **nunca** pide
> clave privada ni frase semilla: en los textos de la UI decir siempre "dirección pública (0x…)".

**Parte A — Modo solo lectura** ✅ hecha por Facundo/Claude (2026-10-24): `Treasury.tsx`, `WatchAddressForm.tsx`, `ReadOnlyBanner.tsx`.
Demo: https://agents-on-open-rails.vercel.app/?address=0x477fb107278e0a21e39b424ad7b497E7fd472159
- [x] En la pantalla de inicio, además de "Conectar wallet", un campo "Ver una wallet" para pegar una dirección pública.
      Validar con `isAddress` de viem y normalizar con `getAddress`.
- [x] Que la dirección quede en la URL (`/?address=0x…`) para poder compartir el panel (sirve como demo para los jueces,
      por ejemplo con la wallet del agente `0x477fb107278e0a21e39b424ad7b497E7fd472159`).
- [x] Mostrar el panel con esa dirección (`Balances`, `TextileQuote`, `SavingsCard`, `AgentActivity`) y un aviso visible
      "Modo solo lectura", con botón para salir y otro para conectar una wallet.
- [x] Ocultar o deshabilitar lo que requiera firmar (y que "Guardar reglas" diga que en solo lectura no se aplican).
- **Listo cuando:** sin ninguna extensión se puede pegar una dirección, ver el panel completo y compartir el link.

**Parte B — WalletConnect (para usuarios reales sin extensión)** ← Gregorio, siguiente
- [ ] Crear un proyecto gratis en Reown (cloud.reown.com) y obtener el `projectId`. Va en `web/.env.local` como
      `NEXT_PUBLIC_WC_PROJECT_ID` (agregar la variable vacía a `web/.env.example`; el id es público, pero no lo hardcodeen).
- [ ] Agregar el conector `walletConnect({ projectId })` de `wagmi/connectors` en `web/src/lib/wagmi.ts`, solo Celo mainnet.
      Revisar en la documentación de wagmi v3 qué paquete extra pide (probablemente `@walletconnect/ethereum-provider`).
- [ ] En `ConnectButton`: elegir entre "Wallet del navegador" (`injected`) y "WalletConnect (QR con el celular)".
      Si no hay extensión instalada, mostrar directamente la opción de WalletConnect.
- [ ] Probar escaneando el QR con una wallet de celular que soporte Celo (por ejemplo, MetaMask mobile) y anotar en la
      bóveda con cuáles funcionó.
- **Listo cuando:** se puede conectar desde el celular escaneando el QR, sin extensión, y el panel muestra esa wallet.

### 3. Actividad real del agente (prioridad media)
Reemplazar el estado vacío de `web/src/components/AgentActivity.tsx` por datos de la blockchain (solo lectura).
- [x] Leer los movimientos de la wallet del agente (hecho por Facundo/Claude 2026-11-07 con la API de Blockscout).
- [x] Listar fecha, tipo (entrada / conversión / pago), monto y link a `https://celoscan.io/tx/<hash>`.
- **Listo cuando:** muestra "sin movimientos" hoy y va a mostrar los reales apenas el agente opere.

### 4. Ahorro frente a quedarse en pesos (prioridad media)
- [x] En `web/src/components/SavingsCard.tsx`: valor actual en pesos de los USD₮ vs. los wARS convertidos (2026-11-07).
      Precio actual: `GET https://app.textilecredit.com/api/price?pair=wars-usdt&chainId=42220` (USD₮ por 1 wARS).
- [x] Explicar la cuenta en un texto chico debajo del número.

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

- [x] Publicar la app en Vercel → **https://agents-on-open-rails.vercel.app** (cada push a `main` se publica solo; 2026-10-24).
- [x] Confirmar el código de atribución → `celo_d25b3d01e1b4` (Loops lo ve on-chain, 2026-11-07).
- [x] Cargar gas y registrar la identidad ERC-8004 → agentId 10050 (2026-11-07).
- [x] Prueba real en Textile: 3.000 wARS → 1,82 USD₮ (2026-11-07).
- [x] Definir cómo custodia el agente los fondos de los usuarios → **permiso con tope (allowance)**: la plata queda en la wallet del usuario y el agente usa `transferFrom` hasta el tope aprobado (2026-10-24; diseño en la bóveda, `03 Técnico/Custodia con permiso (allowance)`).
- [x] Completar y enviar la entrega en Loops House (Gregorio, 2026-11-07).

## Juntos (custodia definida: permiso con tope)

- [x] Pantalla de permisos (`AgentPermissions.tsx`): `approve` de wARS (tope de protección) y de USD₮ (presupuesto) a la wallet del agente, con etiqueta ERC-8021, permisos vigentes y botón para revocar (2026-11-07).
- [x] Agente autónomo (`agent-watch.mjs`): detecta wARS (en el agente o de usuarios con permiso) → `transferFrom` → convierte en Textile con guard de precio → devuelve USD₮ (2026-11-07).
- [ ] Pagar servicios con `transferFrom` de USD₮ + x402 / buy, dentro del presupuesto.
- [x] Reglas del agente en `web/src/config/agent-policy.json`: las aplica el agente y las muestra la app (2026-11-07).
- [ ] Conseguir los primeros usuarios reales (devs y estudiantes de la UCC).
