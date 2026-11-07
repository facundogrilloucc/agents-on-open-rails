// Política del agente (src/config/agent-policy.json) y registro de decisiones y operaciones
// (data/agent-ledger.jsonl, una línea JSON por evento). El registro alimenta los topes diarios y el P&L.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { parseUnits } from "viem";
import { TOKENS } from "./agent.mjs";

const POLICY_URL = new URL("../../src/config/agent-policy.json", import.meta.url);
export const LEDGER_URL = new URL("../../data/agent-ledger.jsonl", import.meta.url);

export function loadPolicy() {
  const raw = JSON.parse(readFileSync(POLICY_URL, "utf8"));
  const p = raw.protect;
  const w = (n) => parseUnits(String(n), TOKENS.wARS.decimals);
  return {
    raw,
    minConvert: w(p.minConvertWars),
    maxPerRun: w(p.maxConvertPerRunWars),
    maxDaily: w(p.maxDailyWars),
    keepBuffer: w(p.keepWarsBuffer),
    maxSlippageBps: p.maxSlippageBps,
    intervalSeconds: raw.watch.intervalSeconds,
    usersFromBlock: raw.watch.usersFromBlock,
  };
}

export function readLedger() {
  try {
    return readFileSync(LEDGER_URL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function appendLedger(entry) {
  mkdirSync(new URL(".", LEDGER_URL), { recursive: true });
  appendFileSync(LEDGER_URL, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

// wARS ya convertidos en las últimas 24 h (para el tope diario).
export function convertedLast24h() {
  const since = Date.now() - 24 * 3600 * 1000;
  return readLedger()
    .filter((e) => e.type === "trade" && Date.parse(e.at) >= since)
    .reduce((sum, e) => sum + BigInt(e.warsSoldWei), 0n);
}
