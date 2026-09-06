import { assertApiAuthorized } from "@/lib/auth";
import { runSlotCheck, slotCheckBodySchema } from "@/lib/checker";
import { errorResponse, json, optionsResponse, readBooleanParam } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    assertApiAuthorized(request);
    const url = new URL(request.url);
    const result = await runSlotCheck({
      posto_id: url.searchParams.get("posto_id") ?? undefined,
      notify: readBooleanParam(url.searchParams.get("notify"), true),
      force: readBooleanParam(url.searchParams.get("force"), true),
      respectInterval: false,
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertApiAuthorized(request);

    let body: unknown = {};
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const text = await request.text();
      body = text ? (JSON.parse(text) as unknown) : {};
    }

    const parsed = slotCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      return json(
        { ok: false, error: "Body inválido", details: parsed.error.issues },
        400,
      );
    }

    const result = await runSlotCheck({
      ...parsed.data,
      respectInterval: false,
      force: parsed.data.force ?? true,
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
