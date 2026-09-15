export type AnalysisView = "names" | "isolation";

export function analysisViewFromSearchParams(params: URLSearchParams): AnalysisView {
  const raw = params.get("view")?.trim().toLowerCase();
  if (raw === "isolation") {
    return "isolation";
  }
  return "names";
}

export function applyAnalysisViewToSearchParams(params: URLSearchParams, view: AnalysisView): void {
  if (view === "isolation") {
    params.set("view", "isolation");
  } else {
    params.delete("view");
  }
}
