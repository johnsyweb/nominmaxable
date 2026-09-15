import { describe, expect, it } from "vitest";
import {
  flagEmojiFromIso,
  parkrunTldFromCountryUrl,
  presentationForParkrunCountry,
  tldToIso,
} from "./countryFlag";

describe("parkrunTldFromCountryUrl", () => {
  it("extracts the country TLD from parkrun hostnames", () => {
    expect(parkrunTldFromCountryUrl("https://www.parkrun.com.au/")).toBe("au");
    expect(parkrunTldFromCountryUrl("www.parkrun.org.uk")).toBe("uk");
    expect(parkrunTldFromCountryUrl("https://www.parkrun.co.za")).toBe("za");
    expect(parkrunTldFromCountryUrl("www.parkrun.ca")).toBe("ca");
  });

  it("returns null for empty or non-parkrun URLs", () => {
    expect(parkrunTldFromCountryUrl("")).toBeNull();
    expect(parkrunTldFromCountryUrl("https://example.com")).toBeNull();
  });
});

describe("tldToIso and flagEmojiFromIso", () => {
  it("maps uk to gb and builds regional-indicator flags", () => {
    expect(tldToIso("uk")).toBe("gb");
    expect(tldToIso("au")).toBe("au");
    expect(flagEmojiFromIso("au")).toBe("🇦🇺");
    expect(flagEmojiFromIso("gb")).toBe("🇬🇧");
  });
});

describe("presentationForParkrunCountry", () => {
  it("returns a flag and accessible name when the country URL is known", () => {
    const p = presentationForParkrunCountry("3", "https://www.parkrun.com.au/");
    expect(p.flag).toBe("🇦🇺");
    expect(p.accessibleName.toLowerCase()).toContain("australia");
  });

  it("falls back to the numeric code when there is no URL", () => {
    const p = presentationForParkrunCountry("99", "");
    expect(p.flag).toBe("");
    expect(p.accessibleName).toBe("Country 99");
  });
});
