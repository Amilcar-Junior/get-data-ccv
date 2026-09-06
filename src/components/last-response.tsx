"use client";

import { useEffect, useState } from "react";
import type { LastCheck } from "@/lib/slots/types";
import {
  extractSlotDays,
  formatSlotDayLine,
  summarizeSlotDays,
} from "@/lib/slots/evaluate";

type HealthPayload = {
  lastCheck: LastCheck | null;
  history: LastCheck[];
};

function pretty(value: unknown, raw?: string) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return raw ?? "";
  }
}

function reasonLabel(reason: string) {
  if (reason === "sem_vagas") return "sem vagas";
  if (reason === "vagas") return "tem vagas";
  if (reason === "resposta_diferente") return "resposta diferente do vazio";
  if (reason === "http_erro") return "erro HTTP";
  return reason;
}

function SlotDays({ body }: { body: unknown }) {
  const days = extractSlotDays(body);
  if (days.length === 0) return null;
  const summary = summarizeSlotDays(days);

  return (
    <div className="mt-4">
      <p className="text-sm text-[var(--gold)]">{summary}</p>
      <ol className="mt-3 max-h-[420px] space-y-1 overflow-auto text-sm text-[var(--ink)]">
        {days.map((day) => (
          <li key={day.date}>{formatSlotDayLine(day)}</li>
        ))}
      </ol>
    </div>
  );
}

export function LastResponse({
  initial,
}: {
  initial: HealthPayload;
}) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    const tick = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) return;
        const json = (await response.json()) as HealthPayload;
        setData({
          lastCheck: json.lastCheck ?? null,
          history: json.history ?? [],
        });
      } catch {
        // o painel é só observação
      }
    };

    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const current = data.lastCheck;

  return (
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Última resposta do POST
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Corpo devolvido pelo MNE em cada execução. Actualiza a cada 10s.
            Nos logs da Vercel aparece o mesmo bloco{" "}
            <code className="text-[var(--ink)]">POST /slots</code>.
          </p>
        </div>
        {current ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              current.reason === "sem_vagas"
                ? "bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] text-[var(--muted)]"
                : "bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)]"
            }`}
          >
            HTTP {current.status} · {reasonLabel(current.reason)}
          </span>
        ) : null}
      </div>

      {!current ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Ainda não há nenhuma consulta. Em local o POST corre ao arrancar o{" "}
          <code className="text-[var(--ink)]">next dev</code>. Na Vercel, a
          GitHub Action dispara sozinha a cada 5 minutos.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
            <div>
              <dt>Quando</dt>
              <dd className="text-[var(--ink)]">
                {new Date(current.checkedAt).toLocaleString("pt-PT")}
              </dd>
            </div>
            <div>
              <dt>Posto</dt>
              <dd className="text-[var(--ink)]">{current.postoId}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd className="text-[var(--ink)]">{current.durationMs} ms</dd>
            </div>
          </dl>
          <SlotDays body={current.body} />
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-[#0b1020] p-4 font-mono text-xs leading-relaxed text-[var(--gold)]">
            {pretty(current.body, current.rawBody)}
          </pre>
        </>
      )}

      {data.history.length > 1 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-[var(--muted)]">
            Histórico ({data.history.length})
          </summary>
          <ol className="mt-3 space-y-3">
            {data.history.map((item) => (
              <li
                key={`${item.checkedAt}-${item.status}`}
                className="rounded-xl border border-[var(--line)] p-3"
              >
                <p className="text-xs text-[var(--muted)]">
                  {new Date(item.checkedAt).toLocaleString("pt-PT")} · HTTP{" "}
                  {item.status} · {reasonLabel(item.reason)} · {item.durationMs}{" "}
                  ms
                </p>
                <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-[var(--ink)]">
                  {pretty(item.body, item.rawBody)}
                </pre>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
