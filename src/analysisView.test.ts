import { describe, expect, it } from "vitest";
import { analysisViewFromSearchParams, applyAnalysisViewToSearchParams } from "./analysisView";

describe("analysisViewFromSearchParams", () => {
  it("defaults to names", () => {
    expect(analysisViewFromSearchParams(new URLSearchParams(""))).toBe("names");
    expect(analysisViewFromSearchParams(new URLSearchParams("view=names"))).toBe("names");
    expect(analysisViewFromSearchParams(new URLSearchParams("view=other"))).toBe("names");
  });

  it("reads isolation from the view query parameter", () => {
    expect(analysisViewFromSearchParams(new URLSearchParams("view=isolation"))).toBe("isolation");
    expect(analysisViewFromSearchParams(new URLSearchParams("view=Isolation"))).toBe("isolation");
  });
});

describe("applyAnalysisViewToSearchParams", () => {
  it("sets view=isolation and clears it for names", () => {
    const params = new URLSearchParams("foo=1");
    applyAnalysisViewToSearchParams(params, "isolation");
    expect(params.get("view")).toBe("isolation");
    expect(params.get("foo")).toBe("1");
    applyAnalysisViewToSearchParams(params, "names");
    expect(params.has("view")).toBe(false);
    expect(params.get("foo")).toBe("1");
  });
});
