import { SCHEMA_VERSION, STORAGE_KEY } from "./constants";

export interface CacheRecord {
  v: number;
  fetchedAt: number;
  body: string;
}

export function readCache(): CacheRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CacheRecord>;
    if (
      parsed.v !== SCHEMA_VERSION ||
      typeof parsed.fetchedAt !== "number" ||
      typeof parsed.body !== "string"
    ) {
      return null;
    }
    return { v: parsed.v, fetchedAt: parsed.fetchedAt, body: parsed.body };
  } catch {
    return null;
  }
}

export function writeCache(record: { fetchedAt: number; body: string }): void {
  const payload: CacheRecord = {
    v: SCHEMA_VERSION,
    fetchedAt: record.fetchedAt,
    body: record.body,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function isFresh(record: CacheRecord, now: number, ttlMs: number): boolean {
  return now - record.fetchedAt < ttlMs;
}
