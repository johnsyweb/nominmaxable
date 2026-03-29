import { describe, expect, it } from "vitest";
import { isQuotaExceededError } from "./cache";

describe("isQuotaExceededError", () => {
  it("is true for DOMException QuotaExceededError", () => {
    const ex = new DOMException("The quota has been exceeded.", "QuotaExceededError");
    expect(isQuotaExceededError(ex)).toBe(true);
  });

  it("is false for other DOMException names", () => {
    const ex = new DOMException("nope", "NotFoundError");
    expect(isQuotaExceededError(ex)).toBe(false);
  });

  it("is false when message mentions quota but Error is not QuotaExceededError", () => {
    expect(isQuotaExceededError(new Error("The quota has been exceeded."))).toBe(false);
  });
});
