export type LastCheck = {
  checkedAt: string;
  status: number;
  url: string;
  postoId: string;
  durationMs: number;
  reason: string;
  notified: boolean;
  body: unknown;
  rawBody: string;
};
