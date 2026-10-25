"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAddress, isAddress } from "viem";

// Abre el panel en modo solo lectura para una dirección pública (no firma nada).
export function WatchAddressForm({ initialError = false }: { initialError?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(initialError);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim();
    if (!isAddress(input, { strict: false })) {
      setError(true);
      return;
    }
    router.push(`/?address=${getAddress(input)}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor="watch-address" className="text-sm font-medium">
        ¿Sin wallet en este navegador? Mirá el panel de cualquier wallet
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="watch-address"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Dirección pública (0x…)"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2 font-mono text-sm"
        />
        <button
          type="submit"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          Ver en solo lectura
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-500">Esa no es una dirección válida de Celo (0x seguido de 40 caracteres).</p>
      ) : (
        <p className="text-xs text-muted">
          Solo se ve: no se puede firmar ni mover fondos. Nunca pegues tu clave privada ni tu frase semilla.
        </p>
      )}
    </form>
  );
}
