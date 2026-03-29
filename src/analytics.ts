import { UNKNOWN_SERIES_HEADING, getSeriesHeading } from "./seriesLabels";
import type { CountryRow, ParkrunEventsDocument, SeriesBlock } from "./types";

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
  perCountry: Map<string, Set<string>>;
  allNames: Set<string>;
}

function getBucket(map: Map<SeriesKey, Bucket>, key: SeriesKey): Bucket {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { perCountry: new Map(), allNames: new Set() };
    map.set(key, bucket);
  }
  return bucket;
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
    const names = bucket.perCountry.get(countryCode) ?? new Set<string>();
    const countryUrl = doc.countries[countryCode]?.url ?? "";
    return {
      countryCode,
      countryUrl,
      longest: extremeNames(names, "longest", collator),
      shortest: extremeNames(names, "shortest", collator),
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
    const classified = classifySeriesId(props.seriesid);
    const key = seriesKeyFromClassified(classified);
    const bucket = getBucket(buckets, key);
    let countrySet = bucket.perCountry.get(countryCode);
    if (!countrySet) {
      countrySet = new Set<string>();
      bucket.perCountry.set(countryCode, countrySet);
    }
    countrySet.add(name);
    bucket.allNames.add(name);
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
    if (bucket.allNames.size === 0) {
      continue;
    }
    blocks.push({
      title: getSeriesHeading(id),
      isUnknown: false,
      countries: buildCountryRows(doc, bucket, collator),
      globalLongest: extremeNames(bucket.allNames, "longest", collator),
      globalShortest: extremeNames(bucket.allNames, "shortest", collator),
    });
  }

  if (unknownBucket && unknownBucket.allNames.size > 0) {
    blocks.push({
      title: UNKNOWN_SERIES_HEADING,
      isUnknown: true,
      countries: buildCountryRows(doc, unknownBucket, collator),
      globalLongest: extremeNames(unknownBucket.allNames, "longest", collator),
      globalShortest: extremeNames(unknownBucket.allNames, "shortest", collator),
    });
  }

  return blocks;
}
