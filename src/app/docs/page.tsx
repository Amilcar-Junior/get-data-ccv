import Link from "next/link";
import { SwaggerClient } from "./swagger-client";

export default function DocsPage() {
  return (
    <main className="min-h-full bg-[#f7f4ec] text-[#1a1406]">
      <header className="flex items-center justify-between gap-4 border-b border-[#e0d8c4] bg-[#0b1020] px-6 py-4 text-[#f4efe4]">
        <div>
          <Link href="/" className="text-xs tracking-[0.28em] text-[var(--gold)] uppercase">
            data-ccv
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            API · Swagger
          </h1>
        </div>
        <a
          href="/api/openapi"
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--gold)]"
        >
          openapi.json
        </a>
      </header>
      <SwaggerClient />
    </main>
  );
}
