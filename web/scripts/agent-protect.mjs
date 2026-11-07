// El agente protege pesos una vez: convierte wARS → USD₮ en Textile FX respetando la política
// (src/config/agent-policy.json). Para el modo autónomo, ver agent-watch.mjs.
//
//   node scripts/agent-protect.mjs <monto wARS>                      → simulación
//   node scripts/agent-protect.mjs <monto wARS> --send               → convierte wARS que tiene el agente
//   node scripts/agent-protect.mjs <monto wARS> --user 0x… [--send]  → toma los wARS del usuario con su
//        permiso (transferFrom), convierte y le devuelve los USD₮ (custodia por permiso con tope)
//   --max-slippage-bps N   endurece el guard de precio solo en esta corrida (sirve para probar un rechazo;
//                          queda anotado en el registro como policyOverride)
//
// Todas las transacciones van con la etiqueta de atribución (ATTRIBUTION_CODE).
import { getAddress, isAddress, parseUnits } from "viem";
import { AGENT_ADDRESS, TOKENS, agentAccount, attributionCode, fail, loadEnv, pickGas } from "./lib/agent.mjs";
import { loadPolicy } from "./lib/policy.mjs";
import { protect } from "./lib/protect.mjs";

const args = process.argv.slice(2);
const send = args.includes("--send");
const amountArg = args.find((a) => !a.startsWith("--") && !["--user", "--max-slippage-bps"].includes(args[args.indexOf(a) - 1]));
const slipArg = args.includes("--max-slippage-bps") ? Number(args[args.indexOf("--max-slippage-bps") + 1]) : null;
if (slipArg !== null && !(slipArg >= 0)) fail("--max-slippage-bps tiene que ser un número ≥ 0.");
const userArg = args.includes("--user") ? args[args.indexOf("--user") + 1] : null;
if (!amountArg || !(Number(amountArg) > 0)) fail("Uso: node scripts/agent-protect.mjs <monto wARS> [--user 0x…] [--send]");
if (userArg && !isAddress(userArg, { strict: false })) fail(`Dirección de usuario inválida: ${userArg}`);

loadEnv();
const code = attributionCode({ required: send });
const account = agentAccount({ required: send });
const user = userArg ? getAddress(userArg) : null;
const amount = parseUnits(amountArg, TOKENS.wARS.decimals);
const policy = loadPolicy();
if (slipArg !== null) {
  // Solo se permite endurecer el guard, nunca aflojarlo.
  if (slipArg > policy.maxSlippageBps) fail(`--max-slippage-bps solo puede bajar el tope (hoy ${policy.maxSlippageBps}).`);
  policy.override = { maxSlippageBps: slipArg, was: policy.maxSlippageBps };
  policy.maxSlippageBps = slipArg;
  console.log(`Guard de precio endurecido para esta corrida: máx. ${slipArg} bps (la política dice ${policy.override.was}).`);
}

console.log(`Agente: ${account?.address ?? AGENT_ADDRESS}${user ? ` · usuario: ${user}` : ""}`);
console.log(`Etiqueta: ${code ?? "(no definida)"} · gas en: ${(await pickGas(account?.address ?? AGENT_ADDRESS)).label}`);
const result = await protect({ amount, user, send, account, code, policy });
process.exit(result.status === "failed" ? 1 : 0);
