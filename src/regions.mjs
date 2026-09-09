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
  const rows = section?.match(/^\|.*\|[ \t]*$/gm);

  // ponytail: five plain cells; use a Markdown parser if cells need escaped pipes.
  if (
    !section ||
    !rows ||
    rows.length < 3 ||
    rows[0] !==
      "| Country | Country Code | Calling Code | Languages | Line Region |" ||
    !/^\|(?:[ \t]*:?-+:?[ \t]*\|){5}$/.test(rows[1]) ||
    rows.some((row) => row.split("|").length !== 7) ||
    rows.slice(2).some((row) =>
      row.split("|").slice(1, -1).some((cell) => !cell.trim())
    ) ||
    /[<>{}]/.test(section) ||
    /^[ \t]*(?:import|export)\b/m.test(section)
  ) {
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
  return extractRegions(await response.text());
}
