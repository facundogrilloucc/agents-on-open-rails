"use client";

import { useState } from "react";

type Budget = {
  dailyLimitArs: number;
  perPaymentLimitArs: number;
  onlyVerifiedProviders: boolean;
};

const DEFAULT_BUDGET: Budget = {
  dailyLimitArs: 3000,
  perPaymentLimitArs: 500,
  onlyVerifiedProviders: true,
};

const STORAGE_KEY = "budget";

// Por ahora se guarda solo en este navegador. Cuando exista el backend del agente,
// esto se envía ahí (y idealmente se firma con la wallet del usuario).
function loadBudget(): Budget {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BUDGET, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_BUDGET;
}

// Solo se monta del lado del cliente (después de conectar la wallet o en modo solo lectura),
// así que leer localStorage en el estado inicial no genera diferencias de hidratación.
export function BudgetSettings({ readOnly = false }: { readOnly?: boolean }) {
  const [budget, setBudget] = useState<Budget>(loadBudget);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Reglas del agente</h2>
      <form onSubmit={save} className="mt-3 grid gap-4">
        <fieldset disabled={readOnly} className="grid gap-4 disabled:opacity-60">
          <label className="grid gap-1 text-sm">
            Tope de gasto diario (ARS)
            <input
              type="number"
              min={0}
              value={budget.dailyLimitArs}
              onChange={(e) => setBudget({ ...budget, dailyLimitArs: Number(e.target.value) })}
              className="rounded-lg border border-border bg-background px-3 py-2 tabular-nums"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Tope por pago (ARS)
            <input
              type="number"
              min={0}
              value={budget.perPaymentLimitArs}
              onChange={(e) => setBudget({ ...budget, perPaymentLimitArs: Number(e.target.value) })}
              className="rounded-lg border border-border bg-background px-3 py-2 tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={budget.onlyVerifiedProviders}
              onChange={(e) => setBudget({ ...budget, onlyVerifiedProviders: e.target.checked })}
            />
            Pagar solo a proveedores con identidad ERC-8004
          </label>
        </fieldset>
        {readOnly ? (
          <p className="text-xs text-muted">
            En modo solo lectura las reglas no se pueden cambiar: conectá tu wallet para definirlas.
          </p>
        ) : (
          <button
            type="submit"
            className="justify-self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            {saved ? "Guardado ✓" : "Guardar reglas"}
          </button>
        )}
      </form>
    </section>
  );
}
