export type RuntimeConfig = {
  checkIntervalMinutes: number;
  notifyCooldownMinutes: number;
  postoId: string;
  slotsBaseUrl: string;
  userAgent: string;
  cronSecret: string | undefined;
  apiKey: string | undefined;
};

export type UpstreamCredentials = {
  cookie: string;
  captcha: string;
};

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  appPassword: string;
  from: string;
  to: string;
};

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0";

const DEFAULT_SLOTS_URL =
  "https://pedidodevistos.mne.gov.pt/VistosOnline/slots";

function readString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readNumber(name: string, fallback: number): number {
  const raw = readString(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} deve ser um número >= 0`);
  }
  return parsed;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    checkIntervalMinutes: readNumber("CHECK_INTERVAL_MINUTES", 5),
    notifyCooldownMinutes: readNumber("NOTIFY_COOLDOWN_MINUTES", 30),
    postoId: readString("POSTO_ID") ?? "5084",
    slotsBaseUrl: readString("SLOTS_BASE_URL") ?? DEFAULT_SLOTS_URL,
    userAgent: readString("VISTOS_USER_AGENT") ?? DEFAULT_USER_AGENT,
    cronSecret: readString("CRON_SECRET"),
    apiKey: readString("API_KEY"),
  };
}

export function getUpstreamCredentials(
  overrides?: Partial<UpstreamCredentials>,
): UpstreamCredentials {
  const cookie = overrides?.cookie ?? readString("VISTOS_COOKIE");
  const captcha = overrides?.captcha ?? readString("VISTOS_CAPTCHA");

  if (!cookie) {
    throw new Error("Cookie em falta: envie no body ou defina VISTOS_COOKIE");
  }
  if (!captcha) {
    throw new Error("Captcha em falta: envie no body ou defina VISTOS_CAPTCHA");
  }

  return { cookie, captcha };
}

export function getMailConfig(): MailConfig {
  const user = readString("SMTP_USER");
  const appPassword = readString("SMTP_APP_PASSWORD");
  const to = readString("EMAIL_TO");

  if (!user || !appPassword || !to) {
    throw new Error(
      "E-mail mal configurado: defina SMTP_USER, SMTP_APP_PASSWORD e EMAIL_TO",
    );
  }

  return {
    host: readString("SMTP_HOST") ?? "smtp.gmail.com",
    port: readNumber("SMTP_PORT", 465),
    user,
    appPassword: appPassword.replaceAll(" ", ""),
    from: readString("EMAIL_FROM") ?? user,
    to,
  };
}

export function getPublicConfigStatus() {
  const runtime = getRuntimeConfig();

  return {
    postoId: runtime.postoId,
    checkIntervalMinutes: runtime.checkIntervalMinutes,
    notifyCooldownMinutes: runtime.notifyCooldownMinutes,
    slotsBaseUrl: runtime.slotsBaseUrl,
    hasCookie: Boolean(readString("VISTOS_COOKIE")),
    hasCaptcha: Boolean(readString("VISTOS_CAPTCHA")),
    hasSmtp: Boolean(readString("SMTP_USER") && readString("SMTP_APP_PASSWORD")),
    hasEmailTo: Boolean(readString("EMAIL_TO")),
    hasApiKey: Boolean(runtime.apiKey),
    hasCronSecret: Boolean(runtime.cronSecret),
  };
}

export { DEFAULT_USER_AGENT, DEFAULT_SLOTS_URL };
