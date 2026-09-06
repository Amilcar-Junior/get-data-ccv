import { assertCronAuthorized } from "@/lib/auth";
import { runSlotCheck } from "@/lib/checker";
import { errorResponse, json, readBooleanParam } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const authorized = assertCronAuthorized(request);
    const url = new URL(request.url);
    const wantsForce = readBooleanParam(url.searchParams.get("force"), false);

    const result = await runSlotCheck({
      respectInterval: true,
      force: wantsForce && authorized,
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
