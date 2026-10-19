"use client";

import { erc20Abi, formatUnits, type Address } from "viem";
import { useReadContracts } from "wagmi";
import { TOKENS } from "@/config/app";

const tokenList = Object.values(TOKENS);

function formatAmount(value: bigint, decimals: number) {
  const n = Number(formatUnits(value, decimals));
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function Balances({ address }: { address: Address }) {
  const { data, isLoading, isError } = useReadContracts({
    contracts: tokenList.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    })),
    query: { refetchInterval: 15_000 },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Saldos en Celo</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {tokenList.map((token, i) => {
          const result = data?.[i];
          const value =
            result?.status === "success" ? formatAmount(result.result, token.decimals) : null;
          return (
            <li key={token.symbol} className="rounded-xl bg-background p-4">
              <div className="text-xs text-muted">{token.name}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {isLoading ? "…" : (value ?? "—")}
                <span className="ml-1 text-sm font-normal text-muted">{token.symbol}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {isError && <p className="mt-3 text-xs text-red-500">No se pudieron leer los saldos.</p>}
    </section>
  );
}
