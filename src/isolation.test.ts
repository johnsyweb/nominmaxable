import { describe, expect, it } from "vitest";
import { createNameCollator } from "./analytics";
import { computeIsolationSeriesBlocks } from "./isolation";
import type { ParkrunEventsDocument } from "./types";

const collator = createNameCollator();

function point(lon: number, lat: number) {
  return { type: "Point", coordinates: [lon, lat] };
}

function feature(
  name: string,
  countrycode: number,
  seriesid: number,
  lon: number,
  lat: number,
  eventname: string
) {
  return {
    geometry: point(lon, lat),
    properties: {
      EventLongName: name,
      countrycode,
      seriesid,
      eventname,
    },
  };
}

describe("computeIsolationSeriesBlocks", () => {
  it("finds per-country and global isolation extremes within a series", () => {
    const doc: ParkrunEventsDocument = {
      countries: {
        3: { url: "www.parkrun.com.au" },
        97: { url: "www.parkrun.org.uk" },
      },
      events: {
        features: [
          feature("Near Alpha", 3, 1, 0, 0, "near-alpha"),
          feature("Near Beta", 3, 1, 0.01, 0, "near-beta"),
          feature("Remote Gamma", 97, 1, 20, 0, "remote-gamma"),
          feature("Junior Only", 3, 2, 0, 0, "junior-only"),
          feature("Junior Pair", 3, 2, 1, 0, "junior-pair"),
          {
            properties: {
              EventLongName: "No Geometry",
              countrycode: 3,
              seriesid: 1,
              eventname: "no-geo",
            },
          },
        ],
      },
    };

    const blocks = computeIsolationSeriesBlocks(doc, collator);
    expect(blocks.map((b) => b.title)).toEqual([
      "Series 1 — parkrun (5 km)",
      "Series 2 — junior parkrun (2 km)",
    ]);

    const series1 = blocks[0];
    const au = series1.countries.find((c) => c.countryCode === "3");
    const uk = series1.countries.find((c) => c.countryCode === "97");
    expect(au).toBeDefined();
    expect(uk).toBeDefined();

    // AU pair are each other's nearest; Remote Gamma is far from both
    expect(uk!.longest.map((e) => e.name)).toEqual(["Remote Gamma"]);
    expect(uk!.longest[0].neighbourName).toMatch(/Near/);
    expect(uk!.longestDistanceKm).toBeGreaterThan(1000);

    expect(au!.shortestDistanceKm).toBeLessThan(5);
    expect(au!.shortest.length).toBeGreaterThanOrEqual(1);

    expect(series1.globalLongest.map((e) => e.name)).toEqual(["Remote Gamma"]);
    expect(series1.globalShortestDistanceKm).toBeLessThan(5);

    // Events without geometry are omitted
    const allNames = series1.countries.flatMap((c) => [
      ...c.longest.map((e) => e.name),
      ...c.shortest.map((e) => e.name),
    ]);
    expect(allNames).not.toContain("No Geometry");
  });

  it("lists a mutual closest pair once for shortest isolation", () => {
    const doc: ParkrunEventsDocument = {
      countries: { 1: { url: null } },
      events: {
        features: [
          feature("Close A", 1, 1, 0, 0, "close-a"),
          feature("Close B", 1, 1, 1, 0, "close-b"),
          feature("Far C", 1, 1, 100, 0, "far-c"),
        ],
      },
    };
    const blocks = computeIsolationSeriesBlocks(doc, collator);
    const row = blocks[0].countries[0];
    expect(row.shortest).toHaveLength(1);
    expect([row.shortest[0].name, row.shortest[0].neighbourName].sort()).toEqual([
      "Close A",
      "Close B",
    ]);
    expect(row.longest.map((e) => e.name)).toEqual(["Far C"]);
    expect(row.longestDistanceKm!).toBeGreaterThan(row.shortestDistanceKm!);
  });
});
