const TLD_TO_ISO: ReadonlyMap<string, string> = new Map([
  ["au", "au"],
  ["uk", "gb"],
  ["at", "at"],
  ["ie", "ie"],
  ["nz", "nz"],
  ["za", "za"],
  ["us", "us"],
  ["ca", "ca"],
  ["it", "it"],
  ["pl", "pl"],
  ["de", "de"],
  ["dk", "dk"],
  ["se", "se"],
  ["no", "no"],
  ["fi", "fi"],
  ["nl", "nl"],
  ["jp", "jp"],
  ["sg", "sg"],
  ["my", "my"],
  ["lt", "lt"],
]);

export function parkrunTldFromCountryUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  try {
    const host = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
    const parts = host.split(".");
    if (parts[0] !== "parkrun" || parts.length < 2) {
      return null;
    }
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

export function tldToIso(tld: string): string {
  const key = tld.toLowerCase();
  return TLD_TO_ISO.get(key) ?? key;
}

export function flagEmojiFromIso(iso: string): string {
  const upper = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    return "";
  }
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (upper.charCodeAt(0) - 65), base + (upper.charCodeAt(1) - 65));
}

export interface CountryFlagPresentation {
  flag: string;
  accessibleName: string;
}

export function presentationForParkrunCountry(
  countryCode: string,
  countryUrl: string
): CountryFlagPresentation {
  const tld = parkrunTldFromCountryUrl(countryUrl);
  if (!tld) {
    return { flag: "", accessibleName: `Country ${countryCode}` };
  }
  const iso = tldToIso(tld);
  const flag = flagEmojiFromIso(iso);
  let accessibleName = `Country ${countryCode}`;
  try {
    const label = new Intl.DisplayNames(["en-AU"], { type: "region" }).of(iso.toUpperCase());
    if (label) {
      accessibleName = label;
    }
  } catch {
    /* keep numeric fallback */
  }
  return { flag, accessibleName };
}
