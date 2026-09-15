import { compareCountryCodes } from "./analytics";
import type { IsolationCountryRow, IsolationEventExtreme, IsolationSeriesBlock } from "./isolation";

export type IsolationCountrySortColumn =
  | "country"
  | "site"
  | "longestNames"
  | "longestDistance"
  | "longestNeighbour"
  | "longestNeighbourCountry"
  | "shortestNames"
  | "shortestDistance"
  | "shortestNeighbour"
  | "shortestNeighbourCountry";

export type IsolationGlobalSortColumn =
  "measure" | "names" | "distance" | "neighbour" | "neighbourCountry";

export interface IsolationGlobalTableRow {
  label: string;
  events: IsolationEventExtreme[];
  distanceKm: number | null;
}

export function isolationGlobalRowsFromBlock(
  block: IsolationSeriesBlock
): IsolationGlobalTableRow[] {
  return [
    {
      label: "Longest isolation",
      events: block.globalLongest,
      distanceKm: block.globalLongestDistanceKm,
    },
    {
      label: "Shortest isolation",
      events: block.globalShortest,
      distanceKm: block.globalShortestDistanceKm,
    },
  ];
}

function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a - b;
}

function firstName(events: IsolationEventExtreme[]): string {
  return events[0]?.name ?? "";
}

function firstNeighbourName(events: IsolationEventExtreme[]): string {
  return events[0]?.neighbourName ?? "";
}

function firstNeighbourCountry(events: IsolationEventExtreme[]): string {
  return events[0]?.neighbourCountryCode ?? "";
}

function compareNeighbourCountryCodes(a: string, b: string, collator: Intl.Collator): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return compareCountryCodes(a, b, collator);
}

function compareOptionalString(a: string, b: string, collator: Intl.Collator): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return collator.compare(a, b);
}

function hostnameForSort(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function compareIsolationCountryRowsByColumn(
  a: IsolationCountryRow,
  b: IsolationCountryRow,
  column: IsolationCountrySortColumn,
  collator: Intl.Collator
): number {
  let primary = 0;
  switch (column) {
    case "country":
      primary = compareCountryCodes(a.countryCode, b.countryCode, collator);
      break;
    case "site":
      primary = compareOptionalString(
        hostnameForSort(a.countryUrl),
        hostnameForSort(b.countryUrl),
        collator
      );
      break;
    case "longestNames":
      primary = compareOptionalString(firstName(a.longest), firstName(b.longest), collator);
      break;
    case "longestDistance":
      primary = compareNullableNumber(a.longestDistanceKm, b.longestDistanceKm);
      break;
    case "longestNeighbour":
      primary = compareOptionalString(
        firstNeighbourName(a.longest),
        firstNeighbourName(b.longest),
        collator
      );
      break;
    case "longestNeighbourCountry":
      primary = compareNeighbourCountryCodes(
        firstNeighbourCountry(a.longest),
        firstNeighbourCountry(b.longest),
        collator
      );
      break;
    case "shortestNames":
      primary = compareOptionalString(firstName(a.shortest), firstName(b.shortest), collator);
      break;
    case "shortestDistance":
      primary = compareNullableNumber(a.shortestDistanceKm, b.shortestDistanceKm);
      break;
    case "shortestNeighbour":
      primary = compareOptionalString(
        firstNeighbourName(a.shortest),
        firstNeighbourName(b.shortest),
        collator
      );
      break;
    case "shortestNeighbourCountry":
      primary = compareNeighbourCountryCodes(
        firstNeighbourCountry(a.shortest),
        firstNeighbourCountry(b.shortest),
        collator
      );
      break;
  }
  if (primary !== 0) {
    return primary;
  }
  return compareCountryCodes(a.countryCode, b.countryCode, collator);
}

export function compareIsolationGlobalRowsByColumn(
  a: IsolationGlobalTableRow,
  b: IsolationGlobalTableRow,
  column: IsolationGlobalSortColumn,
  collator: Intl.Collator
): number {
  let primary = 0;
  switch (column) {
    case "measure":
      primary = collator.compare(a.label, b.label);
      break;
    case "names":
      primary = compareOptionalString(firstName(a.events), firstName(b.events), collator);
      break;
    case "distance":
      primary = compareNullableNumber(a.distanceKm, b.distanceKm);
      break;
    case "neighbour":
      primary = compareOptionalString(
        firstNeighbourName(a.events),
        firstNeighbourName(b.events),
        collator
      );
      break;
    case "neighbourCountry":
      primary = compareNeighbourCountryCodes(
        firstNeighbourCountry(a.events),
        firstNeighbourCountry(b.events),
        collator
      );
      break;
  }
  if (primary !== 0) {
    return primary;
  }
  return collator.compare(a.label, b.label);
}

export function sortIsolationCountryRows(
  rows: IsolationCountryRow[],
  column: IsolationCountrySortColumn,
  direction: 1 | -1,
  collator: Intl.Collator
): IsolationCountryRow[] {
  return [...rows].sort(
    (a, b) => direction * compareIsolationCountryRowsByColumn(a, b, column, collator)
  );
}

export function sortIsolationGlobalRows(
  rows: IsolationGlobalTableRow[],
  column: IsolationGlobalSortColumn,
  direction: 1 | -1,
  collator: Intl.Collator
): IsolationGlobalTableRow[] {
  return [...rows].sort(
    (a, b) => direction * compareIsolationGlobalRowsByColumn(a, b, column, collator)
  );
}
