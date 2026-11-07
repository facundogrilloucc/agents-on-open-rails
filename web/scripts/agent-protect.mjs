// El agente protege pesos una vez: convierte wARS → USD₮ en Textile FX respetando la política
// (src/config/agent-policy.json). Para el modo autónomo, ver agent-watch.mjs.
//
//   node scripts/agent-protect.mjs <monto wARS>                      → simulación
//   node scripts/agent-protect.mjs <monto wARS> --send               → convierte wARS que tiene el agente
//   node scripts/agent-protect.mjs <monto wARS> --user 0x… [--send]  → toma los wARS del usuario con su
//        permiso (transferFrom), convierte y le devuelve los USD₮ (custodia por permiso con tope)
//
// Todas las transacciones van con la etiqueta de atribución (ATTRIBUTION_CODE).
import { getAddress, isAddress, parseUnits } from "viem";
import { AGENT_ADDRESS, TOKENS, agentAccount, attributionCode, fail, loadEnv, pickGas } from "./lib/agent.mjs";
import { loadPolicy } from "./lib/policy.mjs";
import { protect } from "./lib/protect.mjs";

const args = process.argv.slice(2);
const send = args.includes("--send");
const amountArg = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--user");
const userArg = args.includes("--user") ? args[args.indexOf("--user") + 1] : null;
if (!amountArg || !(Number(amountArg) > 0)) fail("Uso: node scripts/agent-protect.mjs <monto wARS> [--user 0x…] [--send]");
if (userArg && !isAddress(userArg, { strict: false })) fail(`Dirección de usuario inválida: ${userArg}`);

loadEnv();
const code = attributionCode({ required: send });
const account = agentAccount({ required: send });
const user = userArg ? getAddress(userArg) : null;
const amount = parseUnits(amountArg, TOKENS.wARS.decimals);
const policy = loadPolicy();

console.log(`Agente: ${account?.address ?? AGENT_ADDRESS}${user ? ` · usuario: ${user}` : ""}`);
console.log(`Etiqueta: ${code ?? "(no definida)"} · gas en: ${(await pickGas(account?.address ?? AGENT_ADDRESS)).label}`);
const result = await protect({ amount, user, send, account, code, policy });
process.exit(result.status === "failed" ? 1 : 0);
