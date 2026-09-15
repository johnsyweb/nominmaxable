import { describe, expect, it } from "vitest";
import {
  coordinatesFromFeature,
  formatIsolationDistanceKm,
  haversineKm,
} from "./isolationGeometry";
import type { Feature } from "./types";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(151.2093, -33.8688, 151.2093, -33.8688)).toBe(0);
  });

  it("matches a known Sydney–Melbourne distance within 1%", () => {
    // Approx lon/lat for Sydney and Melbourne CBDs
    const km = haversineKm(151.2093, -33.8688, 144.9631, -37.8136);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(730);
  });
});

describe("coordinatesFromFeature", () => {
  it("reads lon/lat from a Point geometry", () => {
    const feature: Feature = {
      geometry: { type: "Point", coordinates: [151.2, -33.9] },
      properties: {},
    };
    expect(coordinatesFromFeature(feature)).toEqual({ lon: 151.2, lat: -33.9 });
  });

  it("returns null when geometry is missing or not a Point", () => {
    expect(coordinatesFromFeature({})).toBeNull();
    expect(
      coordinatesFromFeature({
        geometry: { type: "Polygon", coordinates: [151.2, -33.9] },
      })
    ).toBeNull();
    expect(
      coordinatesFromFeature({
        geometry: { type: "Point", coordinates: ["x", -33.9] },
      })
    ).toBeNull();
  });
});

describe("formatIsolationDistanceKm", () => {
  it("formats to one decimal place with km unit", () => {
    expect(formatIsolationDistanceKm(142.34)).toBe("142.3 km");
    expect(formatIsolationDistanceKm(0)).toBe("0.0 km");
  });
});
