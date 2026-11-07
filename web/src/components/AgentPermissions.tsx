"use client";

import { toDataSuffix } from "@celo/attribution-tags";
import { useEffect, useState } from "react";
import { erc20Abi, formatUnits, maxUint256, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { useReadContract, useReadContracts, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AGENT_ADDRESS, ATTRIBUTION_CODE, EXPLORER_URL, TOKENS, type Token } from "@/config/app";
import { PERMIT_DOMAIN, PERMIT_TTL_SECONDS, PERMIT_TYPES } from "@/config/permit";

// Custodia por permiso con tope: la plata queda en la wallet del usuario y el agente solo puede tomar
// (transferFrom) hasta el monto que el usuario aprueba acá. Se revoca en cualquier momento.
const PERMISSIONS: { token: Token; title: string; help: string; suggested: string; permit?: boolean }[] = [
  {
    token: TOKENS.wARS,
    permit: true, // wARS soporta EIP-2612: se puede autorizar con una firma, sin gas
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
const noncesAbi = parseAbi(["function nonces(address owner) view returns (uint256)"]);
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
              owner={owner}
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
  token, title, help, suggested, permit = false, owner, allowance, balance, readOnly, onDone,
}: {
  token: Token; title: string; help: string; suggested: string; permit?: boolean; owner: Address;
  allowance?: bigint; balance?: bigint; readOnly: boolean; onDone: () => unknown;
}) {
  const [cap, setCap] = useState(suggested);
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  // Permiso sin gas (EIP-2612): el usuario firma y el agente lo presenta pagando el gas (ver /api/permit).
  const sign = useSignTypedData();
  const nonce = useReadContract({
    address: token.address, abi: noncesAbi, functionName: "nonces", args: [owner],
    query: { enabled: permit && !readOnly },
  });
  const [gasless, setGasless] = useState<{ pending: boolean; hash?: Hex; error?: string }>({ pending: false });

  async function approveGasless(amount: bigint) {
    setGasless({ pending: true });
    try {
      // Leer el nonce justo antes de firmar: cada permiso usado lo incrementa, y uno viejo invalida la firma.
      const { data: currentNonce } = await nonce.refetch();
      if (currentNonce === undefined) throw new Error("No se pudo leer el contrato de wARS.");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_TTL_SECONDS);
      const signature = await sign.signTypedDataAsync({
        domain: PERMIT_DOMAIN, types: PERMIT_TYPES, primaryType: "Permit",
        message: { owner, spender: AGENT_ADDRESS, value: amount, nonce: currentNonce, deadline },
      });
      const res = await fetch("/api/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, value: amount.toString(), deadline: deadline.toString(), signature }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setGasless({ pending: false, hash: json.hash });
      nonce.refetch();
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setGasless({ pending: false, error: /reject|denied/i.test(msg) ? "Cancelaste la firma." : msg });
    }
  }

  // Cuando se confirma la transacción, refrescar permisos y saldos.
  useEffect(() => {
    if (receipt.isSuccess) onDone();
  }, [receipt.isSuccess, onDone]);

  const pending = write.isPending || receipt.isLoading || gasless.pending;
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
              {write.isPending || receipt.isLoading ? "Esperando firma…" : "Autorizar"}
            </button>
            {permit && (
              <button
                type="button"
                onClick={() => approveGasless(parseUnits(cap, token.decimals))}
                disabled={pending || !capValid || nonce.data === undefined}
                className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
                title="Firmás un mensaje (no una transacción) y el agente paga el gas"
              >
                {gasless.pending ? "Firmando…" : "Autorizar sin gas"}
              </button>
            )}
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
          {permit && (
            <p className="text-xs text-muted">
              ¿Sin CELO para el gas? Con &quot;Autorizar sin gas&quot; solo firmás un mensaje y el agente paga el gas en USD₮.
            </p>
          )}
          {gasless.error && <p className="text-xs text-red-500">{gasless.error}</p>}
          {gasless.hash && (
            <a
              href={`${EXPLORER_URL}/tx/${gasless.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted underline underline-offset-2"
            >
              Permiso registrado por el agente ✓ · ver transacción ↗
            </a>
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
