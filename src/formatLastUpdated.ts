export function formatLastUpdated(fetchedAt: number): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fetchedAt));
}
