import policy from "@/config/agent-policy.json";

// Reglas que el agente aplica antes de cada operación. Es el mismo archivo que leen los scripts
// (scripts/lib/policy.mjs), así que lo que se ve acá es lo que el agente respeta. Ver STRATEGY.md.
const REPO_STRATEGY = "https://github.com/facundogrilloucc/agents-on-open-rails/blob/main/STRATEGY.md";
const ars = (n: number) => n.toLocaleString("es-AR");

export function AgentPolicy() {
  const p = policy.protect;
  const rules = [
    { label: "Convierte a partir de", value: `${ars(p.minConvertWars)} wARS` },
    { label: "Máximo por operación", value: `${ars(p.maxConvertPerRunWars)} wARS` },
    { label: "Tope diario", value: `${ars(p.maxDailyWars)} wARS` },
    { label: "Peor precio aceptado", value: `${ars(p.maxSlippageBps / 100)} % sobre la referencia de Textile` },
    { label: "Revisa cada", value: `${policy.watch.intervalSeconds} s` },
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Reglas del agente</h2>
      <dl className="mt-3 grid gap-2 text-sm">
        {rules.map((r) => (
          <div key={r.label} className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-muted">{r.label}</dt>
            <dd className="font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        El agente rechaza la cotización si Textile cobra peor que el tope, y nunca toma más de lo que aprobaste en
        Permisos. Pagos de APIs con x402: próximamente (tope previsto {ars(policy.spend.perPaymentLimitUsdt)} USD₮ por pago).{" "}
        <a href={REPO_STRATEGY} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Cómo decide ↗
        </a>
      </p>
    </section>
  );
}
