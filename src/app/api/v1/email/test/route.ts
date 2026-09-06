import { assertApiAuthorized } from "@/lib/auth";
import { errorResponse, json, optionsResponse } from "@/lib/http";
import { sendTestEmail } from "@/lib/notify/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    assertApiAuthorized(request);
    await sendTestEmail();
    return json({ ok: true, message: "E-mail de teste enviado" });
  } catch (error) {
    return errorResponse(error);
  }
}
