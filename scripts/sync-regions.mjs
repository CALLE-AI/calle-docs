import { writeFile } from "node:fs/promises";
import { fetchRegions, REGIONS_SOURCE_URL } from "../src/regions.mjs";
import { REGIONS_SNAPSHOT, REGIONS_SNAPSHOT_DATE } from "../src/regions-snapshot.mjs";

const coverage = await fetchRegions().catch(() => REGIONS_SNAPSHOT);
const snapshotDate = coverage === REGIONS_SNAPSHOT
  ? REGIONS_SNAPSHOT_DATE : new Date().toISOString().slice(0, 10);
const page = `---
title: Regions & languages
description: Calling destinations, conversation languages, and local accents.
---

import { RegionsTable } from "../../src/components/RegionsTable.js";

[Source coverage table](${REGIONS_SOURCE_URL})

<RegionsTable snapshotDate="${snapshotDate}">

${coverage}

</RegionsTable>

For rejected requests, see [region and language errors](/errors#recovery-guidance).
`;

await writeFile(new URL("../content/guides/regions.mdx", import.meta.url), page);
console.log("Synced the regions guide from call-e-integrations.");
