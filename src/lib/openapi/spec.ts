import { DEFAULT_SLOTS_URL } from "@/lib/config";

export function getOpenApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "data-ccv — Monitor de vagas Vistos Online",
      version: "1.0.0",
      summary: "Consulta o endpoint de slots do MNE e alerta por e-mail.",
      description: [
        "API HTTP para verificar vagas no portal **Vistos Online** (MNE Portugal).",
        "",
        "O POST ao MNE corre **sozinho**: GitHub Action a cada 5 minutos, cron diário na Vercel, e scheduler local no `next dev`.",
        "A frequência real da consulta ao MNE é `CHECK_INTERVAL_MINUTES`.",
        "",
        "Resposta considerada **sem vagas**: `{ \"data\": {} }`.",
        "Qualquer outro corpo ou status HTTP dispara um e-mail.",
        "",
        "## Autenticação",
        "- API (outros projetos): header `x-api-key` ou `Authorization: Bearer <API_KEY>`",
        "- Cron: público. `CRON_SECRET` é opcional (só exige Bearer se o pedido o enviar).",
        "",
        "## Pedido equivalente ao curl original",
        "O servidor replica este pedido contra o MNE:",
        "",
        "```",
        `POST ${DEFAULT_SLOTS_URL}?posto_id={POSTO_ID}`,
        "Content-Type: application/x-www-form-urlencoded",
        "Cookie: {VISTOS_COOKIE}",
        "",
        "posto_id={POSTO_ID}&captcha={VISTOS_CAPTCHA}",
        "```",
      ].join("\n"),
      contact: {
        name: "data-ccv",
      },
    },
    servers: [
      {
        url: origin,
        description: "Este deployment",
      },
    ],
    tags: [
      { name: "Saúde", description: "Estado do serviço" },
      { name: "Vagas", description: "Consulta de slots no MNE" },
      { name: "Cron", description: "Execução agendada na Vercel" },
      { name: "E-mail", description: "Teste da configuração SMTP" },
      { name: "OpenAPI", description: "Especificação desta API" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Saúde"],
          operationId: "getHealth",
          summary: "Health check",
          description:
            "Endpoint público. Indica se as variáveis obrigatórias estão definidas (sem revelar valores) e devolve a última resposta do POST ao MNE (`lastCheck` + `history`).",
          security: [],
          responses: {
            "200": {
              description: "Serviço a responder",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                  examples: {
                    ok: {
                      value: {
                        ok: true,
                        service: "data-ccv",
                        time: "2026-09-04T14:00:00.000Z",
                        config: {
                          postoId: "5084",
                          checkIntervalMinutes: 5,
                          hasCookie: true,
                          hasCaptcha: true,
                          hasSmtp: true,
                          hasEmailTo: true,
                          hasApiKey: true,
                          hasCronSecret: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/openapi": {
        get: {
          tags: ["OpenAPI"],
          operationId: "getOpenApi",
          summary: "Especificação OpenAPI 3.1",
          description: "Documento JSON desta API. Use em Postman, Insomnia, SDK generators ou Swagger UI.",
          security: [],
          responses: {
            "200": {
              description: "Documento OpenAPI",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
      },
      "/api/v1/slots/check": {
        get: {
          tags: ["Vagas"],
          operationId: "checkSlotsGet",
          summary: "Verificar vagas agora (GET)",
          description:
            "Executa já a consulta ao MNE usando cookie e captcha das variáveis de ambiente. Ideal para cron externos (cron-job.org, EasyCron).",
          security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "notify",
              in: "query",
              required: false,
              schema: { type: "boolean", default: true },
              description: "Se false, consulta mas não envia e-mail.",
            },
            {
              name: "force",
              in: "query",
              required: false,
              schema: { type: "boolean", default: true },
              description: "GET ignora o intervalo por omissão.",
            },
            {
              name: "posto_id",
              in: "query",
              required: false,
              schema: { type: "string", example: "5084" },
            },
          ],
          responses: {
            "200": {
              description: "Consulta concluída",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SlotCheckResponse" },
                  examples: {
                    empty: { $ref: "#/components/examples/EmptySlots" },
                    alert: { $ref: "#/components/examples/SlotsFound" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/Error" },
          },
        },
        post: {
          tags: ["Vagas"],
          operationId: "checkSlotsPost",
          summary: "Verificar vagas agora (POST)",
          description:
            "Permite sobrepor `posto_id`, `captcha` e `cookie` no body. Use isto noutros projetos quando o captcha/sessão forem obtidos dinamicamente.",
          security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SlotCheckRequest" },
                examples: {
                  env: {
                    summary: "Usar cookie e captcha do ambiente",
                    value: { notify: true },
                  },
                  override: {
                    summary: "Sobrepor sessão e captcha",
                    value: {
                      posto_id: "5084",
                      cookie:
                        "Vistos_sid=...; user_consent=1; cookiesession1=...",
                      captcha: "<token-captcha>",
                      notify: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Consulta concluída",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SlotCheckResponse" },
                  examples: {
                    empty: { $ref: "#/components/examples/EmptySlots" },
                    alert: { $ref: "#/components/examples/SlotsFound" },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/Error" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/Error" },
          },
        },
      },
      "/api/cron/check-slots": {
        get: {
          tags: ["Cron"],
          operationId: "cronCheckSlots",
          summary: "Job agendado (Vercel Cron + GitHub Action)",
          description:
            "Público. Respeita `CHECK_INTERVAL_MINUTES`. Se a última execução foi há menos tempo, devolve `skipped: true` sem chamar o MNE.",
          security: [],
          parameters: [
            {
              name: "force",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description: "Ignora o intervalo e consulta imediatamente.",
            },
          ],
          responses: {
            "200": {
              description: "Execução ou skip por intervalo",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SlotCheckResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/Error" },
          },
        },
      },
      "/api/v1/email/test": {
        post: {
          tags: ["E-mail"],
          operationId: "sendTestEmail",
          summary: "Enviar e-mail de teste",
          description:
            "Valida SMTP_USER, SMTP_APP_PASSWORD e EMAIL_TO sem consultar o MNE.",
          security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
          responses: {
            "200": {
              description: "E-mail enviado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TestEmailResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/Error" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Valor de API_KEY",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API_KEY",
          description: "Authorization: Bearer <API_KEY>",
        },
        CronBearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "CRON_SECRET",
          description: "Authorization: Bearer <CRON_SECRET>",
        },
      },
      schemas: {
        SlotCheckRequest: {
          type: "object",
          additionalProperties: false,
          properties: {
            posto_id: {
              type: "string",
              description: "ID do posto consular. Default: POSTO_ID.",
              example: "5084",
            },
            captcha: {
              type: "string",
              description:
                "Token captcha do formulário Schedule.jsp. Expira — atualize com frequência.",
            },
            cookie: {
              type: "string",
              description:
                "Header Cookie completo da sessão Vistos Online (Vistos_sid, cookiesession1, ...).",
            },
            notify: {
              type: "boolean",
              default: true,
              description: "Enviar e-mail se a resposta for diferente de { data: {} }.",
            },
            force: {
              type: "boolean",
              default: false,
              description: "Ignorar CHECK_INTERVAL_MINUTES.",
            },
          },
        },
        SlotCheckResponse: {
          type: "object",
          required: [
            "ok",
            "skipped",
            "notified",
            "reason",
            "checkedAt",
            "interval",
            "upstream",
          ],
          properties: {
            ok: { type: "boolean" },
            skipped: {
              type: "boolean",
              description: "true se o intervalo ainda não passou.",
            },
            notified: { type: "boolean" },
            notifySkippedReason: {
              type: ["string", "null"],
              enum: ["intervalo", "sem_vagas", "notify_desligado", "cooldown", "email_falhou", null],
            },
            reason: {
              type: "string",
              enum: ["sem_vagas", "resposta_diferente", "http_erro", "intervalo"],
            },
            checkedAt: { type: "string", format: "date-time" },
            lastCheck: { $ref: "#/components/schemas/LastCheck" },
            emailError: { type: ["string", "null"] },
            interval: { $ref: "#/components/schemas/IntervalInfo" },
            upstream: { $ref: "#/components/schemas/UpstreamResult" },
          },
        },
        IntervalInfo: {
          type: "object",
          properties: {
            minutes: { type: "number", example: 5 },
            skipped: { type: "boolean" },
            nextEligibleAt: { type: ["string", "null"], format: "date-time" },
            lastCheckAt: { type: ["string", "null"], format: "date-time" },
          },
        },
        UpstreamResult: {
          type: "object",
          properties: {
            status: { type: ["integer", "null"], example: 200 },
            url: { type: ["string", "null"], format: "uri" },
            postoId: { type: "string", example: "5084" },
            durationMs: { type: ["number", "null"] },
            body: {
              description:
                "JSON devolvido pelo MNE. Sem vagas = { data: {} }. Qualquer outro valor gera alerta.",
              example: { data: {} },
            },
            rawBody: {
              type: ["string", "null"],
              description: "Corpo bruto do POST, para diagnóstico (HTML de erro, JSON, etc.).",
            },
          },
        },
        LastCheck: {
          type: "object",
          properties: {
            checkedAt: { type: "string", format: "date-time" },
            status: { type: "integer" },
            url: { type: "string" },
            postoId: { type: "string" },
            durationMs: { type: "number" },
            reason: { type: "string" },
            notified: { type: "boolean" },
            body: { description: "JSON parseado da resposta do MNE." },
            rawBody: { type: "string" },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            service: { type: "string" },
            time: { type: "string", format: "date-time" },
            config: { type: "object", additionalProperties: true },
            lastCheck: { $ref: "#/components/schemas/LastCheck" },
            history: {
              type: "array",
              items: { $ref: "#/components/schemas/LastCheck" },
            },
          },
        },
        TestEmailResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        MneSlotsRequest: {
          type: "object",
          description: "Formato exacto do pedido enviado ao MNE (para reutilizar noutros clientes).",
          properties: {
            method: { type: "string", example: "POST" },
            url: {
              type: "string",
              example: "https://pedidodevistos.mne.gov.pt/VistosOnline/slots?posto_id=5084",
            },
            headers: {
              type: "object",
              properties: {
                Accept: { type: "string", example: "*/*" },
                "Content-Type": {
                  type: "string",
                  example: "application/x-www-form-urlencoded",
                },
                Origin: {
                  type: "string",
                  example: "https://pedidodevistos.mne.gov.pt",
                },
                Referer: {
                  type: "string",
                  example:
                    "https://pedidodevistos.mne.gov.pt/VistosOnline/Schedule.jsp?posto_id=5084",
                },
                Cookie: { type: "string" },
              },
            },
            body: {
              type: "string",
              example: "posto_id=5084&captcha=<token>",
            },
          },
        },
      },
      examples: {
        EmptySlots: {
          summary: "Sem vagas",
          value: {
            ok: true,
            skipped: false,
            notified: false,
            notifySkippedReason: "sem_vagas",
            reason: "sem_vagas",
            checkedAt: "2026-09-04T14:00:00.000Z",
            interval: {
              minutes: 5,
              skipped: false,
              nextEligibleAt: "2026-09-04T14:05:00.000Z",
              lastCheckAt: "2026-09-04T14:00:00.000Z",
            },
            upstream: {
              status: 200,
              url: "https://pedidodevistos.mne.gov.pt/VistosOnline/slots?posto_id=5084",
              postoId: "5084",
              durationMs: 412,
              body: { data: {} },
            },
          },
        },
        SlotsFound: {
          summary: "Resposta diferente — e-mail enviado",
          value: {
            ok: true,
            skipped: false,
            notified: true,
            notifySkippedReason: null,
            reason: "resposta_diferente",
            checkedAt: "2026-09-04T14:00:00.000Z",
            interval: {
              minutes: 5,
              skipped: false,
              nextEligibleAt: "2026-09-04T14:05:00.000Z",
              lastCheckAt: "2026-09-04T14:00:00.000Z",
            },
            upstream: {
              status: 200,
              url: "https://pedidodevistos.mne.gov.pt/VistosOnline/slots?posto_id=5084",
              postoId: "5084",
              durationMs: 388,
              body: { data: { "2026-09-10": ["09:00", "09:30"] } },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Não autenticado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { ok: false, error: "API key inválida" },
            },
          },
        },
        Error: {
          description: "Erro",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  } as const;
}
