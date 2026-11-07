// Núcleo de "proteger pesos": convierte wARS → USD₮ en Textile FX respetando la política del agente.
// Lo usan agent-protect.mjs (una vez, a mano) y agent-watch.mjs (loop autónomo).
//
// Reglas (ver STRATEGY.md):
//   1. Monto entre el mínimo y el máximo por corrida, y sin pasar el tope diario (registro de 24 h).
//   2. La cotización de Textile no puede ser peor que el precio de referencia por más de maxSlippageBps.
//      Se chequea con la cotización indicativa y otra vez con la firme, justo antes de firmar.
//   3. Si algo falla después de tomar los wARS del usuario, se le devuelven.
// Cada decisión (operar, saltear, abortar) queda en data/agent-ledger.jsonl.
import { randomBytes } from "node:crypto";
import { erc20Abi } from "viem";
import { celo } from "viem/chains";
import { AGENT_ADDRESS, EXPLORER, TOKENS, balanceOf, checkTag, fmt, pickGas, publicClient, taggedWalletClient } from "./agent.mjs";
import { appendLedger, convertedLast24h } from "./policy.mjs";
import { pairLimits, referenceWarsPerUsdt, textile } from "./textile.mjs";

const SELL = TOKENS.wARS;
const BUY = TOKENS.USDT;

// Diferencia en puntos básicos entre lo que cobra Textile (wARS por USD₮) y la referencia. Positivo = peor.
function slippageBps(warsPaid, usdtReceived, refRate) {
  const rate = Number(warsPaid) / 10 ** SELL.decimals / (Number(usdtReceived) / 10 ** BUY.decimals);
  return { rate, bps: refRate ? Math.round((rate / refRate - 1) * 10_000) : null };
}

/**
 * @returns {Promise<{ status: "traded" | "simulated" | "skipped" | "failed", reason?: string, ... }>}
 */
export async function protect({ amount, user = null, send, account, code, policy, log = console.log }) {
  const agent = account?.address ?? AGENT_ADDRESS;
  const source = user ?? agent;
  const skip = (reason, extra = {}) => {
    log(`↷ No se opera: ${reason}`);
    if (send) appendLedger({ type: "decision", action: "skip", reason, user, amountWei: amount.toString(), ...extra });
    return { status: "skipped", reason };
  };

  // --- 1. Política
  if (amount < policy.minConvert) return skip(`${fmt(SELL, amount)} está por debajo del mínimo de la política (${fmt(SELL, policy.minConvert)}).`);
  if (amount > policy.maxPerRun) return skip(`${fmt(SELL, amount)} supera el máximo por corrida (${fmt(SELL, policy.maxPerRun)}).`);
  const today = convertedLast24h();
  if (today + amount > policy.maxDaily) return skip(`superaría el tope diario (${fmt(SELL, today)} convertidos en 24 h, tope ${fmt(SELL, policy.maxDaily)}).`);

  // --- 2. Fondos y permiso (en simulación solo avisa, para poder ver la cotización igual)
  const short = (reason) => (send ? skip(reason) : (log(`⚠ ${reason} (simulación: sigo para mostrar la cotización)`), null));
  const bal = await balanceOf(SELL, source);
  if (bal < amount) {
    const r = short(`${user ? "el usuario" : "el agente"} tiene ${fmt(SELL, bal)}, menos que ${fmt(SELL, amount)}.`);
    if (r) return r;
  }
  if (user) {
    const allowance = await publicClient.readContract({ address: SELL.address, abi: erc20Abi, functionName: "allowance", args: [user, agent] });
    if (allowance < amount) {
      const r = short(`el permiso del usuario (${fmt(SELL, allowance)}) no alcanza.`);
      if (r) return r;
    }
  }

  // --- 3. Textile: límites del par y cotización indicativa contra la referencia
  const limits = await pairLimits(SELL.address, BUY.address);
  if (!limits) return skip("Textile no tiene habilitado el par wARS → USD₮.");
  if (amount < limits.min) return skip(`el mínimo de Textile hoy es ${fmt(SELL, limits.min)}.`);
  if (amount > limits.max) return skip(`el máximo de Textile hoy es ${fmt(SELL, limits.max)}.`);

  const quoteBody = { chainId: celo.id, sellToken: SELL.address.toLowerCase(), buyToken: BUY.address.toLowerCase(), sellAmount: amount.toString() };
  const [preview, refRate] = await Promise.all([textile("/rfq/preview", quoteBody), referenceWarsPerUsdt()]);
  if (preview.status !== "preview") return skip(`Textile no cotiza este monto (${preview.reason ?? preview.status}).`);
  const indicative = slippageBps(BigInt(preview.takerPays ?? preview.sellAmount), BigInt(preview.buyAmount), refRate);
  log(`Cotización indicativa: ${fmt(SELL, amount)} → ${fmt(BUY, BigInt(preview.buyAmount))} · 1 USD₮ = ${indicative.rate.toFixed(2)} wARS` +
    (refRate ? ` · referencia ${refRate.toFixed(2)} · ${indicative.bps} bps (máx. ${policy.maxSlippageBps})` : " · referencia no disponible"));
  if (refRate === null) return skip("no hay precio de referencia para controlar la cotización.");
  if (indicative.bps > policy.maxSlippageBps) return skip(`la cotización está ${indicative.bps} bps peor que la referencia.`, { refRate, rate: indicative.rate });

  if (!send) {
    log("Simulación: con --send se ejecutaría.");
    return { status: "simulated", rate: indicative.rate, refRate, bps: indicative.bps };
  }

  // --- 4. Ejecutar
  const gas = await pickGas(agent);
  if (!gas.ok) return skip("la wallet del agente no tiene saldo para el gas.");
  const wallet = taggedWalletClient(account, code);
  const fee = gas.feeCurrency ? { feeCurrency: gas.feeCurrency } : {};
  const hashes = [];
  const wait = async (label, hash) => {
    log(`→ ${label}: ${EXPLORER}/tx/${hash}`);
    const r = await publicClient.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${label} falló`);
    hashes.push(hash);
    return hash;
  };

  let pulled = false;
  try {
    if (user) {
      await wait("tomar wARS del usuario", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "transferFrom", args: [user, agent, amount], ...fee }));
      pulled = true;
    }

    // Cotización firme: el agente prueba que controla su wallet con una firma EIP-712 (sin API key).
    const takerProof = { nonce: `0x${randomBytes(32).toString("hex")}`, issuedAt: Date.now() };
    takerProof.signature = await account.signTypedData({
      domain: { name: "Textile Taker Control", version: "1", chainId: celo.id },
      types: { TakerControl: [
        { name: "taker", type: "address" }, { name: "chainId", type: "uint256" },
        { name: "nonce", type: "bytes32" }, { name: "issuedAt", type: "uint256" },
      ] },
      primaryType: "TakerControl",
      message: { taker: agent, chainId: BigInt(celo.id), nonce: takerProof.nonce, issuedAt: BigInt(takerProof.issuedAt) },
    });
    const rfq = await textile("/rfq/request", { ...quoteBody, taker: agent, takerProof });
    if (rfq.status !== "quoted") throw new Error(`Textile no dio cotización firme (${rfq.reason ?? rfq.status}).`);
    const q = rfq.quote;
    const firm = slippageBps(BigInt(q.takerPays), BigInt(q.buyAmount), refRate);
    log(`Cotización firme ${rfq.rfqId}: ${fmt(SELL, BigInt(q.takerPays))} → ${fmt(BUY, BigInt(q.buyAmount))} · ${firm.bps} bps vs. referencia · vence ${q.expiresAt}`);
    if (firm.bps > policy.maxSlippageBps) throw new Error(`la cotización firme está ${firm.bps} bps peor que la referencia (máx. ${policy.maxSlippageBps}).`);

    const current = await publicClient.readContract({ address: SELL.address, abi: erc20Abi, functionName: "allowance", args: [agent, q.reactor] });
    if (current < BigInt(q.takerPays)) {
      await wait("permiso a Textile", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "approve", args: [q.reactor, BigInt(q.takerPays)], ...fee }));
    }
    if (Date.now() > Date.parse(q.expiresAt) - 3_000) throw new Error("la cotización venció mientras se aprobaba.");
    const swapHash = await wait("conversión en Textile", await wallet.sendTransaction({ to: rfq.transactions.swap.to, data: rfq.transactions.swap.data, value: 0n, ...fee }));
    await textile(`/rfq/${encodeURIComponent(rfq.rfqId)}/submit`, { txHash: swapHash }, { "X-Rfq-Claim": rfq.claimToken })
      .catch((e) => log(`  (aviso: no se pudo informar el hash a Textile: ${e.message})`));
    pulled = false;

    let returnHash = null;
    if (user) {
      returnHash = await wait("devolver USD₮ al usuario", await wallet.writeContract({ address: BUY.address, abi: erc20Abi, functionName: "transfer", args: [user, BigInt(q.buyAmount)], ...fee }));
    }

    appendLedger({
      type: "trade", rfqId: rfq.rfqId, user, swapTx: swapHash, returnTx: returnHash, txs: hashes,
      warsSoldWei: q.takerPays, usdtReceivedWei: q.buyAmount, rate: firm.rate, refRate, slippageBps: firm.bps, gas: gas.label,
    });
    log(`✓ Protegidos ${fmt(SELL, BigInt(q.takerPays))} → ${fmt(BUY, BigInt(q.buyAmount))}`);
    for (const h of hashes) await checkTag(h, code);
    return { status: "traded", swapTx: swapHash, rate: firm.rate, refRate, bps: firm.bps };
  } catch (e) {
    log(`✗ ${e.message}`);
    appendLedger({ type: "decision", action: "abort", reason: e.message, user, amountWei: amount.toString(), txs: hashes });
    if (pulled) {
      log("  Devolviendo los wARS al usuario…");
      await wait("devolver wARS al usuario", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "transfer", args: [user, amount], ...fee }));
    }
    return { status: "failed", reason: e.message };
  }
}
