import { accessSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDir, "..");
const distRoot = resolve(docsRoot, "dist");

const guides = [
  { slug: "quickstart", title: "Quickstart" },
  { slug: "authentication", title: "Authentication" },
  { slug: "calls", title: "Calls" },
  { slug: "goal-runs", title: "Goal Runs" },
  { slug: "webhooks", title: "Webhooks" },
  { slug: "errors", title: "Errors" },
  { slug: "sdks", title: "SDKs" },
  { slug: "changelog", title: "What's New" },
];

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

function readRequired(relativePath, label = relativePath) {
  const path = resolve(distRoot, relativePath);
  assertFile(path, label);
  return readFileSync(path, "utf8");
}

const indexHtml = readRequired("index.html", "dist index");
readRequired("400.html", "400 status page");
readRequired("404.html", "404 status page");
readRequired("500.html", "500 status page");
const apiInfoHtml = readRequired(
  "api-reference.html",
  "API Reference entry",
);
const apiCallsHtml = readRequired(
  "api-reference/calls.html",
  "Calls API Reference",
);
const apiGoalsHtml = readRequired(
  "api-reference/goals.html",
  "Goals API Reference",
);
const apiGoalRunsHtml = readRequired(
  "api-reference/goal-runs.html",
  "Goal Runs API Reference",
);
readRequired("api-reference/webhooks.html", "Webhooks API Reference");
readRequired("api-reference/~schemas.html", "API schemas page");
readRequired("favicon.svg", "favicon");
readRequired("call-e-logo.svg", "CALL-E logo");
const robots = readRequired("robots.txt", "robots policy");
const sitemap = readRequired("sitemap.xml", "sitemap");
const llms = readRequired("llms.txt", "LLM index");
const llmsFull = readRequired("llms-full.txt", "full LLM export");
readRequired("pagefind/pagefind.js", "Pagefind search runtime");

if (
  !indexHtml.includes("CALL-E Developer Docs") ||
  !indexHtml.includes('window.location.replace("/quickstart")') ||
  !indexHtml.includes('"/authentication"')
) {
  throw new Error(
    "dist index is missing the documentation entry page or legacy hash bridge.",
  );
}

const scriptMatch = indexHtml.match(
  /<script[^>]+src="(\/assets\/entry\.client-[^"]+\.js)"/,
);
const stylesheetMatch = indexHtml.match(
  /<link[^>]+href="(\/assets\/entry-[^"]+\.css)"/,
);

if (!scriptMatch || !stylesheetMatch) {
  throw new Error("dist index does not reference Zudoku entry assets.");
}

for (const assetPath of [scriptMatch[1], stylesheetMatch[1]]) {
  assertFile(join(distRoot, assetPath.slice(1)), `asset ${assetPath}`);
}

for (const guide of guides) {
  const html = readRequired(`${guide.slug}.html`, `${guide.title} HTML`);
  const markdown = readRequired(`${guide.slug}.md`, `${guide.title} Markdown`);

  if (
    !html.includes('data-pagefind-body="true"') ||
    !html.includes("<h1 ")
  ) {
    throw new Error(`${guide.title} HTML is missing prerendered guide content.`);
  }
  if (!markdown.startsWith(`# ${guide.title}\n`)) {
    throw new Error(`${guide.title} Markdown is missing its generated title.`);
  }
  if (!llms.includes(`/${guide.slug}.md`)) {
    throw new Error(`llms.txt does not link to ${guide.slug}.md.`);
  }
  if (!llmsFull.includes(`# ${guide.title}`)) {
    throw new Error(`llms-full.txt does not contain ${guide.title}.`);
  }
  if (!sitemap.includes(`<loc>https://docs.heycall-e.com/${guide.slug}</loc>`)) {
    throw new Error(`sitemap.xml does not contain /${guide.slug}.`);
  }
}

if (
  !llms.includes("[API Reference](/api-reference)") ||
  !llms.includes(
    "[OpenAPI Specification](/openapi/calle.openapi.yaml)",
  )
) {
  throw new Error(
    "llms.txt does not expose the API Reference and OpenAPI contract.",
  );
}

if (
  !apiInfoHtml.includes('data-pagefind-body="true"') ||
  !apiInfoHtml.includes("CALL-E Developer API") ||
  !apiInfoHtml.includes("Developer API contract")
) {
  throw new Error(
    "API Reference entry is missing prerendered OpenAPI information.",
  );
}
if (
  apiInfoHtml.includes('window.location.href="/api-reference/') ||
  apiInfoHtml.includes('window.location.replace("/api-reference/')
) {
  throw new Error("API Reference entry must not be a client-side redirect.");
}

if (
  !apiCallsHtml.includes("Create Call") ||
  !apiCallsHtml.includes("List Call Events")
) {
  throw new Error("Calls API Reference is missing prerendered operations.");
}
if (
  !apiGoalsHtml.includes("List Goals") ||
  !apiGoalsHtml.includes("Get Goal") ||
  !apiGoalRunsHtml.includes("Create Goal Run") ||
  !apiGoalRunsHtml.includes("Get Goal Run")
) {
  throw new Error(
    "Goal API Reference is missing prerendered Goal or Goal Run operations.",
  );
}
if (apiCallsHtml.includes(">Try it<") || apiCallsHtml.includes(">Send Request<")) {
  throw new Error("API Reference unexpectedly exposes a request playground.");
}

const openApi = readRequired(
  "openapi/calle.openapi.yaml",
  "OpenAPI document",
);
if (!openApi.includes("openapi: 3.1.0")) {
  throw new Error("OpenAPI document does not look like the public contract.");
}
if (
  !openApi.includes("/v1/calls") ||
  !openApi.includes("/v1/goals") ||
  !openApi.includes("/v1/goals/{goal_id}/runs") ||
  !openApi.includes("/calle/webhook")
) {
  throw new Error("OpenAPI document is missing public endpoint paths.");
}

if (
  !robots.includes("User-agent: *") ||
  !robots.includes("https://docs.heycall-e.com/sitemap.xml")
) {
  throw new Error("robots.txt does not allow crawling or link the sitemap.");
}

console.log(`Verified Zudoku static docs dist at ${distRoot}.`);
