export type SlotPeriod = {
  id: number | string;
  description: string;
};

export type SlotDay = {
  date: string;
  periods: SlotPeriod[];
};

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapData(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload;
  if (isPlainObject(payload) && "data" in payload) return payload.data;
  return payload;
}

function isSlotPeriod(value: unknown): value is SlotPeriod {
  if (!isPlainObject(value)) return false;
  if (typeof value.description !== "string") return false;
  return typeof value.id === "number" || typeof value.id === "string";
}

function isSlotDay(value: unknown): value is SlotDay {
  if (!isPlainObject(value)) return false;
  if (typeof value.date !== "string" || !value.date) return false;
  if (!Array.isArray(value.periods)) return false;
  return value.periods.every(isSlotPeriod);
}

export function extractSlotDays(payload: unknown): SlotDay[] {
  const data = unwrapData(payload);
  if (!Array.isArray(data)) return [];
  return data.filter(isSlotDay);
}

export function isEmptySlotsPayload(payload: unknown): boolean {
  if (payload == null) return true;
  if (typeof payload === "string") return payload.trim() === "";

  const data = unwrapData(payload);
  if (data == null) return true;
  if (typeof data === "string") return data.trim() === "";
  if (Array.isArray(data)) return data.length === 0;
  if (isPlainObject(data)) return Object.keys(data).length === 0;
  return false;
}

/**
 * Vazio → não notifica.
 * Lista `{ date, periods }` → notifica "tem vagas".
 * Qualquer outro corpo (ou HTTP ≠ 200) → notifica na mesma.
 */
export function evaluateUpstreamResponse(
  httpStatus: number,
  payload: unknown,
): Evaluation {
  if (httpStatus !== 200) {
    return {
      isEmpty: false,
      shouldNotify: true,
      reason: "http_erro",
      days: [],
    };
  }

  const days = extractSlotDays(payload);
  if (days.length > 0) {
    return {
      isEmpty: false,
      shouldNotify: true,
      reason: "vagas",
      days,
    };
  }

  if (isEmptySlotsPayload(payload)) {
    return {
      isEmpty: true,
      shouldNotify: false,
      reason: "sem_vagas",
      days: [],
    };
  }

  return {
    isEmpty: false,
    shouldNotify: true,
    reason: "resposta_diferente",
    days: [],
  };
}

export function formatDatePt(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function formatSlotDayLine(day: SlotDay): string {
  const hours = day.periods.map((period) => period.description).join(", ");
  return hours ? `${formatDatePt(day.date)} · ${hours}` : formatDatePt(day.date);
}

export function summarizeSlotDays(days: SlotDay[]): string | null {
  if (days.length === 0) return null;
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return null;
  return `${days.length} dias · ${formatDatePt(first.date)} → ${formatDatePt(last.date)}`;
}

export type Evaluation = {
  isEmpty: boolean;
  shouldNotify: boolean;
  reason: "sem_vagas" | "vagas" | "resposta_diferente" | "http_erro";
  days: SlotDay[];
};
