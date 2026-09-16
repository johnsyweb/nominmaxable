export interface CountryInfo {
  /** May be a bare hostname (e.g. `www.parkrun.com.au`) or null in the live feed. */
  url: string | null;
}

export interface ParkrunEventsDocument {
  countries: Record<string, CountryInfo>;
  events: {
    features: Feature[];
  };
}

export interface Feature {
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

/** An event as shown in extreme name lists, with optional feed slug for cards. */
export interface ListedEvent {
  name: string;
  eventname: string | null;
}

export interface CountryRow {
  countryCode: string;
  countryUrl: string;
  longest: ListedEvent[];
  shortest: ListedEvent[];
  longestCharCount: number | null;
  shortestCharCount: number | null;
}

export interface SeriesBlock {
  title: string;
  isUnknown: boolean;
  countries: CountryRow[];
  globalLongest: ListedEvent[];
  globalShortest: ListedEvent[];
  globalLongestCharCount: number | null;
  globalShortestCharCount: number | null;
}
