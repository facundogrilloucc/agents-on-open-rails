"use client";

// Lista de movimientos del agente (conversiones en Textile y pagos x402/buy).
// Vacía hasta que exista el backend del agente.
export function AgentActivity() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Actividad del agente</h2>
      <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
        Todavía no hay movimientos. Acá van a aparecer las conversiones de wARS a USD₮ y los
        pagos a servicios, con link a cada transacción.
      </div>
    </section>
  );
}
