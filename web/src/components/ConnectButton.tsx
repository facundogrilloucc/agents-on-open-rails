"use client";

import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectButton() {
  const { address, chainId, isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();

  if (isConnected && address) {
    if (chainId !== celo.id) {
      return (
        <button
          onClick={() => switchChain.mutate({ chainId: celo.id })}
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-black"
        >
          Cambiar a Celo
        </button>
      );
    }
    return (
      <button
        onClick={() => disconnect.mutate()}
        title="Desconectar"
        className="rounded-full border border-border bg-card px-4 py-2 font-mono text-sm"
      >
        {shortAddress(address)}
      </button>
    );
  }

  const injectedConnector = connectors[0];
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => injectedConnector && connect.mutate({ connector: injectedConnector, chainId: celo.id })}
        disabled={!injectedConnector || connect.isPending}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {connect.isPending ? "Conectando…" : "Conectar wallet"}
      </button>
      {connect.error && (
        <span className="text-xs text-red-500">
          No se pudo conectar. ¿Tenés MiniPay o MetaMask instalado?
        </span>
      )}
    </div>
  );
}
