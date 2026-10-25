"use client";

import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import { EXPLORER_URL } from "@/config/app";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ReadOnlyBanner({ address }: { address: Address }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div>
        <span className="font-medium">Modo solo lectura</span>
        <span className="text-muted"> · viendo </span>
        <a
          href={`${EXPLORER_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline underline-offset-2"
        >
          {shortAddress(address)}
        </a>
        <span className="text-muted"> · no se puede firmar ni mover fondos</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
        >
          {copied ? "Link copiado ✓" : "Copiar link"}
        </button>
        <Link href="/" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
          Salir
        </Link>
      </div>
    </div>
  );
}
