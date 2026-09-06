export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEmptySlotsPayload(payload: unknown): boolean {
  if (!isPlainObject(payload)) return false;
  if (!("data" in payload)) return false;
  const { data } = payload;
  if (!isPlainObject(data)) return false;
  return Object.keys(data).length === 0;
}

export type Evaluation = {
  isEmpty: boolean;
  shouldNotify: boolean;
  reason: "sem_vagas" | "resposta_diferente" | "http_erro";
};

export function evaluateUpstreamResponse(
  httpStatus: number,
  payload: unknown,
): Evaluation {
  if (httpStatus !== 200) {
    return {
      isEmpty: false,
      shouldNotify: true,
      reason: "http_erro",
    };
  }

  if (isEmptySlotsPayload(payload)) {
    return {
      isEmpty: true,
      shouldNotify: false,
      reason: "sem_vagas",
    };
  }

  return {
    isEmpty: false,
    shouldNotify: true,
    reason: "resposta_diferente",
  };
}
