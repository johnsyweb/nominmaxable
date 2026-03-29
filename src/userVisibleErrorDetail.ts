export function userVisibleErrorDetail(error: unknown): string | null {
  if (error instanceof Error) {
    const m = error.message.trim();
    return m.length > 0 ? m : null;
  }
  if (typeof error === "string") {
    const m = error.trim();
    return m.length > 0 ? m : null;
  }
  return null;
}
