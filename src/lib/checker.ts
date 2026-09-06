import { z } from "zod";
import {
  getRuntimeConfig,
  getUpstreamCredentials,
} from "@/lib/config";
import {
  fingerprintBody,
  pushHistory,
  readCheckerState,
  shouldSkipByInterval,
  shouldSkipNotify,
  truncateRaw,
  writeCheckerState,
} from "@/lib/cron/state";
import type { LastCheck } from "@/lib/slots/types";
import { dumpCheckStart, dumpPostResponse, logger } from "@/lib/logger";
import { sendSlotAlert } from "@/lib/notify/email";
import { fetchSlots, toSlotsRequestInput } from "@/lib/slots/client";
import { evaluateUpstreamResponse } from "@/lib/slots/evaluate";

export const slotCheckBodySchema = z.object({
  posto_id: z.string().min(1).optional(),
  captcha: z.string().min(1).optional(),
  cookie: z.string().min(1).optional(),
  notify: z.boolean().optional(),
  force: z.boolean().optional(),
});

export type SlotCheckInput = z.infer<typeof slotCheckBodySchema> & {
  respectInterval?: boolean;
};

export type SlotCheckResult = {
  ok: boolean;
  skipped: boolean;
  notified: boolean;
  notifySkippedReason: string | null;
  reason: string;
  checkedAt: string;
  interval: {
    minutes: number;
    skipped: boolean;
    nextEligibleAt: string | null;
    lastCheckAt: string | null;
  };
  lastCheck: LastCheck | null;
  emailError: string | null;
  upstream: {
    status: number | null;
    url: string | null;
    postoId: string;
    durationMs: number | null;
    body: unknown;
    rawBody: string | null;
  };
};

export async function runSlotCheck(
  input: SlotCheckInput = {},
): Promise<SlotCheckResult> {
  const runtime = getRuntimeConfig();
  const postoId = input.posto_id ?? runtime.postoId;
  const checkedAt = new Date();
  const respectInterval = input.respectInterval === true;
  const force = input.force === true;
  const notifyEnabled = input.notify !== false;

  dumpCheckStart({ postoId, force, respectInterval });

  const state = await readCheckerState();
  const interval = shouldSkipByInterval(
    state.lastCheckAt,
    runtime.checkIntervalMinutes,
    force || !respectInterval,
  );

  if (interval.skip) {
    logger.info("verificação ignorada por intervalo", {
      postoId,
      nextEligibleAt: interval.nextEligibleAt,
    });

    if (state.lastResult) {
      dumpPostResponse({
        postoId: state.lastResult.postoId,
        status: state.lastResult.status,
        durationMs: state.lastResult.durationMs,
        reason: state.lastResult.reason,
        body: state.lastResult.body,
        rawBody: state.lastResult.rawBody,
        skipped: true,
      });
    } else {
      dumpPostResponse({
        postoId,
        status: 0,
        durationMs: 0,
        reason: "intervalo",
        body: "ainda não há resposta anterior para mostrar",
        rawBody: "ainda não há resposta anterior para mostrar",
        skipped: true,
      });
    }

    return {
      ok: true,
      skipped: true,
      notified: false,
      notifySkippedReason: "intervalo",
      reason: "intervalo",
      checkedAt: checkedAt.toISOString(),
      lastCheck: state.lastResult,
      emailError: null,
      interval: {
        minutes: runtime.checkIntervalMinutes,
        skipped: true,
        nextEligibleAt: interval.nextEligibleAt
          ? new Date(interval.nextEligibleAt).toISOString()
          : null,
        lastCheckAt: state.lastCheckAt
          ? new Date(state.lastCheckAt).toISOString()
          : null,
      },
      upstream: {
        status: state.lastResult?.status ?? null,
        url: state.lastResult?.url ?? null,
        postoId,
        durationMs: state.lastResult?.durationMs ?? null,
        body: state.lastResult?.body ?? null,
        rawBody: state.lastResult?.rawBody ?? null,
      },
    };
  }

  const credentials = getUpstreamCredentials({
    captcha: input.captcha,
    cookie: input.cookie,
  });

  const upstream = await fetchSlots(
    toSlotsRequestInput(
      postoId,
      credentials,
      runtime.slotsBaseUrl,
      runtime.userAgent,
    ),
  );

  const evaluation = evaluateUpstreamResponse(upstream.status, upstream.payload);
  const fingerprint = fingerprintBody(upstream.rawBody);

  dumpPostResponse({
    postoId,
    status: upstream.status,
    durationMs: upstream.durationMs,
    reason: evaluation.reason,
    body: upstream.payload,
    rawBody: upstream.rawBody,
  });

  let notified = false;
  let notifySkippedReason: string | null = null;
  let emailError: string | null = null;

  if (!evaluation.shouldNotify) {
    notifySkippedReason = "sem_vagas";
  } else if (!notifyEnabled) {
    notifySkippedReason = "notify_desligado";
  } else if (
    shouldSkipNotify(state, fingerprint, runtime.notifyCooldownMinutes)
  ) {
    notifySkippedReason = "cooldown";
  } else {
    try {
      await sendSlotAlert({
        postoId,
        reason:
          evaluation.reason === "http_erro"
            ? "http_erro"
            : evaluation.reason === "vagas"
              ? "vagas"
              : "resposta_diferente",
        httpStatus: upstream.status,
        durationMs: upstream.durationMs,
        payload: upstream.payload,
        rawBody: upstream.rawBody,
        checkedAt: checkedAt.toISOString(),
        days: evaluation.days,
      });
      notified = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : String(error);
      notifySkippedReason = "email_falhou";
      logger.error("falha ao enviar e-mail", { error: emailError });
    }
  }

  const lastCheck: LastCheck = {
    checkedAt: checkedAt.toISOString(),
    status: upstream.status,
    url: upstream.url,
    postoId,
    durationMs: upstream.durationMs,
    reason: evaluation.reason,
    notified,
    body: upstream.payload,
    rawBody: truncateRaw(upstream.rawBody),
  };

  await writeCheckerState(
    pushHistory(
      {
        ...state,
        lastCheckAt: Date.now(),
        lastNotifyAt: notified ? Date.now() : state.lastNotifyAt,
        lastFingerprint: notified ? fingerprint : state.lastFingerprint,
      },
      lastCheck,
    ),
  );

  logger.info("verificação concluída", {
    postoId,
    status: upstream.status,
    reason: evaluation.reason,
    notified,
    durationMs: upstream.durationMs,
  });

  return {
    ok: true,
    skipped: false,
    notified,
    notifySkippedReason,
    reason: evaluation.reason,
    checkedAt: checkedAt.toISOString(),
    lastCheck,
    emailError,
    interval: {
      minutes: runtime.checkIntervalMinutes,
      skipped: false,
      nextEligibleAt: new Date(
        Date.now() + runtime.checkIntervalMinutes * 60_000,
      ).toISOString(),
      lastCheckAt: checkedAt.toISOString(),
    },
    upstream: {
      status: upstream.status,
      url: upstream.url,
      postoId,
      durationMs: upstream.durationMs,
      body: upstream.payload,
      rawBody: lastCheck.rawBody,
    },
  };
}
