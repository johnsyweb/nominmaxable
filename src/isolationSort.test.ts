import { describe, expect, it } from "vitest";
import { createNameCollator } from "./analytics";
import type { IsolationCountryRow } from "./isolation";
import { compareIsolationCountryRowsByColumn, sortIsolationCountryRows } from "./isolationSort";

const collator = createNameCollator();

function row(
  partial: Partial<IsolationCountryRow> & Pick<IsolationCountryRow, "countryCode">
): IsolationCountryRow {
  return {
    countryUrl: "",
    longest: [],
    shortest: [],
    longestDistanceKm: null,
    shortestDistanceKm: null,
    ...partial,
  };
}

describe("sortIsolationCountryRows", () => {
  it("sorts by longest isolation distance", () => {
    const rows = [
      row({ countryCode: "1", longestDistanceKm: 10 }),
      row({ countryCode: "2", longestDistanceKm: 100 }),
    ];
    const sorted = sortIsolationCountryRows(rows, "longestDistance", 1, collator);
    expect(sorted.map((r) => r.countryCode)).toEqual(["1", "2"]);
    expect(
      compareIsolationCountryRowsByColumn(rows[0], rows[1], "longestDistance", collator)
    ).toBeLessThan(0);
  });
});
