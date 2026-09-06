import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { LastCheck } from "@/lib/slots/types";

export type { LastCheck };

export type CheckerState = {
  lastCheckAt: number | null;
  lastNotifyAt: number | null;
  lastFingerprint: string | null;
  lastResult: LastCheck | null;
  history: LastCheck[];
};

const STATE_PATH = path.join(os.tmpdir(), "data-ccv-state.json");
const HISTORY_LIMIT = 15;
const RAW_BODY_LIMIT = 20_000;

const memory: { current: CheckerState } = {
  current: emptyState(),
};

function emptyState(): CheckerState {
  return {
    lastCheckAt: null,
    lastNotifyAt: null,
    lastFingerprint: null,
    lastResult: null,
    history: [],
  };
}

export function fingerprintBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex").slice(0, 20);
}

export function truncateRaw(raw: string): string {
  if (raw.length <= RAW_BODY_LIMIT) return raw;
  return `${raw.slice(0, RAW_BODY_LIMIT)}\n… [${raw.length - RAW_BODY_LIMIT} caracteres truncados]`;
}

function normalizeState(parsed: Partial<CheckerState>): CheckerState {
  return {
    lastCheckAt: parsed.lastCheckAt ?? null,
    lastNotifyAt: parsed.lastNotifyAt ?? null,
    lastFingerprint: parsed.lastFingerprint ?? null,
    lastResult: parsed.lastResult ?? null,
    history: Array.isArray(parsed.history) ? parsed.history : [],
  };
}

export async function readCheckerState(): Promise<CheckerState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const state = normalizeState(JSON.parse(raw) as Partial<CheckerState>);
    memory.current = state;
    return state;
  } catch {
    return memory.current ?? emptyState();
  }
}

export async function writeCheckerState(state: CheckerState): Promise<void> {
  memory.current = state;
  try {
    await fs.writeFile(STATE_PATH, JSON.stringify(state), "utf8");
  } catch {
    // /tmp pode falhar em alguns runtimes; o estado em memória ainda vale nesta instância.
  }
}

export function pushHistory(
  state: CheckerState,
  entry: LastCheck,
): CheckerState {
  return {
    ...state,
    lastResult: entry,
    history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
  };
}

export function shouldSkipByInterval(
  lastCheckAt: number | null,
  intervalMinutes: number,
  force: boolean,
): { skip: boolean; nextEligibleAt: number | null } {
  if (force || intervalMinutes <= 0 || !lastCheckAt) {
    return { skip: false, nextEligibleAt: null };
  }

  const elapsedMs = Date.now() - lastCheckAt;
  const windowMs = intervalMinutes * 60_000;

  if (elapsedMs < windowMs) {
    return { skip: true, nextEligibleAt: lastCheckAt + windowMs };
  }

  return { skip: false, nextEligibleAt: null };
}

export function shouldSkipNotify(
  state: CheckerState,
  fingerprint: string,
  cooldownMinutes: number,
): boolean {
  if (cooldownMinutes <= 0 || !state.lastNotifyAt) return false;
  if (state.lastFingerprint !== fingerprint) return false;
  return Date.now() - state.lastNotifyAt < cooldownMinutes * 60_000;
}
