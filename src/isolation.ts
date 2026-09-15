import {
  classifySeriesId,
  compareCountryCodes,
  createNameCollator,
  normalisedCountryCode,
  normalisedEventLongName,
  normaliseCountrySiteUrl,
} from "./analytics";
import { coordinatesFromFeature, haversineKm } from "./isolationGeometry";
import { UNKNOWN_SERIES_HEADING, getSeriesHeading } from "./seriesLabels";
import type { Feature, ParkrunEventsDocument } from "./types";

export interface IsolationEventExtreme {
  name: string;
  neighbourName: string;
  neighbourCountryCode: string;
}

export interface IsolationCountryRow {
  countryCode: string;
  countryUrl: string;
  longest: IsolationEventExtreme[];
  shortest: IsolationEventExtreme[];
  longestDistanceKm: number | null;
  shortestDistanceKm: number | null;
}

export interface IsolationSeriesBlock {
  title: string;
  isUnknown: boolean;
  countries: IsolationCountryRow[];
  globalLongest: IsolationEventExtreme[];
  globalShortest: IsolationEventExtreme[];
  globalLongestDistanceKm: number | null;
  globalShortestDistanceKm: number | null;
}

interface LocatedEvent {
  key: string;
  name: string;
  countryCode: string;
  lon: number;
  lat: number;
}

type SeriesKey = `n:${number}` | "unknown";

function seriesKeyFromClassified(classified: "unknown" | number): SeriesKey {
  return classified === "unknown" ? "unknown" : `n:${classified}`;
}

function eventKey(
  props: Record<string, unknown>,
  countryCode: string,
  name: string,
  lon: number,
  lat: number
): string {
  if (typeof props.eventname === "string" && props.eventname.trim() !== "") {
    return props.eventname.trim();
  }
  if (typeof props.EventShortName === "string" && props.EventShortName.trim() !== "") {
    return `${countryCode}:${props.EventShortName.trim()}`;
  }
  return `${countryCode}:${name}:${lon}:${lat}`;
}

function locatedEventFromFeature(feature: Feature): LocatedEvent | null {
  const props = feature.properties ?? {};
  const name = normalisedEventLongName(props.EventLongName);
  if (!name) {
    return null;
  }
  const countryCode = normalisedCountryCode(props.countrycode);
  if (!countryCode) {
    return null;
  }
  const coords = coordinatesFromFeature(feature);
  if (!coords) {
    return null;
  }
  return {
    key: eventKey(props, countryCode, name, coords.lon, coords.lat),
    name,
    countryCode,
    lon: coords.lon,
    lat: coords.lat,
  };
}

interface NearestResult {
  distanceKm: number;
  neighbour: LocatedEvent;
}

function nearestNeighbour(event: LocatedEvent, pool: LocatedEvent[]): NearestResult | null {
  let best: NearestResult | null = null;
  for (const other of pool) {
    if (other.key === event.key) {
      continue;
    }
    const distanceKm = haversineKm(event.lon, event.lat, other.lon, other.lat);
    if (!best || distanceKm < best.distanceKm) {
      best = { distanceKm, neighbour: other };
    }
  }
  return best;
}

function extremesFromResults(
  results: { event: LocatedEvent; nearest: NearestResult }[],
  mode: "longest" | "shortest",
  collator: Intl.Collator
): { items: IsolationEventExtreme[]; distanceKm: number | null } {
  if (results.length === 0) {
    return { items: [], distanceKm: null };
  }
  const distances = results.map((r) => r.nearest.distanceKm);
  const target = mode === "longest" ? Math.max(...distances) : Math.min(...distances);
  const matches = results.filter((r) => r.nearest.distanceKm === target);
  matches.sort((a, b) => collator.compare(a.event.name, b.event.name));
  return {
    distanceKm: target,
    items: matches.map((m) => ({
      name: m.event.name,
      neighbourName: m.nearest.neighbour.name,
      neighbourCountryCode: m.nearest.neighbour.countryCode,
    })),
  };
}

function buildIsolationCountryRows(
  doc: ParkrunEventsDocument,
  results: { event: LocatedEvent; nearest: NearestResult }[],
  collator: Intl.Collator
): IsolationCountryRow[] {
  const byCountry = new Map<string, { event: LocatedEvent; nearest: NearestResult }[]>();
  for (const result of results) {
    const list = byCountry.get(result.event.countryCode) ?? [];
    list.push(result);
    byCountry.set(result.event.countryCode, list);
  }
  const codes = [...byCountry.keys()].sort((a, b) => compareCountryCodes(a, b, collator));
  return codes.map((countryCode) => {
    const countryResults = byCountry.get(countryCode) ?? [];
    const longest = extremesFromResults(countryResults, "longest", collator);
    const shortest = extremesFromResults(countryResults, "shortest", collator);
    return {
      countryCode,
      countryUrl: normaliseCountrySiteUrl(doc.countries[countryCode]?.url),
      longest: longest.items,
      shortest: shortest.items,
      longestDistanceKm: longest.distanceKm,
      shortestDistanceKm: shortest.distanceKm,
    };
  });
}

function buildSeriesBlock(
  doc: ParkrunEventsDocument,
  title: string,
  isUnknown: boolean,
  located: LocatedEvent[],
  collator: Intl.Collator
): IsolationSeriesBlock | null {
  if (located.length < 2) {
    return null;
  }
  const results: { event: LocatedEvent; nearest: NearestResult }[] = [];
  for (const event of located) {
    const nearest = nearestNeighbour(event, located);
    if (!nearest) {
      continue;
    }
    results.push({ event, nearest });
  }
  if (results.length === 0) {
    return null;
  }
  const globalLongest = extremesFromResults(results, "longest", collator);
  const globalShortest = extremesFromResults(results, "shortest", collator);
  return {
    title,
    isUnknown,
    countries: buildIsolationCountryRows(doc, results, collator),
    globalLongest: globalLongest.items,
    globalShortest: globalShortest.items,
    globalLongestDistanceKm: globalLongest.distanceKm,
    globalShortestDistanceKm: globalShortest.distanceKm,
  };
}

export function computeIsolationSeriesBlocks(
  doc: ParkrunEventsDocument,
  collator: Intl.Collator = createNameCollator()
): IsolationSeriesBlock[] {
  const bySeries = new Map<SeriesKey, LocatedEvent[]>();

  for (const feature of doc.events.features) {
    const located = locatedEventFromFeature(feature);
    if (!located) {
      continue;
    }
    const classified = classifySeriesId(feature.properties?.seriesid);
    const key = seriesKeyFromClassified(classified);
    const list = bySeries.get(key) ?? [];
    list.push(located);
    bySeries.set(key, list);
  }

  const numericEntries: { id: number; located: LocatedEvent[] }[] = [];
  let unknownLocated: LocatedEvent[] | undefined;

  for (const [key, located] of bySeries.entries()) {
    if (key === "unknown") {
      unknownLocated = located;
    } else {
      numericEntries.push({ id: Number(key.slice(2)), located });
    }
  }
  numericEntries.sort((a, b) => a.id - b.id);

  const blocks: IsolationSeriesBlock[] = [];
  for (const { id, located } of numericEntries) {
    const block = buildSeriesBlock(doc, getSeriesHeading(id), false, located, collator);
    if (block) {
      blocks.push(block);
    }
  }
  if (unknownLocated) {
    const block = buildSeriesBlock(doc, UNKNOWN_SERIES_HEADING, true, unknownLocated, collator);
    if (block) {
      blocks.push(block);
    }
  }
  return blocks;
}
