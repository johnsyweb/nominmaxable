import { createNameCollator } from "./analytics";
import type { CountryRow, SeriesBlock } from "./types";
import {
  type CountrySortColumn,
  type GlobalSortColumn,
  type GlobalTableRow,
  globalRowsFromBlock,
  sortCountryRows,
  sortGlobalRows,
} from "./tableSort";

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

function setCharacterCountCell(cell: HTMLTableCellElement, count: number | null): void {
  if (count === null) {
    cell.textContent = "—";
    return;
  }
  cell.textContent = String(count);
  cell.className = "data-table__count";
}

function createCountryDataRow(row: CountryRow): HTMLTableRowElement {
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
    const label = `Country ${row.countryCode} site (${host})`;
    a.setAttribute("aria-label", label);
    tdLink.appendChild(a);
  } else {
    tdLink.textContent = "—";
  }
  tr.appendChild(tdLink);
  const tdLong = document.createElement("td");
  appendNameList(tdLong, row.longest);
  tr.appendChild(tdLong);
  const tdLongCount = document.createElement("td");
  setCharacterCountCell(tdLongCount, row.longestCharCount);
  tr.appendChild(tdLongCount);
  const tdShort = document.createElement("td");
  appendNameList(tdShort, row.shortest);
  tr.appendChild(tdShort);
  const tdShortCount = document.createElement("td");
  setCharacterCountCell(tdShortCount, row.shortestCharCount);
  tr.appendChild(tdShortCount);
  return tr;
}

function fillCountryTbody(tbody: HTMLTableSectionElement, rows: CountryRow[]): void {
  tbody.replaceChildren();
  for (const row of rows) {
    tbody.appendChild(createCountryDataRow(row));
  }
}

function appendSortableCountryHeader(
  tr: HTMLTableRowElement,
  label: string,
  column: CountrySortColumn
): void {
  const th = document.createElement("th");
  th.scope = "col";
  th.setAttribute("data-sort-th", column);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sort-header-btn";
  btn.textContent = label;
  btn.dataset.countrySort = column;
  th.appendChild(btn);
  tr.appendChild(th);
}

function updateCountryHeaderAria(
  table: HTMLTableElement,
  column: CountrySortColumn,
  direction: 1 | -1
): void {
  const dirWord = direction === 1 ? "ascending" : "descending";
  table.querySelectorAll<HTMLElement>("[data-sort-th]").forEach((th) => {
    const key = th.dataset.sortTh as CountrySortColumn;
    if (key === column) {
      th.setAttribute("aria-sort", direction === 1 ? "ascending" : "descending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
  table.querySelectorAll<HTMLButtonElement>("[data-country-sort]").forEach((btn) => {
    const key = btn.dataset.countrySort as CountrySortColumn;
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

function wireCountryTableSort(
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  initialRows: CountryRow[],
  collator: Intl.Collator
): void {
  const sourceRows = [...initialRows];
  let column: CountrySortColumn = "country";
  let direction: 1 | -1 = 1;

  const apply = (): void => {
    const sorted = sortCountryRows(sourceRows, column, direction, collator);
    fillCountryTbody(tbody, sorted);
    updateCountryHeaderAria(table, column, direction);
  };

  table.querySelectorAll<HTMLButtonElement>("[data-country-sort]").forEach((btn) => {
    const activate = (): void => {
      const key = btn.dataset.countrySort as CountrySortColumn;
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

  updateCountryHeaderAria(table, column, direction);
}

function createGlobalDataRow(row: GlobalTableRow): HTMLTableRowElement {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = row.label;
  tr.appendChild(th);
  const tdNames = document.createElement("td");
  appendNameList(tdNames, row.names);
  tr.appendChild(tdNames);
  const tdCount = document.createElement("td");
  setCharacterCountCell(tdCount, row.charCount);
  tr.appendChild(tdCount);
  return tr;
}

function fillGlobalTbody(tbody: HTMLTableSectionElement, rows: GlobalTableRow[]): void {
  tbody.replaceChildren();
  for (const row of rows) {
    tbody.appendChild(createGlobalDataRow(row));
  }
}

function appendSortableGlobalHeader(
  tr: HTMLTableRowElement,
  label: string,
  column: GlobalSortColumn,
  visuallyHidden: boolean
): void {
  const th = document.createElement("th");
  th.scope = "col";
  if (visuallyHidden) {
    th.className = "visually-hidden";
  }
  th.setAttribute("data-global-sort-th", column);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sort-header-btn";
  btn.textContent = label;
  btn.dataset.globalSort = column;
  th.appendChild(btn);
  tr.appendChild(th);
}

function updateGlobalHeaderAria(
  table: HTMLTableElement,
  column: GlobalSortColumn,
  direction: 1 | -1
): void {
  const dirWord = direction === 1 ? "ascending" : "descending";
  table.querySelectorAll<HTMLElement>("[data-global-sort-th]").forEach((th) => {
    const key = th.dataset.globalSortTh as GlobalSortColumn;
    if (key === column) {
      th.setAttribute("aria-sort", direction === 1 ? "ascending" : "descending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
  table.querySelectorAll<HTMLButtonElement>("[data-global-sort]").forEach((btn) => {
    const key = btn.dataset.globalSort as GlobalSortColumn;
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

function wireGlobalTableSort(
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  initialRows: GlobalTableRow[],
  collator: Intl.Collator
): void {
  const sourceRows = [...initialRows];
  let column: GlobalSortColumn = "measure";
  let direction: 1 | -1 = 1;

  const apply = (): void => {
    const sorted = sortGlobalRows(sourceRows, column, direction, collator);
    fillGlobalTbody(tbody, sorted);
    updateGlobalHeaderAria(table, column, direction);
  };

  table.querySelectorAll<HTMLButtonElement>("[data-global-sort]").forEach((btn) => {
    const activate = (): void => {
      const key = btn.dataset.globalSort as GlobalSortColumn;
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

  updateGlobalHeaderAria(table, column, direction);
}

function renderCountryTable(block: SeriesBlock, collator: Intl.Collator): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "data-table data-table--sortable";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Per country results for ${block.title}. Column headers are sort buttons.`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  appendSortableCountryHeader(hr, "Country", "country");
  appendSortableCountryHeader(hr, "Country site", "site");
  appendSortableCountryHeader(hr, "Longest Full Event Name", "longestNames");
  appendSortableCountryHeader(hr, "Longest character count", "longestCount");
  appendSortableCountryHeader(hr, "Shortest Full Event Name", "shortestNames");
  appendSortableCountryHeader(hr, "Shortest character count", "shortestCount");
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  fillCountryTbody(tbody, sortCountryRows(block.countries, "country", 1, collator));
  table.appendChild(tbody);
  wireCountryTableSort(table, tbody, block.countries, collator);
  return table;
}

function renderGlobalSection(block: SeriesBlock, collator: Intl.Collator): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "global-block";
  const table = document.createElement("table");
  table.className = "data-table data-table--compact data-table--sortable";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Global results for ${block.title}. Column headers are sort buttons.`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  appendSortableGlobalHeader(headRow, "Measure", "measure", true);
  appendSortableGlobalHeader(headRow, "Full Event Name", "names", false);
  appendSortableGlobalHeader(headRow, "Character count", "count", false);
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const initialGlobal = globalRowsFromBlock(block);
  fillGlobalTbody(tbody, sortGlobalRows(initialGlobal, "measure", 1, collator));
  table.appendChild(tbody);
  wireGlobalTableSort(table, tbody, initialGlobal, collator);
  wrap.appendChild(
    wrapInTableScroll(
      table,
      `Global results for ${block.title}. Scroll horizontally to view all columns.`
    )
  );
  return wrap;
}

export function renderSeriesBlocks(container: HTMLElement, blocks: SeriesBlock[]): void {
  const collator = createNameCollator();
  usedHeadingIds.clear();
  container.replaceChildren();
  if (blocks.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = "No qualifying events found in the dataset.";
    container.appendChild(p);
    return;
  }
  for (const block of blocks) {
    const section = document.createElement("section");
    section.className = "series-section";
    section.setAttribute("aria-labelledby", slugifyId(block.title));
    const h2 = document.createElement("h2");
    h2.id = slugifyId(block.title);
    h2.textContent = block.title;
    section.appendChild(h2);
    const h4Country = document.createElement("h4");
    h4Country.textContent = "Per country";
    section.appendChild(h4Country);
    section.appendChild(
      wrapInTableScroll(
        renderCountryTable(block, collator),
        `Per country results for ${block.title}. Scroll horizontally to view all columns.`
      )
    );
    const h4Global = document.createElement("h4");
    h4Global.textContent = "Global";
    section.appendChild(h4Global);
    section.appendChild(renderGlobalSection(block, collator));
    container.appendChild(section);
  }
}

function slugifyId(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = base.length > 0 ? base : "section";
  let id = `series-${slug}`;
  let n = 0;
  while (usedHeadingIds.has(id)) {
    n += 1;
    id = `series-${slug}-${n}`;
  }
  usedHeadingIds.add(id);
  return id;
}
