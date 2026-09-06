import { getRuntimeConfig } from "@/lib/config";
import { dumpScheduler, logger } from "@/lib/logger";

let started = false;

function intervalMs(): number {
  const minutes = getRuntimeConfig().checkIntervalMinutes;
  return Math.max(1, minutes) * 60_000;
}

async function tick() {
  try {
    const { runSlotCheck } = await import("@/lib/checker");
    await runSlotCheck({
      respectInterval: true,
      force: false,
      notify: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dumpScheduler(`scheduler falhou: ${message}`);
    logger.error("scheduler falhou", { error: message });
  }
}

export function startLocalScheduler() {
  if (started) return;
  started = true;

  const ms = intervalMs();
  dumpScheduler(
    `scheduler local ligado — primeira consulta já; depois a cada ${ms / 60_000} min`,
  );

  void tick();
  setInterval(() => {
    void tick();
  }, ms);
}
