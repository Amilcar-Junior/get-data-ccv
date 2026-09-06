import nodemailer from "nodemailer";
import { getMailConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import {
  extractSlotDays,
  formatSlotDayLine,
  summarizeSlotDays,
  type SlotDay,
} from "@/lib/slots/evaluate";

export type SlotAlertInput = {
  postoId: string;
  reason: "vagas" | "resposta_diferente" | "http_erro";
  httpStatus: number;
  durationMs: number;
  payload: unknown;
  rawBody: string;
  checkedAt: string;
  days?: SlotDay[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function prettyPayload(payload: unknown, rawBody: string): string {
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return rawBody;
  }
}

function daysFrom(input: SlotAlertInput): SlotDay[] {
  return input.days?.length ? input.days : extractSlotDays(input.payload);
}

function buildSubject(input: SlotAlertInput): string {
  if (input.reason === "http_erro") {
    return `[data-ccv] Erro HTTP ${input.httpStatus} — posto ${input.postoId}`;
  }

  if (input.reason === "vagas") {
    const summary = summarizeSlotDays(daysFrom(input));
    return summary
      ? `[data-ccv] Tem vagas — ${summary} — posto ${input.postoId}`
      : `[data-ccv] Tem vagas — posto ${input.postoId}`;
  }

  return `[data-ccv] Resposta diferente do vazio — posto ${input.postoId}`;
}

function buildHtml(input: SlotAlertInput): string {
  const days = daysFrom(input);
  const intro =
    input.reason === "vagas" && days.length > 0
      ? `Tem vagas: <strong>${days.length}</strong> dias no posto ${escapeHtml(input.postoId)}.`
      : input.reason === "http_erro"
        ? "A consulta ao MNE falhou (a resposta não está vazia, mas também não são vagas)."
        : "A resposta não está vazia, mas não veio no formato de datas com períodos.";

  const list =
    days.length > 0
      ? `<ol style="margin:0 0 16px;padding-left:20px;color:#f4efe4">${days
          .map((day) => `<li style="margin:0 0 4px">${escapeHtml(formatSlotDayLine(day))}</li>`)
          .join("")}</ol>`
      : "";

  const body = escapeHtml(prettyPayload(input.payload, input.rawBody));

  return `
    <div style="font-family:Georgia,serif;background:#0b1020;color:#f4efe4;padding:24px">
      <h1 style="font-size:20px;margin:0 0 8px;color:#e0b44c">data-ccv</h1>
      <p style="margin:0 0 16px;color:#c9c3b6">${intro}</p>
      <table style="border-collapse:collapse;margin:0 0 16px;color:#f4efe4">
        <tr><td style="padding:4px 12px 4px 0;color:#8b93a7">Posto</td><td>${escapeHtml(input.postoId)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#8b93a7">Motivo</td><td>${escapeHtml(input.reason)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#8b93a7">HTTP</td><td>${input.httpStatus}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#8b93a7">Duração</td><td>${input.durationMs} ms</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#8b93a7">Quando</td><td>${escapeHtml(input.checkedAt)}</td></tr>
      </table>
      ${list}
      <pre style="background:#141a2e;padding:16px;border-radius:8px;overflow:auto;color:#f4efe4;font-size:13px">${body}</pre>
    </div>
  `;
}

export async function sendSlotAlert(input: SlotAlertInput): Promise<void> {
  const mail = getMailConfig();
  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: {
      user: mail.user,
      pass: mail.appPassword,
    },
  });

  const days = daysFrom(input);
  const subject = buildSubject(input);
  const text = [
    `Posto: ${input.postoId}`,
    `Motivo: ${input.reason}`,
    `HTTP: ${input.httpStatus}`,
    `Quando: ${input.checkedAt}`,
    days.length ? `Vagas: ${summarizeSlotDays(days)}` : "",
    "",
    ...days.map((day) => formatSlotDayLine(day)),
    days.length ? "" : prettyPayload(input.payload, input.rawBody),
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  await transporter.sendMail({
    from: mail.from,
    to: mail.to,
    subject,
    text,
    html: buildHtml(input),
  });

  logger.info("e-mail enviado", {
    to: mail.to,
    subject,
    reason: input.reason,
    days: days.length,
  });
}

export async function sendTestEmail(): Promise<void> {
  const mail = getMailConfig();
  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: {
      user: mail.user,
      pass: mail.appPassword,
    },
  });

  await transporter.sendMail({
    from: mail.from,
    to: mail.to,
    subject: "[data-ccv] E-mail de teste",
    text: "A configuração SMTP está a funcionar. O monitor de vagas pode enviar alertas.",
    html: `<p>A configuração SMTP está a funcionar. O monitor de vagas pode enviar alertas.</p>`,
  });
}
