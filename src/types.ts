export interface CountryInfo {
  url: string;
}

export interface ParkrunEventsDocument {
  countries: Record<string, CountryInfo>;
  events: {
    features: Feature[];
  };
}

export interface Feature {
  properties?: Record<string, unknown>;
}

export interface CountryRow {
  countryCode: string;
  countryUrl: string;
  longest: string[];
  shortest: string[];
  longestCharCount: number | null;
  shortestCharCount: number | null;
}

export interface SeriesBlock {
  title: string;
  isUnknown: boolean;
  countries: CountryRow[];
  globalLongest: string[];
  globalShortest: string[];
  globalLongestCharCount: number | null;
  globalShortestCharCount: number | null;
}
