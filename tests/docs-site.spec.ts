import { expect, test } from "@playwright/test";

const guides = [
  { path: "/quickstart", heading: "Quickstart" },
  { path: "/authentication", heading: "Authentication" },
  { path: "/calls", heading: "Calls" },
  { path: "/goal-runs", heading: "Goal Runs" },
  { path: "/webhooks", heading: "Webhooks" },
  { path: "/errors", heading: "Errors" },
  { path: "/sdks", heading: "SDKs" },
  { path: "/changelog", heading: "What's New" },
];

test("serves prerendered guides on clean URLs", async ({ page, request }) => {
  const response = await request.get("/quickstart");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  expect(await response.text()).toContain('data-pagefind-body="true"');

  await page.goto("/quickstart");
  await expect(
    page.getByRole("heading", { name: "Quickstart" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Authentication", exact: true }).first(),
  ).toHaveAttribute("href", "/authentication");
  await expect(
    page.getByRole("link", { name: "API Reference", exact: true }).first(),
  ).toHaveAttribute("href", "/api-reference");
  await expect(
    page.locator("pre").filter({ hasText: "pnpm add @call-e/calle" }).first(),
  ).toBeVisible();
  await expect(page.locator("code.shiki.not-inline").first()).toHaveCSS(
    "background-color",
    "rgb(11, 15, 20)",
  );
});

test("uses the roomy CALL-E guide navigation on desktop", async ({ page }) => {
  await page.goto("/quickstart");

  const activeGuide = page.locator(
    'nav[class*="overflow-y-auto"][class*="shrink-0"] a[href="/quickstart"]',
  );
  await expect(activeGuide).toBeVisible();

  const activeGuideHeight = await activeGuide.evaluate((element) => {
    return element.getBoundingClientRect().height;
  });
  const descriptionContent = await activeGuide.evaluate((element) => {
    return window.getComputedStyle(element, "::after").content;
  });

  expect(activeGuideHeight).toBeGreaterThanOrEqual(56);
  expect(descriptionContent).not.toBe("none");
  expect(descriptionContent).not.toBe('""');
});

test("offers system, light, and dark appearance modes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/quickstart");

  const html = page.locator("html");
  const trigger = page.getByTestId("theme-menu-trigger");

  await expect(trigger).toHaveAttribute("data-theme", "system");
  await expect(html).toHaveClass("dark");

  await trigger.click();
  const lightOption = page.getByRole("menuitemradio", {
    name: "Light",
    exact: true,
  });
  await lightOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "light");
  await expect(html).toHaveClass("light");
  await expect(lightOption).toBeHidden();

  await trigger.click();
  const darkOption = page.getByRole("menuitemradio", {
    name: "Dark",
    exact: true,
  });
  await darkOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveClass("dark");
  await expect(darkOption).toBeHidden();

  await trigger.click();
  const systemOption = page.getByRole("menuitemradio", {
    name: "System",
    exact: true,
  });
  await systemOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "system");
  await expect(html).toHaveClass("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveClass("light");
});

test("shows a desktop scroll-to-top control after one viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/calls");

  const scrollToTop = page.getByTestId("scroll-to-top");
  await expect(scrollToTop).toBeHidden();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(scrollToTop).toBeVisible();
  await expect(scrollToTop).toHaveCSS("transform", "none");

  await scrollToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("publishes non-empty Markdown and LLM discovery files", async ({
  request,
}) => {
  const markdown = await request.get("/quickstart.md");
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(await markdown.text()).toMatch(
    /^# Quickstart[\s\S]+pnpm add @call-e\/calle/,
  );

  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  const llmsText = await llms.text();

  const llmsFull = await request.get("/llms-full.txt");
  expect(llmsFull.status()).toBe(200);
  const llmsFullText = await llmsFull.text();

  for (const guide of guides) {
    expect(llmsText).toContain(`${guide.path}.md`);
    expect(llmsFullText).toContain(`# ${guide.heading}`);
  }
  expect(llmsText).toContain("[API Reference](/api-reference)");
  expect(llmsText).toContain(
    "[OpenAPI Specification](/openapi/calle.openapi.yaml)",
  );

  const missingMarkdown = await request.get("/does-not-exist.md");
  expect(missingMarkdown.status()).toBe(404);
});

test("publishes crawler and OpenAPI artifacts", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://docs.heycall-e.com/sitemap.xml",
  );

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain(
    "<loc>https://docs.heycall-e.com/quickstart</loc>",
  );
  expect(sitemapText).toContain(
    "<loc>https://docs.heycall-e.com/api-reference/calls</loc>",
  );
  expect(sitemapText).toContain(
    "<loc>https://docs.heycall-e.com/api-reference/goals</loc>",
  );
  expect(sitemapText).toContain(
    "<loc>https://docs.heycall-e.com/api-reference/goal-runs</loc>",
  );

  const openApi = await request.get("/openapi/calle.openapi.yaml");
  expect(openApi.status()).toBe(200);
  const openApiText = await openApi.text();
  expect(openApiText).toContain("openapi: 3.1.0");
  expect(openApiText).toContain("/v1/calls");
  expect(openApiText).toContain("/v1/goals");
  expect(openApiText).toContain("/v1/goals/{goal_id}/runs");
  expect(openApiText).toContain("/calle/webhook");

  const apiReference = await request.get("/api-reference");
  expect(apiReference.status()).toBe(200);
  const apiReferenceText = await apiReference.text();
  expect(apiReferenceText).toContain('data-pagefind-body="true"');
  expect(apiReferenceText).toContain("CALL-E Developer API");
  expect(apiReferenceText).toContain("Developer API contract");
  expect(apiReferenceText).not.toContain(
    'window.location.href="/api-reference/',
  );
});

test("bridges legacy hash routes to clean URLs", async ({ page }) => {
  await page.goto("/#/authentication");
  await expect(page).toHaveURL(/\/authentication$/);
  await expect(
    page.getByRole("heading", { name: "Authentication" }),
  ).toBeVisible();

  await page.goto("/#/calls?section=idempotency");
  await expect(page).toHaveURL(/\/calls#idempotency$/);
  await expect(
    page.getByRole("heading", { name: "Idempotency" }),
  ).toBeVisible();

  await page.goto("/#/goal-runs?section=create-a-run");
  await expect(page).toHaveURL(/\/goal-runs#create-a-run$/);
  await expect(page.locator("#create-a-run")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Create a Goal Run" }),
  ).toBeVisible();

  await page.goto("/#/api-reference");
  await expect(page).toHaveURL(/\/api-reference(?:\/calls)?$/);
});

test("renders every migrated guide from its file route", async ({ page }) => {
  for (const guide of guides) {
    await page.goto(guide.path);
    await expect(
      page.locator("h1").filter({ hasText: guide.heading }),
    ).toBeVisible();
  }
});

test("preserves CALL-E brand and favicon metadata", async ({ page }) => {
  await page.goto("/quickstart");

  const brand = page
    .locator('header a[href="https://www.heycall-e.com/"]')
    .first();
  await expect(brand.getByRole("img", { name: "CALL-E" }).first())
    .toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("href", "https://dashboard.heycall-e.com/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
});

test("keeps quickstart requests minimal and safe to copy", async ({ page }) => {
  await page.goto("/quickstart");

  const minimumRequest = page
    .locator("pre")
    .filter({ hasText: /"task":\s*"[^"]*<E164_PHONE>[^"]*"/ })
    .first();
  await expect(minimumRequest).toBeVisible();
  await expect(minimumRequest).not.toContainText('"recipient"');
  await expect(minimumRequest).not.toContainText('"recipients"');
  await expect(page.getByText("+14155550100")).toHaveCount(0);
  await expect(page.getByText("+8613800000000")).toHaveCount(0);
});

test("preserves authentication, webhook, and SDK guidance", async ({
  page,
}) => {
  await page.goto("/authentication");
  await expect(page.getByText("Authorization: Bearer $CALLE_API_KEY"))
    .toBeVisible();
  await expect(
    page.getByRole("link", { name: "CALL-E dashboard", exact: true }),
  ).toHaveAttribute("href", "https://dashboard.heycall-e.com/account/api-keys");
  await expect(
    page.getByRole("link", { name: "Webhooks", exact: true }).first(),
  ).toHaveAttribute("href", "/webhooks");

  await page.goto("/webhooks");
  await expect(
    page.locator("pre").filter({
      hasText: /"recipients"[\s\S]*"attempts"[\s\S]*"provider_call_id"/,
    }).first(),
  ).toBeVisible();
  await expect(page.getByText("transcript_turns").first()).toBeVisible();

  await page.goto("/sdks");
  await expect(
    page.getByRole("link", { name: "CALLE-AI/server-sdk-typescript" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-typescript",
  );
  await expect(
    page.getByRole("link", { name: "CALLE-AI/server-sdk-python" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-python",
  );
});

test("connects the Calls guide to HTTP and related references", async ({
  page,
}) => {
  await page.goto("/calls");

  const callsBody = page.locator('[data-pagefind-body="true"]');
  await expect(
    callsBody.locator('p a[href="/api-reference/calls"]'),
  ).toBeVisible();
  await expect(
    callsBody.locator('p a[href="/errors"]'),
  ).toBeVisible();
  await expect(
    callsBody.locator('p a[href="/webhooks"]'),
  ).toBeVisible();
});

test("documents the published Goal Run flow on a clean route", async ({
  page,
}) => {
  await page.goto("/goal-runs");

  await expect(
    page.getByRole("heading", { name: "Goal Runs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Goal Runs", exact: true }).first(),
  ).toHaveAttribute("href", "/goal-runs");
  await expect(
    page.locator("pre").filter({
      hasText: /POST[\s\S]*\/v1\/goals\/\$\{CALLE_GOAL_ID\}\/runs/,
    }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Poll for results" }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/errors"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/api-reference/goals"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/api-reference/goal-runs"]').first(),
  ).toBeVisible();
});

test("renders a read-only OpenAPI reference", async ({ page }) => {
  await page.goto("/api-reference");
  await expect(
    page.getByRole("heading", { name: "CALL-E Developer API" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Developer API contract used by the CALL-E TypeScript and Python SDKs.",
    ),
  ).toBeVisible();

  await page.goto("/api-reference/calls");

  await expect(
    page.locator("h2#create-call"),
  ).toBeVisible();
  await expect(
    page.locator("h2#list-call-events"),
  ).toBeVisible();
  await expect(page.getByText("POST").first()).toBeVisible();
  await expect(page.getByText("Try it", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Send Request", { exact: true })).toHaveCount(0);

  await page.goto("/api-reference/webhooks");
  await expect(
    page.locator("h2#server-message"),
  ).toBeVisible();

  await page.goto("/api-reference/goals");
  await expect(page.locator("h2#list-goals")).toBeVisible();
  await expect(page.locator("h2#get-goal")).toBeVisible();

  await page.goto("/api-reference/goal-runs");
  await expect(page.locator("h2#create-goal-run")).toBeVisible();
  await expect(page.locator("h2#get-goal-run")).toBeVisible();
});

test("keeps the guide usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quickstart");

  await expect(
    page.getByRole("heading", { name: "Quickstart" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation menu" }),
  ).toBeVisible();
  const mobileTheme = page.getByTestId("theme-menu-trigger-mobile");
  const mobileToc = page.getByRole("button", {
    name: "Toggle table of contents",
  });
  await expect(mobileTheme).toBeVisible();
  await expect(mobileToc).toBeVisible();

  const themeCenterY = await mobileTheme.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });
  const tocCenterY = await mobileToc.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });
  expect(Math.abs(themeCenterY - tocCenterY)).toBeLessThan(4);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(page.getByTestId("scroll-to-top")).toHaveCSS("display", "none");
});
