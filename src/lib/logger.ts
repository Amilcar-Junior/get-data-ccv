import { Console } from "node:console";

type LogFields = Record<string, unknown>;

const terminal = new Console({
  stdout: process.stderr,
  stderr: process.stderr,
});

function compactJson(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function prettyBody(body: unknown, rawBody: string): string {
  if (typeof body === "string") return body || rawBody;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return rawBody;
  }
}

function reasonLabel(reason: string): string {
  if (reason === "sem_vagas") return "sem vagas";
  if (reason === "resposta_diferente") return "resposta diferente — possível vaga";
  if (reason === "http_erro") return "erro HTTP";
  if (reason === "intervalo") return "intervalo — POST não enviado";
  return reason;
}

/**
 * O Next.js (Turbopack) só mostra a primeira linha de cada console.log.
 * process.stdout.write também é engolido no `next dev`. Cada linha vai à parte.
 */
function writeLine(line: string) {
  terminal.log(line.length > 0 ? line : " ");
}

function emit(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function dumpScheduler(message: string) {
  writeLine(`[slots] ${message}`);
}

export function dumpCheckStart(input: {
  postoId: string;
  force: boolean;
  respectInterval: boolean;
}) {
  writeLine(
    `[slots] verificação iniciada · posto=${input.postoId} · force=${String(input.force)} · interval=${String(input.respectInterval)}`,
  );
}

export function dumpPostStart(input: { postoId: string; url: string }) {
  writeLine(`[slots] a enviar POST /slots · posto=${input.postoId}`);
  writeLine(`[slots] url ${input.url}`);
}

export function dumpPostResponse(input: {
  postoId: string;
  status: number;
  durationMs: number;
  reason: string;
  body: unknown;
  rawBody: string;
  skipped?: boolean;
}) {
  const pretty = prettyBody(input.body, input.rawBody);
  const compact = compactJson(input.body, input.rawBody);
  const estado = input.skipped
    ? "última resposta guardada — intervalo ainda não passou"
    : "consulta feita agora";
  const found = reasonLabel(input.reason);

  writeLine("[slots] ========== POST /slots ==========");
  writeLine(`[slots] estado  ${estado}`);
  writeLine(`[slots] posto   ${input.postoId}`);
  writeLine(`[slots] http    ${input.status}`);
  writeLine(`[slots] tempo   ${input.durationMs} ms`);
  writeLine(`[slots] motivo  ${input.reason} (${found})`);
  writeLine(`[slots] corpo   ${compact}`);
  for (const line of pretty.split(/\r?\n/)) {
    writeLine(`[slots]   ${line}`);
  }
  writeLine("[slots] =================================");
}

export const logger = {
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
