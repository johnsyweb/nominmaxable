import { describe, expect, it } from "vitest";
import { userVisibleErrorDetail } from "./userVisibleErrorDetail";

describe("userVisibleErrorDetail", () => {
  it("returns trimmed Error.message when non-empty", () => {
    expect(userVisibleErrorDetail(new Error("  HTTP 418  "))).toBe("HTTP 418");
  });

  it("returns null for Error with blank message", () => {
    expect(userVisibleErrorDetail(new Error("   "))).toBeNull();
    expect(userVisibleErrorDetail(new Error(""))).toBeNull();
  });

  it("returns trimmed string throws", () => {
    expect(userVisibleErrorDetail("  boom  ")).toBe("boom");
  });

  it("returns null for blank string", () => {
    expect(userVisibleErrorDetail("  \n  ")).toBeNull();
  });

  it("returns null for non-string non-Error values", () => {
    expect(userVisibleErrorDetail(null)).toBeNull();
    expect(userVisibleErrorDetail(undefined)).toBeNull();
    expect(userVisibleErrorDetail(404)).toBeNull();
  });
});
