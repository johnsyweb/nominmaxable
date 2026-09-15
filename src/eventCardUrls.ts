export function buildEventPageUrl(countrySiteUrl: string, eventname: string): string | null {
  const site = countrySiteUrl.trim().replace(/\/+$/, "");
  const slug = eventname.trim();
  if (!site || !slug) {
    return null;
  }
  return `${site}/${slug}/`;
}

export function buildOpenStreetMapUrl(lat: number, lon: number, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
