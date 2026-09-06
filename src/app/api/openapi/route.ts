import { getOpenApiDocument } from "@/lib/openapi/spec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(getOpenApiDocument(origin), {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
