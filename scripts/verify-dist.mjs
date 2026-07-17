import { accessSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDir, "..");
const distRoot = resolve(docsRoot, "dist");
const indexPath = resolve(distRoot, "index.html");
const openApiPath = resolve(distRoot, "openapi/calle.openapi.yaml");

function assertFile(path, label) {
  try {
    accessSync(path);
  } catch {
    throw new Error(`Missing ${label}: ${path}`);
  }

  const stats = statSync(path);
  if (!stats.isFile()) {
    throw new Error(`${label} is not a file: ${path}`);
  }
  if (stats.size === 0) {
    throw new Error(`${label} is empty: ${path}`);
  }
}

assertFile(indexPath, "dist index");
assertFile(openApiPath, "OpenAPI document");

const indexHtml = readFileSync(indexPath, "utf8");
const scriptMatch = indexHtml.match(/<script[^>]+src="([^"]+assets\/index-[^"]+\.js)"/);
const stylesheetMatch = indexHtml.match(/<link[^>]+href="([^"]+assets\/index-[^"]+\.css)"/);

if (!scriptMatch) {
  throw new Error("dist index does not reference a hashed entry script.");
}
if (!stylesheetMatch) {
  throw new Error("dist index does not reference a hashed stylesheet.");
}

for (const assetPath of [scriptMatch[1], stylesheetMatch[1]]) {
  if (!assetPath.startsWith("./assets/")) {
    throw new Error(
      `Expected relative asset path for subpath hosting, got ${assetPath}`,
    );
  }

  assertFile(join(distRoot, assetPath.slice(2)), `asset ${assetPath}`);
}

const openApi = readFileSync(openApiPath, "utf8");
if (!openApi.includes("openapi: 3.1.0")) {
  throw new Error("OpenAPI document does not look like the Phase 1 contract.");
}
if (!openApi.includes("/v1/calls") || !openApi.includes("/calle/webhook")) {
  throw new Error("OpenAPI document is missing Phase 1 endpoint paths.");
}

console.log(`Verified static docs dist at ${distRoot}.`);
