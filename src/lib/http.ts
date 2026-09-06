import { AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function errorResponse(error: unknown, fallbackStatus = 500) {
  if (error instanceof AuthError) {
    return json({ ok: false, error: error.message }, error.status);
  }

  const message = error instanceof Error ? error.message : "Erro interno";
  logger.error("api error", { error: message });
  return json({ ok: false, error: message }, fallbackStatus);
}

export function readBooleanParam(
  value: string | null,
  defaultValue: boolean,
): boolean {
  if (value == null) return defaultValue;
  return value === "1" || value.toLowerCase() === "true";
}
