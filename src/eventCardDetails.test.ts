import { describe, expect, it } from "vitest";
import { buildEventCardDetails, indexFeaturesByEventname } from "./eventCardDetails";
import type { Feature, ParkrunEventsDocument } from "./types";

function feature(partial: {
  eventname?: string;
  EventLongName?: string;
  EventShortName?: string;
  LocalisedEventLongName?: string | null;
  EventLocation?: string;
  countrycode?: number;
  seriesid?: number;
  lon?: number;
  lat?: number;
}): Feature {
  const geometry =
    partial.lon !== undefined && partial.lat !== undefined
      ? { type: "Point", coordinates: [partial.lon, partial.lat] }
      : undefined;
  return {
    geometry,
    properties: {
      eventname: partial.eventname,
      EventLongName: partial.EventLongName,
      EventShortName: partial.EventShortName,
      LocalisedEventLongName: partial.LocalisedEventLongName,
      EventLocation: partial.EventLocation,
      countrycode: partial.countrycode ?? 3,
      seriesid: partial.seriesid ?? 1,
    },
  };
}

describe("indexFeaturesByEventname", () => {
  it("indexes features that have a non-empty eventname", () => {
    const doc: ParkrunEventsDocument = {
      countries: { 3: { url: "www.parkrun.com.au" } },
      events: {
        features: [
          feature({ eventname: "albertmelbourne", EventLongName: "Albert parkrun, Melbourne" }),
          feature({ EventLongName: "No slug" }),
          feature({ eventname: "  ", EventLongName: "Blank slug" }),
        ],
      },
    };
    const index = indexFeaturesByEventname(doc);
    expect(index.size).toBe(1);
    expect(index.get("albertmelbourne")?.properties?.EventLongName).toBe(
      "Albert parkrun, Melbourne"
    );
  });
});

describe("buildEventCardDetails", () => {
  const countries = { 3: { url: "www.parkrun.com.au" } };

  it("builds a curated card with map and event links", () => {
    const details = buildEventCardDetails(
      feature({
        eventname: "albertmelbourne",
        EventLongName: "Albert parkrun, Melbourne",
        EventShortName: "Albert Melbourne",
        LocalisedEventLongName: "Albert parkrun, Melbourne",
        EventLocation: "Albert Park",
        lon: 144.96312,
        lat: -37.843521,
      }),
      countries
    );
    expect(details).toEqual({
      title: "Albert parkrun, Melbourne",
      shortName: "Albert Melbourne",
      localisedName: null,
      location: "Albert Park",
      seriesLabel: "Series 1 — parkrun (5 km)",
      latitude: -37.843521,
      longitude: 144.96312,
      eventPageUrl: "https://www.parkrun.com.au/albertmelbourne/",
      mapUrl:
        "https://www.openstreetmap.org/?mlat=-37.843521&mlon=144.96312#map=15/-37.843521/144.96312",
    });
  });

  it("omits map and coords when geometry is missing", () => {
    const details = buildEventCardDetails(
      feature({
        eventname: "weipa",
        EventLongName: "Weipa parkrun",
        EventShortName: "Weipa",
      }),
      countries
    );
    expect(details?.mapUrl).toBeNull();
    expect(details?.latitude).toBeNull();
    expect(details?.longitude).toBeNull();
    expect(details?.eventPageUrl).toBe("https://www.parkrun.com.au/weipa/");
  });

  it("includes localised name only when it differs from the full name", () => {
    const details = buildEventCardDetails(
      feature({
        eventname: "example",
        EventLongName: "Example parkrun",
        LocalisedEventLongName: "Exemple parkrun",
      }),
      countries
    );
    expect(details?.localisedName).toBe("Exemple parkrun");
  });
});
