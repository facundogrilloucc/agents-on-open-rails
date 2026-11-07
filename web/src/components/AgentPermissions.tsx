"use client";

import { toDataSuffix } from "@celo/attribution-tags";
import { useEffect, useState } from "react";
import { erc20Abi, formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AGENT_ADDRESS, ATTRIBUTION_CODE, EXPLORER_URL, TOKENS, type Token } from "@/config/app";

// Custodia por permiso con tope: la plata queda en la wallet del usuario y el agente solo puede tomar
// (transferFrom) hasta el monto que el usuario aprueba acá. Se revoca en cualquier momento.
const PERMISSIONS: { token: Token; title: string; help: string; suggested: string }[] = [
  {
    token: TOKENS.wARS,
    title: "Pesos a proteger",
    help: "El agente puede tomar hasta este monto de wARS, convertirlo a USD₮ en Textile FX y devolvértelo en dólares.",
    suggested: "10000",
  },
  {
    token: TOKENS.USDT,
    title: "Presupuesto de gasto",
    help: "El agente puede usar hasta este monto de USD₮ para pagar por uso APIs e IA que necesites.",
    suggested: "5",
  },
];

const suffix = toDataSuffix(ATTRIBUTION_CODE);
const ZERO = BigInt(0);
const UNLIMITED_FROM = maxUint256 / BigInt(2);

function fmt(value: bigint, token: Token) {
  if (value > UNLIMITED_FROM) return "sin límite";
  return `${Number(formatUnits(value, token.decimals)).toLocaleString("es-AR", { maximumFractionDigits: 4 })} ${token.symbol}`;
}

export function AgentPermissions({ owner, readOnly = false }: { owner: Address; readOnly?: boolean }) {
  const { data, refetch } = useReadContracts({
    contracts: PERMISSIONS.flatMap(({ token }) => [
      { address: token.address, abi: erc20Abi, functionName: "allowance" as const, args: [owner, AGENT_ADDRESS] as const },
      { address: token.address, abi: erc20Abi, functionName: "balanceOf" as const, args: [owner] as const },
    ]),
    query: { refetchInterval: 15_000 },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Permisos al agente</h2>
      <p className="mt-1 text-xs text-muted">
        Tu plata queda en tu wallet. El agente solo puede usar hasta el tope que apruebes, y lo podés revocar cuando quieras.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {PERMISSIONS.map((p, i) => {
          const allowance = data?.[i * 2]?.status === "success" ? (data[i * 2].result as bigint) : undefined;
          const balance = data?.[i * 2 + 1]?.status === "success" ? (data[i * 2 + 1].result as bigint) : undefined;
          return (
            <PermissionCard
              key={p.token.symbol}
              {...p}
              allowance={allowance}
              balance={balance}
              readOnly={readOnly}
              onDone={refetch}
            />
          );
        })}
      </div>
    </section>
  );
}

function PermissionCard({
  token, title, help, suggested, allowance, balance, readOnly, onDone,
}: {
  token: Token; title: string; help: string; suggested: string;
  allowance?: bigint; balance?: bigint; readOnly: boolean; onDone: () => unknown;
}) {
  const [cap, setCap] = useState(suggested);
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  // Cuando se confirma la transacción, refrescar permisos y saldos.
  useEffect(() => {
    if (receipt.isSuccess) onDone();
  }, [receipt.isSuccess, onDone]);

  const pending = write.isPending || receipt.isLoading;
  const capValid = Number(cap) > 0;

  function approve(amount: bigint) {
    write.mutate({
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [AGENT_ADDRESS, amount],
      dataSuffix: suffix,
    });
  }

  return (
    <div className="grid gap-3 rounded-xl bg-background p-4">
      <div>
        <div className="font-medium">{title}</div>
        <p className="mt-0.5 text-xs text-muted">{help}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted">Permiso actual</dt>
          <dd className="text-sm font-semibold tabular-nums">{allowance === undefined ? "…" : fmt(allowance, token)}</dd>
        </div>
        <div>
          <dt className="text-muted">Saldo</dt>
          <dd className="text-sm font-semibold tabular-nums">{balance === undefined ? "…" : fmt(balance, token)}</dd>
        </div>
      </dl>

      {readOnly ? (
        <p className="text-xs text-muted">En modo solo lectura no se pueden cambiar los permisos.</p>
      ) : (
        <>
          <label className="grid gap-1 text-xs text-muted">
            Tope ({token.symbol})
            <input
              type="number"
              min={0}
              step="any"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground tabular-nums"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => approve(parseUnits(cap, token.decimals))}
              disabled={pending || !capValid}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Esperando firma…" : "Autorizar"}
            </button>
            {allowance !== undefined && allowance > ZERO && (
              <button
                type="button"
                onClick={() => approve(ZERO)}
                disabled={pending}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Revocar
              </button>
            )}
          </div>
          {write.error && (
            <p className="text-xs text-red-500">
              {/reject|denied/i.test(write.error.message)
                ? "Cancelaste la firma."
                : "No se pudo enviar la transacción. ¿Tenés saldo para el gas?"}
            </p>
          )}
          {write.data && (
            <a
              href={`${EXPLORER_URL}/tx/${write.data}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted underline underline-offset-2"
            >
              {receipt.isSuccess ? "Confirmado ✓ · ver transacción ↗" : "Transacción enviada · ver ↗"}
            </a>
          )}
        </>
      )}
    </div>
  );
}
