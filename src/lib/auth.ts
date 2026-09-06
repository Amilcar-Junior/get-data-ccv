import { getRuntimeConfig } from "@/lib/config";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function getRequestApiKey(request: Request): string | null {
  return request.headers.get("x-api-key") ?? bearerToken(request);
}

export function assertApiAuthorized(request: Request): void {
  const { apiKey } = getRuntimeConfig();
  if (!apiKey) {
    throw new AuthError("API_KEY não está definida no ambiente", 503);
  }
  if (getRequestApiKey(request) !== apiKey) {
    throw new AuthError("API key inválida", 401);
  }
}

/**
 * O POST automático (Vercel Cron + GitHub Action) não exige CRON_SECRET.
 * Se a variável existir e o pedido trouxer Bearer, tem de coincidir.
 * Sem header o job corre na mesma — senão Hobby/GitHub ficava bloqueado.
 * O retorno indica se o pedido pode usar `force=true`.
 */
export function assertCronAuthorized(request: Request): boolean {
  const { cronSecret } = getRuntimeConfig();
  if (!cronSecret) return true;

  const token = bearerToken(request);
  if (!token) return false;
  if (token !== cronSecret) {
    throw new AuthError("Cron secret inválido", 401);
  }
  return true;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
