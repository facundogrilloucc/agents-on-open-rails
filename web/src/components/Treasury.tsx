"use client";

import { useSearchParams } from "next/navigation";
import { getAddress, isAddress, type Address } from "viem";
import { useConnection } from "wagmi";
import { celo } from "wagmi/chains";
import { AgentActivity } from "@/components/AgentActivity";
import { AgentPermissions } from "@/components/AgentPermissions";
import { AgentPolicy } from "@/components/AgentPolicy";
import { Balances } from "@/components/Balances";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { SavingsCard } from "@/components/SavingsCard";
import { TextileQuote } from "@/components/TextileQuote";
import { WatchAddressForm } from "@/components/WatchAddressForm";
import Link from "next/link";
import { AGENT_ADDRESS, APP_TAGLINE, ripioOnrampUrl } from "@/config/app";

const STEPS = [
  { title: "Cargás pesos", text: "Con la rampa de Ripio, directo a tu wallet en Celo como wARS." },
  { title: "El agente los protege", text: "Los detecta y los convierte a USD₮ en Textile FX, solo si el precio es bueno." },
  { title: "Vos ponés las reglas", text: "Le das un permiso con tope. El agente respeta el precio máximo y los topes diarios, y lo revocás cuando quieras." },
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
      <main className="flex flex-1 flex-col py-12 sm:py-20">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
              Tus mangos, a salvo en dólares.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{APP_TAGLINE}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={`/?address=${AGENT_ADDRESS}`}
                className="rounded-full border-2 border-foreground px-5 py-2.5 font-medium"
              >
                Ver un panel de ejemplo
              </Link>
              <span className="text-sm text-muted">
                O conectá tu wallet de Celo (MetaMask u otra del navegador) arriba a la derecha.
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático */}
          <img
            src="/logo.svg"
            alt=""
            width={280}
            height={280}
            className="mango-in hidden size-72 md:block"
          />
        </div>

        <ol className="mt-16 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <div className="font-display text-4xl font-bold text-leaf tabular-nums" aria-hidden="true">
                {i + 1}
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-1 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 max-w-xl rounded-3xl bg-pulp p-6">
          <WatchAddressForm initialError={invalid} />
        </div>
      </main>
    );
  }

  return (
    <main className="grid gap-5 py-8">
      {readOnly && <ReadOnlyBanner address={viewAddress} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">{readOnly ? "Tesorería" : "Tu tesorería"}</h1>
        {!readOnly && (
          <a
            href={ripioOnrampUrl(viewAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
          >
            Cargar pesos con Ripio ↗
          </a>
        )}
      </div>
      <Balances address={viewAddress} />
      <AgentPermissions owner={viewAddress} readOnly={readOnly} />
      <TextileQuote />
      <div className="grid gap-4 md:grid-cols-2">
        <SavingsCard />
        <AgentPolicy />
      </div>
      <AgentActivity />
    </main>
  );
}
