import { Suspense } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Treasury } from "@/components/Treasury";
import { APP_NAME } from "@/config/app";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG chico y estático, no necesita next/image */}
          <img src="/logo.svg" alt="" width={32} height={32} className="size-8" />
          {APP_NAME}
        </span>
        <ConnectButton />
      </header>
      {/* Treasury lee la URL (?address=): Next pide un Suspense para no bloquear el prerender. */}
      <Suspense fallback={<main className="flex-1" />}>
        <Treasury />
      </Suspense>
    </div>
  );
}
