import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const llmsPath = resolve("dist/llms.txt");
const llms = await readFile(llmsPath, "utf8");
const apiSection = `## API Reference

- [API Reference](/api-reference): Browse the read-only CALL-E Developer API reference.
- [OpenAPI Specification](/openapi/calle.openapi.yaml): Read the authoritative OpenAPI 3.1 contract for tools and code generation.
`;

if (
  llms.includes("](/api-reference)") ||
  llms.includes("](/openapi/calle.openapi.yaml)")
) {
  throw new Error("llms.txt already contains an API discovery link.");
}

await writeFile(llmsPath, `${llms.trimEnd()}\n\n${apiSection}`, "utf8");
