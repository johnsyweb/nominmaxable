import { describe, expect, it } from "vitest";
import { createNameCollator } from "./analytics";
import type { CountryRow, SeriesBlock } from "./types";
import {
  compareCountryRowsByColumn,
  compareGlobalRowsByColumn,
  globalRowsFromBlock,
  sortCountryRows,
  sortGlobalRows,
} from "./tableSort";

const collator = createNameCollator();

function row(partial: Partial<CountryRow> & Pick<CountryRow, "countryCode">): CountryRow {
  return {
    countryUrl: "",
    longest: [],
    shortest: [],
    longestCharCount: null,
    shortestCharCount: null,
    ...partial,
  };
}

describe("compareCountryRowsByColumn", () => {
  it("sorts by country code numerically when column is country", () => {
    const a = row({ countryCode: "10" });
    const b = row({ countryCode: "2" });
    expect(compareCountryRowsByColumn(a, b, "country", collator)).toBeGreaterThan(0);
    expect(compareCountryRowsByColumn(b, a, "country", collator)).toBeLessThan(0);
  });

  it("sorts by longest character count", () => {
    const a = row({ countryCode: "1", longestCharCount: 5 });
    const b = row({ countryCode: "2", longestCharCount: 20 });
    expect(compareCountryRowsByColumn(a, b, "longestCount", collator)).toBeLessThan(0);
  });
});

describe("sortCountryRows", () => {
  it("reverses order when direction is -1", () => {
    const rows = [row({ countryCode: "1" }), row({ countryCode: "3" }), row({ countryCode: "2" })];
    const asc = sortCountryRows(rows, "country", 1, collator).map((r) => r.countryCode);
    const desc = sortCountryRows(rows, "country", -1, collator).map((r) => r.countryCode);
    expect(asc).toEqual(["1", "2", "3"]);
    expect(desc).toEqual(["3", "2", "1"]);
  });
});

describe("globalRowsFromBlock and sortGlobalRows", () => {
  it("orders global rows by measure ascending as Longest then Shortest", () => {
    const block: SeriesBlock = {
      title: "Test",
      isUnknown: false,
      countries: [],
      globalLongest: ["aaa"],
      globalShortest: ["b"],
      globalLongestCharCount: 3,
      globalShortestCharCount: 1,
    };
    const g = globalRowsFromBlock(block);
    const sorted = sortGlobalRows(g, "measure", 1, collator);
    expect(sorted[0].label).toContain("Longest");
    expect(sorted[1].label).toContain("Shortest");
  });

  it("sorts global rows by character count", () => {
    const block: SeriesBlock = {
      title: "Test",
      isUnknown: false,
      countries: [],
      globalLongest: ["long"],
      globalShortest: ["x"],
      globalLongestCharCount: 4,
      globalShortestCharCount: 1,
    };
    const g = globalRowsFromBlock(block);
    const asc = sortGlobalRows(g, "count", 1, collator);
    expect(asc[0].charCount).toBe(1);
    expect(asc[1].charCount).toBe(4);
  });
});

describe("compareGlobalRowsByColumn", () => {
  it("compares first EventLongName in names column", () => {
    const a = { label: "L", names: ["zebra"], charCount: 1 };
    const b = { label: "S", names: ["apple"], charCount: 1 };
    expect(compareGlobalRowsByColumn(a, b, "names", collator)).toBeGreaterThan(0);
  });
});
