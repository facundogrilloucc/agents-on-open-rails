"use client";

import { useConnection } from "wagmi";
import { celo } from "wagmi/chains";
import { AgentActivity } from "@/components/AgentActivity";
import { Balances } from "@/components/Balances";
import { BudgetSettings } from "@/components/BudgetSettings";
import { ConnectButton } from "@/components/ConnectButton";
import { SavingsCard } from "@/components/SavingsCard";
import { APP_NAME, APP_TAGLINE, ripioOnrampUrl } from "@/config/app";

const STEPS = [
  { title: "Cargás pesos", text: "Con la rampa de Ripio, directo a tu wallet en Celo como wARS." },
  { title: "El agente los protege", text: "Los convierte a USD₮ en Textile FX apenas entran." },
  { title: "Paga por uso", text: "APIs e IA vía x402, dentro del presupuesto que vos definís." },
];

export default function Home() {
  const { address, isConnected, chainId } = useConnection();
  const ready = isConnected && address && chainId === celo.id;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <span className="text-lg font-semibold">{APP_NAME}</span>
        <ConnectButton />
      </header>

      {!ready ? (
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
        </main>
      ) : (
        <main className="grid gap-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Tu tesorería</h1>
            <a
              href={ripioOnrampUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              Cargar pesos con Ripio ↗
            </a>
          </div>
          <Balances address={address} />
          <div className="grid gap-4 md:grid-cols-2">
            <SavingsCard />
            <BudgetSettings />
          </div>
          <AgentActivity />
        </main>
      )}
    </div>
  );
}
