"use client";

import { useSearchParams } from "next/navigation";
import { getAddress, isAddress, type Address } from "viem";
import { useConnection } from "wagmi";
import { celo } from "wagmi/chains";
import { AgentActivity } from "@/components/AgentActivity";
import { Balances } from "@/components/Balances";
import { BudgetSettings } from "@/components/BudgetSettings";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { SavingsCard } from "@/components/SavingsCard";
import { TextileQuote } from "@/components/TextileQuote";
import { WatchAddressForm } from "@/components/WatchAddressForm";
import { APP_TAGLINE, ripioOnrampUrl } from "@/config/app";

const STEPS = [
  { title: "Cargás pesos", text: "Con la rampa de Ripio, directo a tu wallet en Celo como wARS." },
  { title: "El agente los protege", text: "Los convierte a USD₮ en Textile FX apenas entran." },
  { title: "Paga por uso", text: "APIs e IA vía x402, dentro del presupuesto que vos definís." },
];

// Una dirección en la URL (/?address=0x…) abre el panel en modo solo lectura;
// si no hay, se usa la wallet conectada.
function useWatchedAddress(): { watched: Address | null; invalid: boolean } {
  const param = useSearchParams().get("address");
  if (!param) return { watched: null, invalid: false };
  if (!isAddress(param, { strict: false })) return { watched: null, invalid: true };
  return { watched: getAddress(param), invalid: false };
}

export function Treasury() {
  const { address, isConnected, chainId } = useConnection();
  const { watched, invalid } = useWatchedAddress();
  const connected = isConnected && address && chainId === celo.id ? address : null;
  const viewAddress = watched ?? connected;
  const readOnly = watched !== null;

  if (!viewAddress) {
    return (
      <main className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Tus pesos, protegidos y trabajando.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{APP_TAGLINE}</p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm text-muted">Paso {i + 1}</div>
              <div className="mt-1 font-medium">{step.title}</div>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-muted">
          Conectá tu wallet (MiniPay o MetaMask) en Celo para empezar.
        </p>
        <div className="mt-6 max-w-xl">
          <WatchAddressForm initialError={invalid} />
        </div>
      </main>
    );
  }

  return (
    <main className="grid gap-4 py-8">
      {readOnly && <ReadOnlyBanner address={viewAddress} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{readOnly ? "Tesorería" : "Tu tesorería"}</h1>
        {!readOnly && (
          <a
            href={ripioOnrampUrl(viewAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
          >
            Cargar pesos con Ripio ↗
          </a>
        )}
      </div>
      <Balances address={viewAddress} />
      <TextileQuote />
      <div className="grid gap-4 md:grid-cols-2">
        <SavingsCard />
        <BudgetSettings readOnly={readOnly} />
      </div>
      <AgentActivity />
    </main>
  );
}
