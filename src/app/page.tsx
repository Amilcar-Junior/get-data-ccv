import Link from "next/link";
import { LastResponse } from "@/components/last-response";
import { getPublicConfigStatus } from "@/lib/config";
import { readCheckerState } from "@/lib/cron/state";

export const dynamic = "force-dynamic";

function Flag({
  ok,
  label,
  optional = false,
}: {
  ok: boolean;
  label: string;
  optional?: boolean;
}) {
  const text = ok ? "definido" : optional ? "não usado" : "em falta";
  const tone = ok ? "ok" : optional ? "muted" : "bad";
  return (
    <li className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3 last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
          tone === "ok"
            ? "bg-[color-mix(in_srgb,var(--ok)_18%,transparent)] text-[var(--ok)]"
            : tone === "muted"
              ? "bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] text-[var(--muted)]"
              : "bg-[color-mix(in_srgb,var(--bad)_18%,transparent)] text-[var(--bad)]"
        }`}
      >
        {text}
      </span>
    </li>
  );
}

export default async function HomePage() {
  const config = getPublicConfigStatus();
  const state = await readCheckerState();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-8">
        <div>
          <p className="mb-2 text-xs tracking-[0.28em] text-[var(--gold)] uppercase">
            Vistos Online · MNE
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--ink)] sm:text-6xl">
            data-ccv
          </h1>
          <p className="mt-3 max-w-xl text-[var(--muted)]">
            O POST ao posto {config.postoId} corre sozinho a cada{" "}
            {config.checkIntervalMinutes}{" "}
            {config.checkIntervalMinutes === 1 ? "minuto" : "minutos"}. No
            GitHub, a Action chama o site na Vercel; em local, o{" "}
            <code>next dev</code> dispara a primeira consulta ao arrancar.
            E-mail só se a resposta não for vazia. No formato de datas, o
            e-mail diz que tem vagas; qualquer outro corpo também avisa.
          </p>
        </div>
        <Link
          href="/docs"
          className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[#1a1406] transition hover:brightness-110"
        >
          Abrir Swagger
        </Link>
      </header>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Ambiente
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Estado das variáveis — os valores secretos nunca são mostrados.
          </p>
          <ul className="mt-4">
            <Flag ok={config.hasCookie} label="VISTOS_COOKIE" />
            <Flag ok={config.hasCaptcha} label="VISTOS_CAPTCHA" />
            <Flag ok={config.hasSmtp} label="SMTP_USER + SMTP_APP_PASSWORD" />
            <Flag ok={config.hasEmailTo} label="EMAIL_TO" />
            <Flag ok={config.hasApiKey} label="API_KEY" optional />
            <Flag ok={config.hasCronSecret} label="CRON_SECRET" optional />
          </ul>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Como corre
          </h2>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
            <li>
              <span className="text-[var(--gold)]">01 ·</span> GitHub Action
              chama{" "}
              <code className="text-[var(--ink)]">/api/cron/check-slots</code>{" "}
              a cada 5 minutos. Não precisa de Swagger nem de cron no dashboard.
            </li>
            <li>
              <span className="text-[var(--gold)]">02 ·</span> O script só
              pergunta ao MNE se já passaram{" "}
              <strong className="text-[var(--ink)]">CHECK_INTERVAL_MINUTES={config.checkIntervalMinutes}</strong>
              .
            </li>
            <li>
              <span className="text-[var(--gold)]">03 ·</span> Vazio ({" "}
              <code className="text-[var(--ink)]">{`{ "data": {} }`}</code>
              ) → sem e-mail. Lista{" "}
              <code className="text-[var(--ink)]">date</code> +{" "}
              <code className="text-[var(--ink)]">periods</code> → e-mail
              «tem vagas». Outro JSON → e-mail «resposta diferente do vazio».
            </li>
          </ol>
        </article>
      </section>

      <LastResponse
        initial={{ lastCheck: state.lastResult, history: state.history }}
      />

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          Endpoints
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="pb-3 font-medium">Método</th>
                <th className="pb-3 font-medium">Caminho</th>
                <th className="pb-3 font-medium">Uso</th>
              </tr>
            </thead>
            <tbody className="text-[var(--ink)]">
              <tr className="border-t border-[var(--line)]">
                <td className="py-3 text-[var(--gold)]">GET</td>
                <td className="py-3 font-mono text-xs">/api/health</td>
                <td className="py-3 text-[var(--muted)]">Público</td>
              </tr>
              <tr className="border-t border-[var(--line)]">
                <td className="py-3 text-[var(--gold)]">GET/POST</td>
                <td className="py-3 font-mono text-xs">/api/v1/slots/check</td>
                <td className="py-3 text-[var(--muted)]">
                  API para outros projetos · x-api-key
                </td>
              </tr>
              <tr className="border-t border-[var(--line)]">
                <td className="py-3 text-[var(--gold)]">GET</td>
                <td className="py-3 font-mono text-xs">
                  /api/cron/check-slots
                </td>
                <td className="py-3 text-[var(--muted)]">
                  Automático · GitHub Action + cron diário Vercel
                </td>
              </tr>
              <tr className="border-t border-[var(--line)]">
                <td className="py-3 text-[var(--gold)]">POST</td>
                <td className="py-3 font-mono text-xs">/api/v1/email/test</td>
                <td className="py-3 text-[var(--muted)]">Teste SMTP</td>
              </tr>
              <tr className="border-t border-[var(--line)]">
                <td className="py-3 text-[var(--gold)]">GET</td>
                <td className="py-3 font-mono text-xs">/api/openapi</td>
                <td className="py-3 text-[var(--muted)]">OpenAPI 3.1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-auto pt-10 text-sm text-[var(--muted)]">
        Cookie e captcha expiram. Atualize{" "}
        <code className="text-[var(--ink)]">VISTOS_COOKIE</code> e{" "}
        <code className="text-[var(--ink)]">VISTOS_CAPTCHA</code> no dashboard
        da Vercel quando a sessão cair.
      </footer>
    </main>
  );
}
