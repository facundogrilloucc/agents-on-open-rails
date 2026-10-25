import { Suspense } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Treasury } from "@/components/Treasury";
import { APP_NAME } from "@/config/app";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <span className="text-lg font-semibold">{APP_NAME}</span>
        <ConnectButton />
      </header>
      {/* Treasury lee la URL (?address=): Next pide un Suspense para no bloquear el prerender. */}
      <Suspense fallback={<main className="flex-1" />}>
        <Treasury />
      </Suspense>
    </div>
  );
}
