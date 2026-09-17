import { UNKNOWN_SERIES_HEADING, getSeriesHeading } from "./seriesLabels";
import type { CountryRow, ListedEvent, ParkrunEventsDocument, SeriesBlock } from "./types";

export function createNameCollator(): Intl.Collator {
  return new Intl.Collator("en-AU", { sensitivity: "base" });
}

export function parseParkrunDocument(body: string): ParkrunEventsDocument {
  const parsed = JSON.parse(body) as unknown;
  if (!isParkrunEventsDocument(parsed)) {
    throw new Error("Invalid parkrun events payload");
  }
  return parsed;
}

function isParkrunEventsDocument(value: unknown): value is ParkrunEventsDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (!v.countries || typeof v.countries !== "object") {
    return false;
  }
  if (!v.events || typeof v.events !== "object") {
    return false;
  }
  const events = v.events as Record<string, unknown>;
  if (!Array.isArray(events.features)) {
    return false;
  }
  return true;
}

export function normalisedEventLongName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function normalisedEventname(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function normalisedCountryCode(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

/**
 * The parkrun events feed often stores country sites as bare hostnames (no scheme).
 * Without a scheme, `href` is resolved against the page URL and breaks under a subpath deploy.
 */
export function normaliseCountrySiteUrl(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return "";
  }
  if (typeof raw !== "string") {
    return "";
  }
  const t = raw.trim();
  if (t === "") {
    return "";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (t.startsWith("//")) {
    return `https:${t}`;
  }
  return `https://${t}`;
}

export function classifySeriesId(value: unknown): "unknown" | number {
  if (typeof value === "number") {
    if (Number.isInteger(value) && Number.isFinite(value)) {
      return value;
    }
    return "unknown";
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n) && Number.isFinite(n)) {
      return n;
    }
  }
  return "unknown";
}

type SeriesKey = `n:${number}` | "unknown";

function seriesKeyFromClassified(classified: "unknown" | number): SeriesKey {
  return classified === "unknown" ? "unknown" : `n:${classified}`;
}

interface Bucket {
  perCountry: Map<string, Map<string, ListedEvent>>;
  allEvents: Map<string, ListedEvent>;
}

function getBucket(map: Map<SeriesKey, Bucket>, key: SeriesKey): Bucket {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { perCountry: new Map(), allEvents: new Map() };
    map.set(key, bucket);
  }
  return bucket;
}

function listedEventIdentity(event: ListedEvent, countryCode: string): string {
  return event.eventname ?? `${countryCode}:${event.name}`;
}

/** All events returned by `extremeListedEvents` for a non-empty list share this name length. */
export function charCountForListedEvents(events: ListedEvent[]): number | null {
  return events.length > 0 ? events[0].name.length : null;
}

export function charCountForExtremeNames(names: string[]): number | null {
  return names.length > 0 ? names[0].length : null;
}

export function extremeNames(
  names: Set<string>,
  mode: "longest" | "shortest",
  collator: Intl.Collator
): string[] {
  if (names.size === 0) {
    return [];
  }
  const unique = [...names];
  const lengths = unique.map((s) => s.length);
  const target = mode === "longest" ? Math.max(...lengths) : Math.min(...lengths);
  const matches = unique.filter((s) => s.length === target);
  const deduped = [...new Set(matches)];
  deduped.sort((a, b) => collator.compare(a, b));
  return deduped;
}

export function extremeListedEvents(
  events: Iterable<ListedEvent>,
  mode: "longest" | "shortest",
  collator: Intl.Collator
): ListedEvent[] {
  const list = [...events];
  if (list.length === 0) {
    return [];
  }
  const lengths = list.map((e) => e.name.length);
  const target = mode === "longest" ? Math.max(...lengths) : Math.min(...lengths);
  const matches = list.filter((e) => e.name.length === target);
  matches.sort((a, b) => {
    const byName = collator.compare(a.name, b.name);
    if (byName !== 0) {
      return byName;
    }
    return collator.compare(a.eventname ?? "", b.eventname ?? "");
  });
  return matches;
}

export function compareCountryCodes(a: string, b: string, collator: Intl.Collator): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isFinite(na) && Number.isInteger(nb) && Number.isFinite(nb)) {
    return na - nb;
  }
  return collator.compare(a, b);
}

function buildCountryRows(
  doc: ParkrunEventsDocument,
  bucket: Bucket,
  collator: Intl.Collator
): CountryRow[] {
  const codes = [...bucket.perCountry.keys()].filter(
    (cc) => (bucket.perCountry.get(cc)?.size ?? 0) > 0
  );
  codes.sort((a, b) => compareCountryCodes(a, b, collator));
  return codes.map((countryCode) => {
    const countryEvents = [...(bucket.perCountry.get(countryCode)?.values() ?? [])];
    const countryUrl = normaliseCountrySiteUrl(doc.countries[countryCode]?.url);
    const longest = extremeListedEvents(countryEvents, "longest", collator);
    const shortest = extremeListedEvents(countryEvents, "shortest", collator);
    return {
      countryCode,
      countryUrl,
      longest,
      shortest,
      longestCharCount: charCountForListedEvents(longest),
      shortestCharCount: charCountForListedEvents(shortest),
    };
  });
}

export function computeSeriesBlocks(
  doc: ParkrunEventsDocument,
  collator: Intl.Collator = createNameCollator()
): SeriesBlock[] {
  const buckets = new Map<SeriesKey, Bucket>();

  for (const feature of doc.events.features) {
    const props = feature.properties ?? {};
    const name = normalisedEventLongName(props.EventLongName);
    if (!name) {
      continue;
    }
    const countryCode = normalisedCountryCode(props.countrycode);
    if (!countryCode) {
      continue;
    }
    const listed: ListedEvent = {
      name,
      eventname: normalisedEventname(props.eventname),
    };
    const identity = listedEventIdentity(listed, countryCode);
    const classified = classifySeriesId(props.seriesid);
    const key = seriesKeyFromClassified(classified);
    const bucket = getBucket(buckets, key);
    let countryMap = bucket.perCountry.get(countryCode);
    if (!countryMap) {
      countryMap = new Map();
      bucket.perCountry.set(countryCode, countryMap);
    }
    countryMap.set(identity, listed);
    bucket.allEvents.set(identity, listed);
  }

  const numericEntries: { id: number; bucket: Bucket }[] = [];
  let unknownBucket: Bucket | undefined;

  for (const [key, bucket] of buckets.entries()) {
    if (key === "unknown") {
      unknownBucket = bucket;
    } else {
      const id = Number(key.slice(2));
      numericEntries.push({ id, bucket });
    }
  }

  numericEntries.sort((a, b) => a.id - b.id);

  const blocks: SeriesBlock[] = [];

  for (const { id, bucket } of numericEntries) {
    if (bucket.allEvents.size === 0) {
      continue;
    }
    const globalLongest = extremeListedEvents(bucket.allEvents.values(), "longest", collator);
    const globalShortest = extremeListedEvents(bucket.allEvents.values(), "shortest", collator);
    blocks.push({
      title: getSeriesHeading(id),
      isUnknown: false,
      countries: buildCountryRows(doc, bucket, collator),
      globalLongest,
      globalShortest,
      globalLongestCharCount: charCountForListedEvents(globalLongest),
      globalShortestCharCount: charCountForListedEvents(globalShortest),
    });
  }

  if (unknownBucket && unknownBucket.allEvents.size > 0) {
    const globalLongest = extremeListedEvents(
      unknownBucket.allEvents.values(),
      "longest",
      collator
    );
    const globalShortest = extremeListedEvents(
      unknownBucket.allEvents.values(),
      "shortest",
      collator
    );
    blocks.push({
      title: UNKNOWN_SERIES_HEADING,
      isUnknown: true,
      countries: buildCountryRows(doc, unknownBucket, collator),
      globalLongest,
      globalShortest,
      globalLongestCharCount: charCountForListedEvents(globalLongest),
      globalShortestCharCount: charCountForListedEvents(globalShortest),
    });
  }

  return blocks;
}
