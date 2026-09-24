import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const basePath = process.env.ZUDOKU_PUBLIC_BASE_PATH ?? "";
const llmsPath = resolve(join("dist", basePath, "llms.txt"));
const llms = await readFile(llmsPath, "utf8");
const apiSection = `## API Reference

- [API Reference](${basePath}/api-reference): Browse the read-only CALL-E Developer API reference.
- [OpenAPI Specification](${basePath}/openapi/calle.openapi.yaml): Read the authoritative OpenAPI 3.1 contract for tools and code generation.
`;

if (
  llms.includes("](/api-reference)") ||
  llms.includes("](/openapi/calle.openapi.yaml)")
) {
  throw new Error("llms.txt already contains an API discovery link.");
}

await writeFile(llmsPath, `${llms.trimEnd()}\n\n${apiSection}`, "utf8");
