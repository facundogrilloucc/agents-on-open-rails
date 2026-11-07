"use client";

import { useQuery } from "@tanstack/react-query";
import type { TextileQuoteResponse } from "@/app/api/textile/quote/route";

// wARS por 1 USD₮ según el precio de referencia de Textile (el mismo benchmark que scripts/pnl.mjs).
// Si la referencia no responde, usa la cotización de Textile para 10.000 wARS.
async function fetchWarsPerUsdt(): Promise<number | null> {
  const res = await fetch("/api/textile/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction: "wARS_to_USDT", amount: 10000 }),
  });
  const q: TextileQuoteResponse = await res.json();
  if (q.status === "preview") return q.referenceWarsPerUsdt ?? q.warsPerUsdt;
  if (q.status === "no_quote") return q.referenceWarsPerUsdt;
  return null;
}

export function useWarsPerUsdt() {
  return useQuery({ queryKey: ["wars-per-usdt"], queryFn: fetchWarsPerUsdt, refetchInterval: 60_000 });
}
