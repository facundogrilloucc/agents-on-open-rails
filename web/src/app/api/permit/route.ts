// Permiso sin gas (EIP-2612): el usuario firma en su wallet un mensaje "Permit" para el agente y el agente
// lo presenta en la blockchain pagando el gas en USD₮ (fee abstraction de Celo), con la etiqueta ERC-8021.
// Así alguien que recién cargó wARS con Ripio puede usar el agente sin comprar CELO.
//
// Necesita AGENT_PRIVATE_KEY y ATTRIBUTION_CODE en el entorno del servidor (web/.env.local en local, o las
// variables del proyecto en Vercel). Sin eso responde 503 y la app ofrece el permiso común (approve).
import { toDataSuffix } from "@celo/attribution-tags";
import {
  createPublicClient, createWalletClient, erc20Abi, getAddress, http, isAddress, isHex, parseAbi,
  parseSignature, recoverTypedDataAddress, type Address, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { AGENT_ADDRESS, TOKENS } from "@/config/app";
import { PERMIT_DOMAIN, PERMIT_TYPES } from "@/config/permit";

const permitAbi = parseAbi([
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
]);

// Adaptadores de fee currency (en feeCurrency va el adaptador, no el token). Mismos que scripts/lib/agent.mjs.
const GAS_TOKENS: { token: Address; adapter: Address }[] = [
  { token: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", adapter: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72" },
  { token: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", adapter: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" },
];

const publicClient = createPublicClient({ chain: celo, transport: http() });

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const key = process.env.AGENT_PRIVATE_KEY;
  const code = process.env.ATTRIBUTION_CODE;
  if (!key || !code) return bad("El agente no está disponible en este servidor.", 503);

  const body = await request.json().catch(() => null);
  const { owner, value, deadline, signature } = body ?? {};
  if (!isAddress(owner ?? "") || !isHex(signature ?? "")) return bad("Datos incompletos.");
  let valueBn: bigint, deadlineBn: bigint;
  try {
    valueBn = BigInt(value);
    deadlineBn = BigInt(deadline);
  } catch {
    return bad("Monto o vencimiento inválido.");
  }
  if (valueBn <= BigInt(0)) return bad("El monto tiene que ser mayor a cero.");
  if (deadlineBn * BigInt(1000) < BigInt(Date.now() + 60_000)) return bad("La firma está vencida.");

  const ownerAddr = getAddress(owner);
  const nonce = await publicClient.readContract({ address: TOKENS.wARS.address, abi: permitAbi, functionName: "nonces", args: [ownerAddr] });
  const message = { owner: ownerAddr, spender: AGENT_ADDRESS, value: valueBn, nonce, deadline: deadlineBn };

  // La firma tiene que ser del dueño y para el agente; si no, ni se intenta (no gastar gas en firmas inválidas).
  const signer = await recoverTypedDataAddress({ domain: PERMIT_DOMAIN, types: PERMIT_TYPES, primaryType: "Permit", message, signature: signature as Hex });
  if (signer.toLowerCase() !== ownerAddr.toLowerCase()) return bad("La firma no corresponde a esa wallet.");

  // Solo para quien tenga wARS: evita que se use el agente para gastar gas en permisos vacíos.
  const balance = await publicClient.readContract({ address: TOKENS.wARS.address, abi: erc20Abi, functionName: "balanceOf", args: [ownerAddr] });
  if (balance === BigInt(0)) return bad("Esa wallet no tiene wARS.");

  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex);
  if (account.address.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) return bad("Configuración del agente inválida.", 500);

  let feeCurrency: Address | undefined;
  if ((await publicClient.getBalance({ address: account.address })) === BigInt(0)) {
    for (const g of GAS_TOKENS) {
      const b = await publicClient.readContract({ address: g.token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
      if (b > BigInt(0)) { feeCurrency = g.adapter; break; }
    }
    if (!feeCurrency) return bad("El agente no tiene saldo para el gas.", 503);
  }

  const wallet = createWalletClient({ account, chain: celo, transport: http(), dataSuffix: toDataSuffix(code) });
  const { v, r, s, yParity } = parseSignature(signature as Hex);
  try {
    const hash = await wallet.writeContract({
      address: TOKENS.wARS.address,
      abi: permitAbi,
      functionName: "permit",
      args: [ownerAddr, AGENT_ADDRESS, valueBn, deadlineBn, Number(v ?? BigInt(yParity + 27)), r, s],
      ...(feeCurrency ? { feeCurrency } : {}),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") return bad("La transacción del permiso falló.", 502);
    return Response.json({ hash });
  } catch (e) {
    return bad(e instanceof Error ? e.message.split("\n")[0] : "No se pudo enviar el permiso.", 502);
  }
}
