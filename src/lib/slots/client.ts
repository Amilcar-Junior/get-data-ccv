import {
  DEFAULT_SLOTS_URL,
  DEFAULT_USER_AGENT,
  type UpstreamCredentials,
} from "@/lib/config";
import { dumpPostStart } from "@/lib/logger";

export type SlotsRequestInput = {
  postoId: string;
  captcha: string;
  cookie: string;
  slotsBaseUrl: string;
  userAgent: string;
};

export type SlotsFetchResult = {
  ok: boolean;
  status: number;
  url: string;
  durationMs: number;
  rawBody: string;
  payload: unknown;
};

export function buildSlotsUrl(baseUrl: string, postoId: string): string {
  const url = new URL(baseUrl || DEFAULT_SLOTS_URL);
  url.searchParams.set("posto_id", postoId);
  return url.toString();
}

export function buildSlotsHeaders(input: {
  postoId: string;
  cookie: string;
  userAgent?: string;
}): HeadersInit {
  const userAgent = input.userAgent || DEFAULT_USER_AGENT;

  return {
    Accept: "*/*",
    "Accept-Language":
      "pt-PT,pt;q=0.9,pt-BR;q=0.8,en;q=0.7,en-US;q=0.6,en-GB;q=0.5,pt-CV;q=0.4",
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://pedidodevistos.mne.gov.pt",
    Referer: `https://pedidodevistos.mne.gov.pt/VistosOnline/Schedule.jsp?posto_id=${encodeURIComponent(input.postoId)}`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": userAgent,
    "sec-ch-ua":
      '"Chromium";v="152", "Not?A_Brand";v="24", "Microsoft Edge";v="152"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Cookie: input.cookie,
  };
}

export function buildSlotsBody(postoId: string, captcha: string): string {
  return new URLSearchParams({
    posto_id: postoId,
    captcha,
  }).toString();
}

function parseBody(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export async function fetchSlots(
  input: SlotsRequestInput,
): Promise<SlotsFetchResult> {
  const url = buildSlotsUrl(input.slotsBaseUrl, input.postoId);
  const started = Date.now();

  dumpPostStart({ postoId: input.postoId, url });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: buildSlotsHeaders({
        postoId: input.postoId,
        cookie: input.cookie,
        userAgent: input.userAgent,
      }),
      body: buildSlotsBody(input.postoId, input.captcha),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });

    const rawBody = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      url,
      durationMs: Date.now() - started,
      rawBody,
      payload: parseBody(rawBody),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause ? String(error.cause) : undefined;
    const rawBody = cause ? `${message} (${cause})` : message;

    return {
      ok: false,
      status: 0,
      url,
      durationMs: Date.now() - started,
      rawBody,
      payload: { error: message, cause },
    };
  }
}

export function toSlotsRequestInput(
  postoId: string,
  credentials: UpstreamCredentials,
  slotsBaseUrl: string,
  userAgent: string,
): SlotsRequestInput {
  return {
    postoId,
    captcha: credentials.captcha,
    cookie: credentials.cookie,
    slotsBaseUrl,
    userAgent,
  };
}
