import { createNameCollator } from "./analytics";
import type { IsolationCountryRow, IsolationEventExtreme, IsolationSeriesBlock } from "./isolation";
import { formatIsolationDistanceKm } from "./isolationGeometry";
import {
  type IsolationCountrySortColumn,
  type IsolationGlobalSortColumn,
  type IsolationGlobalTableRow,
  isolationGlobalRowsFromBlock,
  sortIsolationCountryRows,
  sortIsolationGlobalRows,
} from "./isolationSort";

const usedHeadingIds = new Set<string>();

function wrapInTableScroll(table: HTMLTableElement, ariaLabel: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "table-scroll";
  wrap.setAttribute("role", "region");
  wrap.setAttribute("aria-label", ariaLabel);
  wrap.tabIndex = 0;
  wrap.appendChild(table);
  return wrap;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function appendNameList(cell: HTMLTableCellElement, names: string[]): void {
  if (names.length === 0) {
    cell.textContent = "—";
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "name-list";
  for (const name of names) {
    const li = document.createElement("li");
    li.textContent = name;
    ul.appendChild(li);
  }
  cell.appendChild(ul);
}

function appendExtremeNames(cell: HTMLTableCellElement, events: IsolationEventExtreme[]): void {
  appendNameList(
    cell,
    events.map((e) => e.name)
  );
}

function appendExtremeNeighbours(
  cell: HTMLTableCellElement,
  events: IsolationEventExtreme[]
): void {
  appendNameList(
    cell,
    events.map((e) => e.neighbourName)
  );
}

function appendExtremeNeighbourCountries(
  cell: HTMLTableCellElement,
  events: IsolationEventExtreme[]
): void {
  appendNameList(
    cell,
    events.map((e) => e.neighbourCountryCode)
  );
}

function setDistanceCell(cell: HTMLTableCellElement, km: number | null): void {
  if (km === null) {
    cell.textContent = "—";
    return;
  }
  cell.textContent = formatIsolationDistanceKm(km);
  cell.className = "data-table__count";
}

function createIsolationCountryDataRow(row: IsolationCountryRow): HTMLTableRowElement {
  const tr = document.createElement("tr");
  const tdCode = document.createElement("td");
  tdCode.textContent = row.countryCode;
  tr.appendChild(tdCode);
  const tdLink = document.createElement("td");
  if (row.countryUrl) {
    const host = hostnameFromUrl(row.countryUrl);
    const a = document.createElement("a");
    a.href = row.countryUrl;
    a.textContent = host;
    a.setAttribute("aria-label", `Country ${row.countryCode} site (${host})`);
    tdLink.appendChild(a);
  } else {
    tdLink.textContent = "—";
  }
  tr.appendChild(tdLink);
  const tdLong = document.createElement("td");
  appendExtremeNames(tdLong, row.longest);
  tr.appendChild(tdLong);
  const tdLongDist = document.createElement("td");
  setDistanceCell(tdLongDist, row.longestDistanceKm);
  tr.appendChild(tdLongDist);
  const tdLongNb = document.createElement("td");
  appendExtremeNeighbours(tdLongNb, row.longest);
  tr.appendChild(tdLongNb);
  const tdLongNbCc = document.createElement("td");
  appendExtremeNeighbourCountries(tdLongNbCc, row.longest);
  tr.appendChild(tdLongNbCc);
  const tdShort = document.createElement("td");
  appendExtremeNames(tdShort, row.shortest);
  tr.appendChild(tdShort);
  const tdShortDist = document.createElement("td");
  setDistanceCell(tdShortDist, row.shortestDistanceKm);
  tr.appendChild(tdShortDist);
  const tdShortNb = document.createElement("td");
  appendExtremeNeighbours(tdShortNb, row.shortest);
  tr.appendChild(tdShortNb);
  const tdShortNbCc = document.createElement("td");
  appendExtremeNeighbourCountries(tdShortNbCc, row.shortest);
  tr.appendChild(tdShortNbCc);
  return tr;
}

function fillIsolationCountryTbody(
  tbody: HTMLTableSectionElement,
  rows: IsolationCountryRow[]
): void {
  tbody.replaceChildren();
  for (const row of rows) {
    tbody.appendChild(createIsolationCountryDataRow(row));
  }
}

function appendSortableIsolationCountryHeader(
  tr: HTMLTableRowElement,
  label: string,
  column: IsolationCountrySortColumn
): void {
  const th = document.createElement("th");
  th.scope = "col";
  th.setAttribute("data-sort-th", column);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sort-header-btn";
  btn.textContent = label;
  btn.dataset.isolationCountrySort = column;
  th.appendChild(btn);
  tr.appendChild(th);
}

function updateIsolationCountryHeaderAria(
  table: HTMLTableElement,
  column: IsolationCountrySortColumn,
  direction: 1 | -1
): void {
  const dirWord = direction === 1 ? "ascending" : "descending";
  table.querySelectorAll<HTMLElement>("[data-sort-th]").forEach((th) => {
    const key = th.dataset.sortTh as IsolationCountrySortColumn;
    th.setAttribute("aria-sort", key === column ? dirWord : "none");
  });
  table.querySelectorAll<HTMLButtonElement>("[data-isolation-country-sort]").forEach((btn) => {
    const key = btn.dataset.isolationCountrySort as IsolationCountrySortColumn;
    const name = btn.textContent ?? "";
    if (key === column) {
      btn.setAttribute(
        "aria-label",
        `Sorted by ${name}, ${dirWord}. Activate to reverse sort order.`
      );
    } else {
      btn.setAttribute("aria-label", `Sort by ${name}, ascending first`);
    }
  });
}

function wireIsolationCountryTableSort(
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  initialRows: IsolationCountryRow[],
  collator: Intl.Collator
): void {
  const sourceRows = [...initialRows];
  let column: IsolationCountrySortColumn = "country";
  let direction: 1 | -1 = 1;

  const apply = (): void => {
    fillIsolationCountryTbody(
      tbody,
      sortIsolationCountryRows(sourceRows, column, direction, collator)
    );
    updateIsolationCountryHeaderAria(table, column, direction);
  };

  table.querySelectorAll<HTMLButtonElement>("[data-isolation-country-sort]").forEach((btn) => {
    const activate = (): void => {
      const key = btn.dataset.isolationCountrySort as IsolationCountrySortColumn;
      if (key === column) {
        direction = direction === 1 ? -1 : 1;
      } else {
        column = key;
        direction = 1;
      }
      apply();
    };
    btn.addEventListener("click", () => {
      activate();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });

  updateIsolationCountryHeaderAria(table, column, direction);
}

function createIsolationGlobalDataRow(row: IsolationGlobalTableRow): HTMLTableRowElement {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = row.label;
  tr.appendChild(th);
  const tdNames = document.createElement("td");
  appendExtremeNames(tdNames, row.events);
  tr.appendChild(tdNames);
  const tdDist = document.createElement("td");
  setDistanceCell(tdDist, row.distanceKm);
  tr.appendChild(tdDist);
  const tdNb = document.createElement("td");
  appendExtremeNeighbours(tdNb, row.events);
  tr.appendChild(tdNb);
  const tdNbCc = document.createElement("td");
  appendExtremeNeighbourCountries(tdNbCc, row.events);
  tr.appendChild(tdNbCc);
  return tr;
}

function fillIsolationGlobalTbody(
  tbody: HTMLTableSectionElement,
  rows: IsolationGlobalTableRow[]
): void {
  tbody.replaceChildren();
  for (const row of rows) {
    tbody.appendChild(createIsolationGlobalDataRow(row));
  }
}

function appendSortableIsolationGlobalHeader(
  tr: HTMLTableRowElement,
  label: string,
  column: IsolationGlobalSortColumn,
  visuallyHidden: boolean
): void {
  const th = document.createElement("th");
  th.scope = "col";
  if (visuallyHidden) {
    th.className = "visually-hidden";
  }
  th.setAttribute("data-isolation-global-sort-th", column);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sort-header-btn";
  btn.textContent = label;
  btn.dataset.isolationGlobalSort = column;
  th.appendChild(btn);
  tr.appendChild(th);
}

function updateIsolationGlobalHeaderAria(
  table: HTMLTableElement,
  column: IsolationGlobalSortColumn,
  direction: 1 | -1
): void {
  const dirWord = direction === 1 ? "ascending" : "descending";
  table.querySelectorAll<HTMLElement>("[data-isolation-global-sort-th]").forEach((th) => {
    const key = th.dataset.isolationGlobalSortTh as IsolationGlobalSortColumn;
    th.setAttribute("aria-sort", key === column ? dirWord : "none");
  });
  table.querySelectorAll<HTMLButtonElement>("[data-isolation-global-sort]").forEach((btn) => {
    const key = btn.dataset.isolationGlobalSort as IsolationGlobalSortColumn;
    const name = btn.textContent ?? "";
    if (key === column) {
      btn.setAttribute(
        "aria-label",
        `Sorted by ${name}, ${dirWord}. Activate to reverse sort order.`
      );
    } else {
      btn.setAttribute("aria-label", `Sort by ${name}, ascending first`);
    }
  });
}

function wireIsolationGlobalTableSort(
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  initialRows: IsolationGlobalTableRow[],
  collator: Intl.Collator
): void {
  const sourceRows = [...initialRows];
  let column: IsolationGlobalSortColumn = "measure";
  let direction: 1 | -1 = 1;

  const apply = (): void => {
    fillIsolationGlobalTbody(
      tbody,
      sortIsolationGlobalRows(sourceRows, column, direction, collator)
    );
    updateIsolationGlobalHeaderAria(table, column, direction);
  };

  table.querySelectorAll<HTMLButtonElement>("[data-isolation-global-sort]").forEach((btn) => {
    const activate = (): void => {
      const key = btn.dataset.isolationGlobalSort as IsolationGlobalSortColumn;
      if (key === column) {
        direction = direction === 1 ? -1 : 1;
      } else {
        column = key;
        direction = 1;
      }
      apply();
    };
    btn.addEventListener("click", () => {
      activate();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });

  updateIsolationGlobalHeaderAria(table, column, direction);
}

function renderIsolationCountryTable(
  block: IsolationSeriesBlock,
  collator: Intl.Collator
): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "data-table data-table--sortable";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Per country nearest-neighbour isolation for ${block.title}. Column headers are sort buttons.`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  appendSortableIsolationCountryHeader(hr, "Country", "country");
  appendSortableIsolationCountryHeader(hr, "Country site", "site");
  appendSortableIsolationCountryHeader(hr, "Longest isolation event", "longestNames");
  appendSortableIsolationCountryHeader(hr, "Longest isolation distance", "longestDistance");
  appendSortableIsolationCountryHeader(hr, "Nearest neighbour", "longestNeighbour");
  appendSortableIsolationCountryHeader(hr, "Neighbour country", "longestNeighbourCountry");
  appendSortableIsolationCountryHeader(hr, "Shortest isolation event", "shortestNames");
  appendSortableIsolationCountryHeader(hr, "Shortest isolation distance", "shortestDistance");
  appendSortableIsolationCountryHeader(hr, "Nearest neighbour", "shortestNeighbour");
  appendSortableIsolationCountryHeader(hr, "Neighbour country", "shortestNeighbourCountry");
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  fillIsolationCountryTbody(
    tbody,
    sortIsolationCountryRows(block.countries, "country", 1, collator)
  );
  table.appendChild(tbody);
  wireIsolationCountryTableSort(table, tbody, block.countries, collator);
  return table;
}

function renderIsolationGlobalSection(
  block: IsolationSeriesBlock,
  collator: Intl.Collator
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "global-block";
  const table = document.createElement("table");
  table.className = "data-table data-table--compact data-table--sortable";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Global nearest-neighbour isolation for ${block.title}. Column headers are sort buttons.`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  appendSortableIsolationGlobalHeader(headRow, "Measure", "measure", true);
  appendSortableIsolationGlobalHeader(headRow, "Full Event Name", "names", false);
  appendSortableIsolationGlobalHeader(headRow, "Distance", "distance", false);
  appendSortableIsolationGlobalHeader(headRow, "Nearest neighbour", "neighbour", false);
  appendSortableIsolationGlobalHeader(headRow, "Neighbour country", "neighbourCountry", false);
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const initialGlobal = isolationGlobalRowsFromBlock(block);
  fillIsolationGlobalTbody(tbody, sortIsolationGlobalRows(initialGlobal, "measure", 1, collator));
  table.appendChild(tbody);
  wireIsolationGlobalTableSort(table, tbody, initialGlobal, collator);
  wrap.appendChild(
    wrapInTableScroll(
      table,
      `Global isolation results for ${block.title}. Scroll horizontally to view all columns.`
    )
  );
  return wrap;
}

function slugifyId(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = base.length > 0 ? base : "section";
  let id = `isolation-series-${slug}`;
  let n = 0;
  while (usedHeadingIds.has(id)) {
    n += 1;
    id = `isolation-series-${slug}-${n}`;
  }
  usedHeadingIds.add(id);
  return id;
}

export function renderIsolationSeriesBlocks(
  container: HTMLElement,
  blocks: IsolationSeriesBlock[]
): void {
  const collator = createNameCollator();
  usedHeadingIds.clear();
  container.replaceChildren();
  if (blocks.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent =
      "No qualifying located events found for nearest-neighbour isolation (need at least two events with coordinates in a series).";
    container.appendChild(p);
    return;
  }
  for (const block of blocks) {
    const section = document.createElement("section");
    section.className = "series-section";
    const headingId = slugifyId(block.title);
    section.setAttribute("aria-labelledby", headingId);
    const h2 = document.createElement("h2");
    h2.id = headingId;
    h2.textContent = block.title;
    section.appendChild(h2);
    const h4Country = document.createElement("h4");
    h4Country.textContent = "Per country";
    section.appendChild(h4Country);
    section.appendChild(
      wrapInTableScroll(
        renderIsolationCountryTable(block, collator),
        `Per country isolation results for ${block.title}. Scroll horizontally to view all columns.`
      )
    );
    const h4Global = document.createElement("h4");
    h4Global.textContent = "Global";
    section.appendChild(h4Global);
    section.appendChild(renderIsolationGlobalSection(block, collator));
    container.appendChild(section);
  }
}
