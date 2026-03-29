import type { SeriesBlock } from "./types";

const usedHeadingIds = new Set<string>();

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

function renderCountryTable(block: SeriesBlock): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "data-table";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Per country results for ${block.title}`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  for (const label of [
    "Country",
    "Country site",
    "Longest EventLongName",
    "Shortest EventLongName",
  ]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const row of block.countries) {
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
    const tdShort = document.createElement("td");
    appendNameList(tdShort, row.shortest);
    tr.appendChild(tdShort);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function renderGlobalSection(block: SeriesBlock): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "global-block";
  const table = document.createElement("table");
  table.className = "data-table data-table--compact";
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `Global results for ${block.title}`;
  table.appendChild(caption);
  const tbody = document.createElement("tbody");
  const rowLong = document.createElement("tr");
  const thL = document.createElement("th");
  thL.scope = "row";
  thL.textContent = "Longest EventLongName";
  rowLong.appendChild(thL);
  const tdL = document.createElement("td");
  appendNameList(tdL, block.globalLongest);
  rowLong.appendChild(tdL);
  tbody.appendChild(rowLong);
  const rowShort = document.createElement("tr");
  const thS = document.createElement("th");
  thS.scope = "row";
  thS.textContent = "Shortest EventLongName";
  rowShort.appendChild(thS);
  const tdS = document.createElement("td");
  appendNameList(tdS, block.globalShortest);
  rowShort.appendChild(tdS);
  tbody.appendChild(rowShort);
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

export function renderSeriesBlocks(container: HTMLElement, blocks: SeriesBlock[]): void {
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
    section.appendChild(renderCountryTable(block));
    const h4Global = document.createElement("h4");
    h4Global.textContent = "Global";
    section.appendChild(h4Global);
    section.appendChild(renderGlobalSection(block));
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
