"use client";

// Comparación "lo que vale hoy vs. si lo hubieras dejado en pesos".
// Necesita la cotización wARS/USD₮ (Textile FX) y el historial de conversiones.
export function SavingsCard() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Ahorro frente a quedarte en pesos</h2>
      <div className="mt-2 text-3xl font-semibold tabular-nums">—</div>
      <p className="mt-1 text-xs text-muted">
        Se calcula cuando el agente haga su primera conversión.
      </p>
    </section>
  );
}
