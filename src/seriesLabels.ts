const LABELS: Record<number, string> = {
  1: "parkrun (5 km)",
  2: "junior parkrun (2 km)",
};

export const UNKNOWN_SERIES_HEADING = "Unknown series";

export function getSeriesHeading(seriesId: number): string {
  const label = LABELS[seriesId];
  return label ? `Series ${seriesId} — ${label}` : `Series ${seriesId}`;
}
