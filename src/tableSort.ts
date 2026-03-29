import { compareCountryCodes } from "./analytics";
import type { CountryRow, SeriesBlock } from "./types";

export type CountrySortColumn =
  | "country"
  | "site"
  | "longestNames"
  | "longestCount"
  | "shortestNames"
  | "shortestCount";

export type GlobalSortColumn = "measure" | "names" | "count";

export interface GlobalTableRow {
  label: string;
  names: string[];
  charCount: number | null;
}

export function globalRowsFromBlock(block: SeriesBlock): GlobalTableRow[] {
  return [
    {
      label: "Longest EventLongName",
      names: block.globalLongest,
      charCount: block.globalLongestCharCount,
    },
    {
      label: "Shortest EventLongName",
      names: block.globalShortest,
      charCount: block.globalShortestCharCount,
    },
  ];
}

function compareNullableCount(a: number | null, b: number | null): number {
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

function compareFirstNameList(a: string[], b: string[], collator: Intl.Collator): number {
  const na = a[0] ?? "";
  const nb = b[0] ?? "";
  if (!na && !nb) {
    return 0;
  }
  if (!na) {
    return 1;
  }
  if (!nb) {
    return -1;
  }
  return collator.compare(na, nb);
}

function hostnameForSort(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function compareCountryRowsByColumn(
  a: CountryRow,
  b: CountryRow,
  column: CountrySortColumn,
  collator: Intl.Collator
): number {
  let primary = 0;
  switch (column) {
    case "country":
      primary = compareCountryCodes(a.countryCode, b.countryCode, collator);
      break;
    case "site": {
      const sa = hostnameForSort(a.countryUrl);
      const sb = hostnameForSort(b.countryUrl);
      if (!sa && !sb) {
        primary = 0;
      } else if (!sa) {
        primary = 1;
      } else if (!sb) {
        primary = -1;
      } else {
        primary = collator.compare(sa, sb);
      }
      break;
    }
    case "longestNames":
      primary = compareFirstNameList(a.longest, b.longest, collator);
      break;
    case "longestCount":
      primary = compareNullableCount(a.longestCharCount, b.longestCharCount);
      break;
    case "shortestNames":
      primary = compareFirstNameList(a.shortest, b.shortest, collator);
      break;
    case "shortestCount":
      primary = compareNullableCount(a.shortestCharCount, b.shortestCharCount);
      break;
  }
  if (primary !== 0) {
    return primary;
  }
  return compareCountryCodes(a.countryCode, b.countryCode, collator);
}

export function compareGlobalRowsByColumn(
  a: GlobalTableRow,
  b: GlobalTableRow,
  column: GlobalSortColumn,
  collator: Intl.Collator
): number {
  let primary = 0;
  switch (column) {
    case "measure":
      primary = collator.compare(a.label, b.label);
      break;
    case "names":
      primary = compareFirstNameList(a.names, b.names, collator);
      break;
    case "count":
      primary = compareNullableCount(a.charCount, b.charCount);
      break;
  }
  if (primary !== 0) {
    return primary;
  }
  return collator.compare(a.label, b.label);
}

export function sortCountryRows(
  rows: CountryRow[],
  column: CountrySortColumn,
  direction: 1 | -1,
  collator: Intl.Collator
): CountryRow[] {
  return [...rows].sort((a, b) => direction * compareCountryRowsByColumn(a, b, column, collator));
}

export function sortGlobalRows(
  rows: GlobalTableRow[],
  column: GlobalSortColumn,
  direction: 1 | -1,
  collator: Intl.Collator
): GlobalTableRow[] {
  return [...rows].sort((a, b) => direction * compareGlobalRowsByColumn(a, b, column, collator));
}
