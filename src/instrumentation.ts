export async function register() {
  // Edge não tem setInterval útil. Na Vercel o POST automático é cron + GitHub Action.
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.VERCEL) return;

  const { startLocalScheduler } = await import("@/lib/cron/scheduler");
  startLocalScheduler();
}
