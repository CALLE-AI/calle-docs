import { writeFile } from "node:fs/promises";
import { fetchRegions, REGIONS_SOURCE_URL } from "../src/regions.mjs";

const coverage = await fetchRegions();
const snapshotDate = new Date().toISOString().slice(0, 10);
const page = `---
title: Regions & languages
description: Supported destinations, languages, and line regions.
---

import { RegionsTable } from "../../src/components/RegionsTable.js";

Temporary regional restrictions may affect availability for listed destinations.

[Source coverage table](${REGIONS_SOURCE_URL})

<RegionsTable snapshotDate="${snapshotDate}">

${coverage}

</RegionsTable>

For rejected requests, see [region and language errors](/errors#recovery-guidance).
`;

await writeFile(new URL("../content/guides/regions.mdx", import.meta.url), page);
console.log("Synced the regions guide from call-e-integrations.");
