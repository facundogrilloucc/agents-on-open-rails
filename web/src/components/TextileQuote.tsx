"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { QuoteDirection, TextileQuoteResponse } from "@/app/api/textile/quote/route";

function fmt(n: number, maxDecimals = 2) {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: maxDecimals === 2 ? 2 : 0,
    maximumFractionDigits: maxDecimals,
  });
}

export function TextileQuote() {
  const [direction, setDirection] = useState<QuoteDirection>("wARS_to_USDT");
  const [amountInput, setAmountInput] = useState<string>("10000");

  const numericAmount = Number(amountInput);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  const { data, isLoading, isFetching, isError } = useQuery<TextileQuoteResponse>({
    queryKey: ["textile-quote", direction, numericAmount],
    queryFn: async () => {
      const res = await fetch("/api/textile/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, amount: numericAmount }),
      });
      return res.json();
    },
    enabled: validAmount,
    refetchInterval: 30_000,
    retry: 1,
  });

  function switchDirection(next: QuoteDirection) {
    if (next === direction) return;
    setDirection(next);
    setAmountInput(next === "wARS_to_USDT" ? "10000" : "10");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-muted">Cotización en vivo · Textile FX</h2>
          <p className="text-xs text-muted">
            Se actualiza automáticamente cada 30 segundos en Celo mainnet.
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-background p-1 text-xs">
          <button
            type="button"
            onClick={() => switchDirection("wARS_to_USDT")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              direction === "wARS_to_USDT"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            wARS → USD₮
          </button>
          <button
            type="button"
            onClick={() => switchDirection("USDT_to_wARS")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              direction === "USDT_to_wARS"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            USD₮ → wARS
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted">
            Monto a convertir ({direction === "wARS_to_USDT" ? "wARS" : "USD₮"})
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-lg font-semibold tabular-nums"
          />
        </label>

        <div className="rounded-xl bg-background p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Recibís estimado</span>
            {isFetching && !isLoading && <span>Actualizando…</span>}
          </div>

          {!validAmount ? (
            <div className="mt-1 text-sm text-muted">Ingresá un monto mayor a 0.</div>
          ) : isLoading ? (
            <div className="mt-1 text-2xl font-semibold tabular-nums text-muted">Cotizando…</div>
          ) : isError || !data || data.status === "error" ? (
            <div className="mt-1 text-sm text-red-500">
              {data?.status === "error"
                ? data.error
                : "No se pudo consultar Textile FX en este momento."}
            </div>
          ) : data.status === "no_quote" ? (
            <div className="mt-1 text-sm text-amber-500">
              Sin cotización disponible para este monto ({data.reason}). Liquidez actual:{" "}
              <span className="font-semibold tabular-nums">
                {fmt(data.availableSellAmount, direction === "wARS_to_USDT" ? 0 : 2)}{" "}
                {data.sellSymbol}
              </span>
              .
            </div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {fmt(data.buyAmount, data.buySymbol === "USD₮" ? 4 : 2)}
                <span className="ml-1 text-sm font-normal text-muted">{data.buySymbol}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                <span>1 USD₮ = {fmt(data.warsPerUsdt, 2)} wARS</span>
                <span>
                  Comisión: {fmt(data.feeAmount, data.sellSymbol === "wARS" ? 2 : 4)}{" "}
                  {data.sellSymbol}
                </span>
                <span>
                  Liquidez disp.:{" "}
                  {fmt(data.availableSellAmount, data.sellSymbol === "wARS" ? 0 : 2)}{" "}
                  {data.sellSymbol}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
