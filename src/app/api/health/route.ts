import { getPublicConfigStatus } from "@/lib/config";
import { readCheckerState } from "@/lib/cron/state";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await readCheckerState();

  return json({
    ok: true,
    service: "data-ccv",
    time: new Date().toISOString(),
    config: getPublicConfigStatus(),
    lastCheck: state.lastResult,
    history: state.history,
  });
}
