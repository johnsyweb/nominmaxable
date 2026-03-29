import { computeSeriesBlocks, createNameCollator, parseParkrunDocument } from "./analytics";
import { isFresh, isQuotaExceededError, readCache, writeCache } from "./cache";
import { CACHE_MS, EVENTS_JSON_URL } from "./constants";
import { formatLastUpdated } from "./formatLastUpdated";
import { renderSeriesBlocks } from "./render";
import { userVisibleErrorDetail } from "./userVisibleErrorDetail";

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

function renderFromBody(
  body: string,
  context: { stale: boolean; fetchedAt: number; couldNotPersistLocally?: boolean }
): void {
  try {
    const doc = parseParkrunDocument(body);
    const blocks = computeSeriesBlocks(doc, createNameCollator());
    renderSeriesBlocks(requireElement("results"), blocks);
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

function init(): void {
  const refresh = requireElement("btn-refresh");
  refresh.addEventListener("click", () => {
    void runFetch(readCache());
  });

  void bootstrap();
}

init();
