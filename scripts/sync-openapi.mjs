import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDir, "..");
const source = resolve(docsRoot, "openapi/calle.openapi.yaml");
const target = resolve(docsRoot, "public/openapi/calle.openapi.yaml");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const bytes = statSync(target).size;
console.log(`Synced OpenAPI contract to ${target} (${bytes} bytes).`);
