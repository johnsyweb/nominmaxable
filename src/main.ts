import { computeSeriesBlocks, createNameCollator, parseParkrunDocument } from "./analytics";
import { isFresh, readCache, writeCache } from "./cache";
import { CACHE_MS, EVENTS_JSON_URL } from "./constants";
import { formatLastUpdated } from "./formatLastUpdated";
import { renderSeriesBlocks } from "./render";

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing #${id}`);
  }
  return el;
}

let politeClearTimer: number | undefined;

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
  const res = await fetch(EVENTS_JSON_URL);
  if (!res.ok) {
    throw new Error(`Could not load event data (${res.status})`);
  }
  return await res.text();
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

function setErrorVisible(visible: boolean, message?: string): void {
  const el = requireElement("error-banner");
  el.hidden = !visible;
  if (message !== undefined) {
    el.textContent = message;
  }
}

function renderFromBody(body: string, context: { stale: boolean; fetchedAt: number }): void {
  try {
    const doc = parseParkrunDocument(body);
    const blocks = computeSeriesBlocks(doc, createNameCollator());
    renderSeriesBlocks(requireElement("results"), blocks);
    setLastUpdated(
      context.stale
        ? `Showing cached data from ${formatLastUpdated(context.fetchedAt)} (may be out of date)`
        : `Last updated ${formatLastUpdated(context.fetchedAt)}`
    );
    setStaleVisible(context.stale);
    setErrorVisible(false);
  } catch {
    clearResults();
    setStaleVisible(false);
    setErrorVisible(true, "Could not read event data. Use Refresh data to download a fresh copy.");
  }
}

function clearResults(): void {
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
    writeCache({ fetchedAt, body });
    renderFromBody(body, { stale: false, fetchedAt });
  } catch {
    if (cached?.body) {
      renderFromBody(cached.body, { stale: true, fetchedAt: cached.fetchedAt });
    } else {
      clearResults();
      setStaleVisible(false);
      setErrorVisible(
        true,
        "Could not load event data. Check your connection, then use Refresh data to try again."
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

function init(): void {
  const refresh = requireElement("btn-refresh");
  refresh.addEventListener("click", () => {
    void runFetch(readCache());
  });

  void bootstrap();
}

init();
