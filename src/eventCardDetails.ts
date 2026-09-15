import {
  classifySeriesId,
  normalisedCountryCode,
  normalisedEventLongName,
  normaliseCountrySiteUrl,
} from "./analytics";
import { coordinatesFromFeature } from "./isolationGeometry";
import { buildEventPageUrl, buildOpenStreetMapUrl } from "./eventCardUrls";
import { getSeriesHeading } from "./seriesLabels";
import type { CountryInfo, Feature, ParkrunEventsDocument } from "./types";

export interface EventCardDetails {
  title: string;
  shortName: string | null;
  localisedName: string | null;
  location: string | null;
  seriesLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  eventPageUrl: string | null;
  mapUrl: string | null;
}

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function indexFeaturesByEventname(doc: ParkrunEventsDocument): Map<string, Feature> {
  const index = new Map<string, Feature>();
  for (const feature of doc.events.features) {
    const eventname = optionalTrimmedString(feature.properties?.eventname);
    if (!eventname) {
      continue;
    }
    index.set(eventname, feature);
  }
  return index;
}

export function buildEventCardDetails(
  feature: Feature,
  countries: Record<string, CountryInfo>
): EventCardDetails | null {
  const props = feature.properties ?? {};
  const title = normalisedEventLongName(props.EventLongName);
  if (!title) {
    return null;
  }
  const shortName = optionalTrimmedString(props.EventShortName);
  const localisedRaw = optionalTrimmedString(props.LocalisedEventLongName);
  const localisedName = localisedRaw && localisedRaw !== title ? localisedRaw : null;
  const location = optionalTrimmedString(props.EventLocation);
  const classified = classifySeriesId(props.seriesid);
  const seriesLabel = classified === "unknown" ? null : getSeriesHeading(classified);
  const coords = coordinatesFromFeature(feature);
  const countryCode = normalisedCountryCode(props.countrycode);
  const countryUrl = countryCode ? normaliseCountrySiteUrl(countries[countryCode]?.url) : "";
  const eventname = optionalTrimmedString(props.eventname);
  const eventPageUrl = eventname && countryUrl ? buildEventPageUrl(countryUrl, eventname) : null;

  return {
    title,
    shortName,
    localisedName,
    location,
    seriesLabel,
    latitude: coords?.lat ?? null,
    longitude: coords?.lon ?? null,
    eventPageUrl,
    mapUrl: coords ? buildOpenStreetMapUrl(coords.lat, coords.lon) : null,
  };
}
