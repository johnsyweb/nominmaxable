import { describe, expect, it } from "vitest";
import {
  charCountForExtremeNames,
  classifySeriesId,
  compareCountryCodes,
  computeSeriesBlocks,
  createNameCollator,
  extremeNames,
  normalisedCountryCode,
  normalisedEventLongName,
  parseParkrunDocument,
} from "./analytics";
import type { ParkrunEventsDocument } from "./types";

const collator = createNameCollator();

describe("normalisedEventLongName", () => {
  it("trims and accepts non-empty strings", () => {
    expect(normalisedEventLongName("  abc  ")).toBe("abc");
  });

  it("rejects empty, whitespace-only, and non-strings", () => {
    expect(normalisedEventLongName("   ")).toBeNull();
    expect(normalisedEventLongName("")).toBeNull();
    expect(normalisedEventLongName(null)).toBeNull();
    expect(normalisedEventLongName(12)).toBeNull();
  });
});

describe("normalisedCountryCode", () => {
  it("accepts finite numbers and non-empty strings", () => {
    expect(normalisedCountryCode(97)).toBe("97");
    expect(normalisedCountryCode("  3 ")).toBe("3");
  });

  it("rejects empty values", () => {
    expect(normalisedCountryCode("")).toBeNull();
    expect(normalisedCountryCode("   ")).toBeNull();
    expect(normalisedCountryCode(null)).toBeNull();
  });
});

describe("classifySeriesId", () => {
  it("accepts finite integers", () => {
    expect(classifySeriesId(1)).toBe(1);
    expect(classifySeriesId(2)).toBe(2);
  });

  it("accepts integer-like strings", () => {
    expect(classifySeriesId("2")).toBe(2);
  });

  it("treats non-integers as unknown", () => {
    expect(classifySeriesId(1.2)).toBe("unknown");
    expect(classifySeriesId(NaN)).toBe("unknown");
    expect(classifySeriesId(Infinity)).toBe("unknown");
  });

  it("treats missing or invalid values as unknown", () => {
    expect(classifySeriesId(undefined)).toBe("unknown");
    expect(classifySeriesId(null)).toBe("unknown");
    expect(classifySeriesId("")).toBe("unknown");
    expect(classifySeriesId("x")).toBe("unknown");
  });
});

describe("compareCountryCodes", () => {
  it("sorts integer-like codes numerically", () => {
    expect(compareCountryCodes("2", "10", collator)).toBeLessThan(0);
    expect(compareCountryCodes("10", "2", collator)).toBeGreaterThan(0);
  });

  it("falls back to locale collation", () => {
    const a = "aa";
    const b = "ab";
    expect(compareCountryCodes(a, b, collator)).toBe(collator.compare(a, b));
  });
});

describe("charCountForExtremeNames", () => {
  it("returns null for an empty list", () => {
    expect(charCountForExtremeNames([])).toBeNull();
  });

  it("returns the string length of the first entry", () => {
    expect(charCountForExtremeNames(["hello"])).toBe(5);
    expect(charCountForExtremeNames(["aa", "bb"])).toBe(2);
  });
});

describe("extremeNames", () => {
  it("returns sorted unique tie names for longest", () => {
    const names = new Set(["aa", "bbb", "ccc", "bbb"]);
    expect(extremeNames(names, "longest", collator)).toEqual(["bbb", "ccc"]);
  });

  it("returns sorted unique tie names for shortest", () => {
    const names = new Set(["alpha", "beta", "gamma"]);
    expect(extremeNames(names, "shortest", collator)).toEqual(["beta"]);
  });
});

describe("parseParkrunDocument", () => {
  it("parses a minimal valid document", () => {
    const body = JSON.stringify({
      countries: { 1: { url: "https://example.com" } },
      events: { features: [] },
    });
    const doc = parseParkrunDocument(body);
    expect(doc.countries["1"].url).toBe("https://example.com");
    expect(doc.events.features).toEqual([]);
  });

  it("throws on invalid JSON shape", () => {
    expect(() => parseParkrunDocument("{}")).toThrow();
    expect(() => parseParkrunDocument("not json")).toThrow();
  });
});

function sampleDoc(): ParkrunEventsDocument {
  return {
    countries: {
      1: { url: "https://www.parkrun.com.au/" },
      2: { url: "https://www.parkrun.org.uk/" },
    },
    events: {
      features: [
        {
          properties: {
            EventLongName: "Short",
            countrycode: 1,
            seriesid: 1,
          },
        },
        {
          properties: {
            EventLongName: "Much longer name",
            countrycode: 1,
            seriesid: 1,
          },
        },
        {
          properties: {
            EventLongName: "Tiny",
            countrycode: 2,
            seriesid: 1,
          },
        },
        {
          properties: {
            EventLongName: "Junior long title here",
            countrycode: 1,
            seriesid: 2,
          },
        },
        {
          properties: {
            EventLongName: "Odd",
            countrycode: 1,
            seriesid: "nope",
          },
        },
      ],
    },
  };
}

describe("computeSeriesBlocks", () => {
  it("groups by series, orders series numerically, and places unknown last", () => {
    const blocks = computeSeriesBlocks(sampleDoc(), collator);
    expect(blocks.map((b) => b.title)).toEqual([
      "Series 1 — parkrun (5 km)",
      "Series 2 — junior parkrun (2 km)",
      "Unknown series",
    ]);
  });

  it("computes per-country and global extremes inside each series", () => {
    const blocks = computeSeriesBlocks(sampleDoc(), collator);
    const series1 = blocks[0];
    expect(series1.globalShortest).toEqual(["Tiny"]);
    expect(series1.globalLongest).toEqual(["Much longer name"]);

    const country1 = series1.countries.find((c) => c.countryCode === "1");
    expect(country1?.shortest).toEqual(["Short"]);
    expect(country1?.longest).toEqual(["Much longer name"]);
    expect(series1.globalLongestCharCount).toBe("Much longer name".length);
    expect(series1.globalShortestCharCount).toBe("Tiny".length);
    expect(country1?.longestCharCount).toBe("Much longer name".length);
    expect(country1?.shortestCharCount).toBe("Short".length);
  });

  it("omits unknown series when empty", () => {
    const doc: ParkrunEventsDocument = {
      countries: { 1: { url: "https://example.com" } },
      events: {
        features: [
          {
            properties: {
              EventLongName: "Only",
              countrycode: 1,
              seriesid: 1,
            },
          },
        ],
      },
    };
    const blocks = computeSeriesBlocks(doc, collator);
    expect(blocks.every((b) => !b.isUnknown)).toBe(true);
  });
});
