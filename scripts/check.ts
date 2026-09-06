import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { runSlotCheck } = await import("../src/lib/checker");
  const result = await runSlotCheck({
    force: true,
    respectInterval: false,
  });

  process.stdout.write("\n--- JSON da resposta ---\n");
  process.stdout.write(
    `${JSON.stringify(result.upstream.body, null, 2) ?? result.upstream.rawBody}\n`,
  );

  if (result.emailError) {
    process.stderr.write(`\nE-mail falhou: ${result.emailError}\n`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
