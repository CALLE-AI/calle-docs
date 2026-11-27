import { REGIONS_SNAPSHOT } from "./regions-snapshot.mjs";

export const REGIONS_SOURCE_URL =
  "https://github.com/CALLE-AI/call-e-integrations#supported-regions-and-languages";
export const REGIONS_README_URL =
  "https://raw.githubusercontent.com/CALLE-AI/call-e-integrations/main/README.md";

export function extractRegions(readme) {
  const section = readme
    .replace(/\r\n?/g, "\n")
    .split(/^## Supported Regions and Languages[ \t]*$/m)[1]
    ?.split(/^## /m)[0]
    .replace(/\n---\s*$/, "")
    .trim();
  const tables = section?.match(/(?:^\|.*\|[ \t]*(?:\n|$))+/gm)
    ?.map((table) => table.trim().split("\n"));
  const validTable = (rows, header, columns) =>
    rows?.length >= 3 && header.test(rows[0]) &&
    new RegExp(`^\\|(?:[ \\t]*:?-+:?[ \\t]*\\|){${columns}}$`).test(rows[1]) &&
    rows.every((row) => row.split("|").length === columns + 2) &&
    rows.slice(2).every((row) =>
      row.split("|").slice(1, -1).every((cell) => cell.trim())
    );
  // Accept both formats so the source README can migrate independently of the site.
  const legacy = tables?.length === 1 && validTable(tables[0],
    /^\| Country \| Country Code \| Calling Code \| Languages \| (?:Default Line|Line Region) \|$/, 5);
  const separated = tables?.length === 2 && validTable(tables[0],
    /^\| Country \/ Region \| Region Code \| Calling Code \| Number Type \|$/, 4) &&
    validTable(tables[1], /^\| Language \| Code \| Additional local accents \|$/, 3);

  if (!section || (!legacy && !separated) || /[<>{}]/.test(section) ||
      /^[ \t]*(?:import|export)\b/m.test(section)) {
    throw new Error(
      "The source region table is missing or has an unsupported format.",
    );
  }

  return section;
}

export async function fetchRegions() {
  const response = await fetch(REGIONS_README_URL, {
    credentials: "omit",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Could not load the source region table (HTTP ${response.status}).`,
    );
  }
  const coverage = extractRegions(await response.text());
  // Do not replace current language coverage with the superseded per-country list.
  return coverage.includes("### Languages and accents") ? coverage : REGIONS_SNAPSHOT;
}
