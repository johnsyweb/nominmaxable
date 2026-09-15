import { describe, expect, it } from "vitest";
import { buildEventPageUrl, buildOpenStreetMapUrl } from "./eventCardUrls";

describe("buildEventPageUrl", () => {
  it("joins country site and eventname with a trailing slash", () => {
    expect(buildEventPageUrl("https://www.parkrun.com.au", "albertmelbourne")).toBe(
      "https://www.parkrun.com.au/albertmelbourne/"
    );
    expect(buildEventPageUrl("https://www.parkrun.com.au/", "albertmelbourne")).toBe(
      "https://www.parkrun.com.au/albertmelbourne/"
    );
  });

  it("returns null when the site or eventname is missing", () => {
    expect(buildEventPageUrl("", "albertmelbourne")).toBeNull();
    expect(buildEventPageUrl("https://www.parkrun.com.au", "")).toBeNull();
    expect(buildEventPageUrl("https://www.parkrun.com.au", "  ")).toBeNull();
  });
});

describe("buildOpenStreetMapUrl", () => {
  it("builds a marker link at zoom 15 by default", () => {
    expect(buildOpenStreetMapUrl(-37.843521, 144.96312)).toBe(
      "https://www.openstreetmap.org/?mlat=-37.843521&mlon=144.96312#map=15/-37.843521/144.96312"
    );
  });
});
