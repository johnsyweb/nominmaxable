import {
  analysisViewFromSearchParams,
  applyAnalysisViewToSearchParams,
  type AnalysisView,
} from "./analysisView";
import { computeSeriesBlocks, createNameCollator, parseParkrunDocument } from "./analytics";
import { isFresh, isQuotaExceededError, readCache, writeCache } from "./cache";
import { CACHE_MS, EVENTS_JSON_URL } from "./constants";
import { buildEventCardDetails, indexFeaturesByEventname } from "./eventCardDetails";
import {
  createEventCardPopoverController,
  type EventCardPopoverController,
} from "./eventCardPopover";
import { formatLastUpdated } from "./formatLastUpdated";
import { computeIsolationSeriesBlocks } from "./isolation";
import { renderSeriesBlocks } from "./render";
import { renderIsolationSeriesBlocks } from "./renderIsolation";
import type { ParkrunEventsDocument } from "./types";
import { userVisibleErrorDetail } from "./userVisibleErrorDetail";

const INTRO_NAMES =
  "Longest and shortest full event name strings (by character count) from parkrun's public event listing, grouped by event series and country.";
const INTRO_ISOLATION =
  "Longest and shortest distances to the nearest other event in the same series (haversine, kilometres), grouped by event series and country. Events without coordinates are omitted.";

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing #${id}`);
  }
  return el;
}

let politeClearTimer: number | undefined;
let currentDoc: ParkrunEventsDocument | null = null;
let analysisView: AnalysisView = analysisViewFromSearchParams(
  new URLSearchParams(window.location.search)
);
let eventCardPopover: EventCardPopoverController | null = null;

function announcePolite(message: string): void {
  const el = requireElement("sr-polite");
  window.clearTimeout(politeClearTimer);
  el.textContent = "";
  window.requestAnimationFrame(() => {
    el.textContent = message;
    politeClearTimer = window.setTimeout(() => {
      el.textContent = "";
    }, 4000);
  });
}

async function fetchEventsBody(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(EVENTS_JSON_URL);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err), { cause: err });
  }
  if (!res.ok) {
    const statusText = res.statusText?.trim();
    throw new Error(statusText ? `HTTP ${res.status} (${statusText})` : `HTTP ${res.status}`);
  }
  try {
    return await res.text();
  } catch (err) {
    const detail = userVisibleErrorDetail(err);
    const msg = detail
      ? `Could not read response body: ${detail}`
      : "Could not read response body.";
    throw new Error(msg, { cause: err });
  }
}

function setBusy(main: HTMLElement, busy: boolean): void {
  main.setAttribute("aria-busy", busy ? "true" : "false");
}

function setLastUpdated(text: string): void {
  requireElement("last-updated").textContent = text;
}

function setStaleVisible(visible: boolean): void {
  requireElement("stale-banner").hidden = !visible;
}

function setErrorBannerContent(headline: string, detail: string | null): void {
  const el = requireElement("error-banner");
  el.replaceChildren();
  const p1 = document.createElement("p");
  p1.textContent = headline;
  el.appendChild(p1);
  if (detail) {
    const p2 = document.createElement("p");
    p2.className = "banner__detail";
    p2.textContent = `Details: ${detail}`;
    el.appendChild(p2);
  }
}

function setErrorVisible(visible: false): void;
function setErrorVisible(visible: true, headline: string, detail?: string | null): void;
function setErrorVisible(visible: boolean, headline?: string, detail?: string | null): void {
  const el = requireElement("error-banner");
  el.hidden = !visible;
  if (!visible) {
    el.replaceChildren();
    return;
  }
  if (headline !== undefined) {
    setErrorBannerContent(headline, detail ?? null);
  }
}

function updateViewSwitchUi(): void {
  const namesBtn = requireElement("view-names");
  const isolationBtn = requireElement("view-isolation");
  namesBtn.setAttribute("aria-pressed", analysisView === "names" ? "true" : "false");
  isolationBtn.setAttribute("aria-pressed", analysisView === "isolation" ? "true" : "false");
  requireElement("intro").textContent = analysisView === "names" ? INTRO_NAMES : INTRO_ISOLATION;
}

function recreateEventCardPopover(doc: ParkrunEventsDocument): EventCardPopoverController {
  eventCardPopover?.destroy();
  const index = indexFeaturesByEventname(doc);
  eventCardPopover = createEventCardPopoverController((eventname) => {
    const feature = index.get(eventname);
    if (!feature) {
      return null;
    }
    return buildEventCardDetails(feature, doc.countries);
  });
  return eventCardPopover;
}

function renderAnalysisResults(): void {
  const results = requireElement("results");
  eventCardPopover?.dismiss();
  if (!currentDoc) {
    eventCardPopover?.destroy();
    eventCardPopover = null;
    renderSeriesBlocks(results, []);
    return;
  }
  const popover = recreateEventCardPopover(currentDoc);
  const collator = createNameCollator();
  if (analysisView === "names") {
    renderSeriesBlocks(results, computeSeriesBlocks(currentDoc, collator), popover);
  } else {
    renderIsolationSeriesBlocks(
      results,
      computeIsolationSeriesBlocks(currentDoc, collator),
      popover
    );
  }
  updateViewSwitchUi();
}

function renderFromBody(
  body: string,
  context: { stale: boolean; fetchedAt: number; couldNotPersistLocally?: boolean }
): void {
  try {
    currentDoc = parseParkrunDocument(body);
    renderAnalysisResults();
    setLastUpdated(
      context.stale
        ? `Showing cached data from ${formatLastUpdated(context.fetchedAt)} (may be out of date)`
        : context.couldNotPersistLocally
          ? `Last updated ${formatLastUpdated(context.fetchedAt)} — not saved locally (browser storage for this site is full)`
          : `Last updated ${formatLastUpdated(context.fetchedAt)}`
    );
    setStaleVisible(context.stale);
    setErrorVisible(false);
  } catch (err) {
    currentDoc = null;
    clearResults();
    setStaleVisible(false);
    const detail = userVisibleErrorDetail(err);
    setErrorVisible(
      true,
      "Could not read event data. Use Refresh data to download a fresh copy.",
      detail
    );
  }
}

function clearResults(): void {
  currentDoc = null;
  eventCardPopover?.destroy();
  eventCardPopover = null;
  renderSeriesBlocks(requireElement("results"), []);
  setLastUpdated("");
}

async function runFetch(cached: ReturnType<typeof readCache>): Promise<void> {
  const main = requireElement("content");
  setBusy(main, true);
  announcePolite("Loading event data");
  try {
    const body = await fetchEventsBody();
    const fetchedAt = Date.now();
    let couldNotPersistLocally = false;
    try {
      writeCache({ fetchedAt, body });
    } catch (cacheErr) {
      if (isQuotaExceededError(cacheErr)) {
        couldNotPersistLocally = true;
        announcePolite(
          "Event data loaded, but your browser could not save a local copy because storage for this site is full."
        );
      } else {
        throw cacheErr;
      }
    }
    renderFromBody(body, { stale: false, fetchedAt, couldNotPersistLocally });
  } catch (err) {
    if (cached?.body) {
      renderFromBody(cached.body, { stale: true, fetchedAt: cached.fetchedAt });
    } else {
      clearResults();
      setStaleVisible(false);
      const detail = userVisibleErrorDetail(err);
      setErrorVisible(
        true,
        "Could not load event data. Check your connection, then use Refresh data to try again.",
        detail
      );
    }
  } finally {
    setBusy(main, false);
  }
}

async function bootstrap(): Promise<void> {
  const cached = readCache();
  const now = Date.now();
  if (cached && isFresh(cached, now, CACHE_MS)) {
    renderFromBody(cached.body, { stale: false, fetchedAt: cached.fetchedAt });
    return;
  }
  await runFetch(cached);
}

function syncAnalysisViewToUrl(view: AnalysisView): void {
  const url = new URL(window.location.href);
  applyAnalysisViewToSearchParams(url.searchParams, view);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    history.pushState({ analysisView: view }, "", next);
  }
}

function setAnalysisView(view: AnalysisView, options?: { syncUrl?: boolean }): void {
  if (analysisView === view) {
    return;
  }
  analysisView = view;
  if (options?.syncUrl !== false) {
    syncAnalysisViewToUrl(view);
  }
  renderAnalysisResults();
  announcePolite(
    view === "names"
      ? "Showing full event name length analysis"
      : "Showing nearest-neighbour isolation analysis"
  );
}

function init(): void {
  const refresh = requireElement("btn-refresh");
  refresh.addEventListener("click", () => {
    void runFetch(readCache());
  });

  requireElement("view-names").addEventListener("click", () => {
    setAnalysisView("names");
  });
  requireElement("view-isolation").addEventListener("click", () => {
    setAnalysisView("isolation");
  });

  window.addEventListener("popstate", () => {
    const fromUrl = analysisViewFromSearchParams(new URLSearchParams(window.location.search));
    setAnalysisView(fromUrl, { syncUrl: false });
  });

  updateViewSwitchUi();
  void bootstrap();
}

init();
