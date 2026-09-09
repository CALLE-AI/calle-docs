import { writeFile } from "node:fs/promises";
import { fetchRegions, REGIONS_SOURCE_URL } from "../src/regions.mjs";

const coverage = await fetchRegions();
const snapshotDate = new Date().toISOString().slice(0, 10);
const page = `---
title: Regions & languages
description: Supported destinations, languages, and line regions.
---

import { RegionsTable } from "../../src/components/RegionsTable.js";

:::warning{title="Temporary regional restrictions"}

In response to ongoing cyberattacks, we have implemented additional risk controls. **Some destinations listed below may be temporarily restricted.**

:::

[Source coverage table](${REGIONS_SOURCE_URL})

<RegionsTable snapshotDate="${snapshotDate}">

${coverage}

</RegionsTable>

For rejected requests, see [region and language errors](/errors#recovery-guidance).
`;

await writeFile(new URL("../content/guides/regions.mdx", import.meta.url), page);
console.log("Synced the regions guide from call-e-integrations.");
