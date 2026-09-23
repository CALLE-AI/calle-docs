import { expect, test } from "@playwright/test";
import { extractRegions, REGIONS_README_URL } from "../src/regions.mjs";

const docsPages = [
  { path: "/quickstart", heading: "Quickstart" },
  { path: "/authentication", heading: "Authentication" },
  { path: "/calls", heading: "Calls" },
  { path: "/regions", heading: "Regions & languages" },
  { path: "/goal-runs", heading: "Goal Runs" },
  { path: "/webhooks", heading: "Webhooks" },
  { path: "/errors", heading: "Errors" },
  { path: "/sdks", heading: "SDKs" },
  { path: "/changelog", heading: "What's New" },
  { path: "/billing", heading: "Billing" },
];

const guideNavigationItems = docsPages.filter(
  ({ path }) => path !== "/changelog" && path !== "/billing",
);

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
  const coverageLink = page.getByRole("link", { name: /^Regions & languages/ });
  await expect(coverageLink).toBeVisible();
  await expect(coverageLink).toHaveAttribute(
    "href",
    "/regions",
  );
  await expect(
    page.locator("pre").filter({ hasText: "pnpm add @call-e/calle" }).first(),
  ).toBeVisible();
  await expect(page.locator("code.shiki.not-inline").first()).toHaveCSS(
    "background-color",
    "rgb(246, 248, 250)",
  );
});

const regionSection = `Use these country codes with recipient settings.

| Country | Country Code | Calling Code | Languages | Default Line |
| --- | --- | --- | --- | --- |
| Updated test destination | ZZ | +999 | Test language | International |

**Notes**

- **International** uses an international line.`;
const regionsReadme = `# Integrations

Unrelated introduction.

## Supported Regions and Languages

${regionSection}

---

## Examples

Unrelated examples.`;

test("extracts only valid region coverage from the source README", () => {
  expect(extractRegions(regionsReadme)).toBe(regionSection);
  expect(extractRegions(regionsReadme.replaceAll("\n", "\r\n"))).toBe(regionSection);
  expect(extractRegions(regionsReadme.replace("Default Line", "Line Region")))
    .toBe(regionSection.replace("Default Line", "Line Region"));
  for (const invalid of [
    regionsReadme.replace("Supported Regions and Languages", "Removed section"),
    regionsReadme.replace("| Languages |", "| Renamed column |"),
    regionsReadme.replace("Test language", "Test | language"),
    regionsReadme.replace("Test language", ""),
    regionsReadme.replace("Test language", "{process.env}"),
    regionsReadme.replace("Test language", "<script>alert(1)</script>"),
    regionsReadme.replace("**Notes**", 'import Example from "example";'),
    regionsReadme.replace("**Notes**", '  import Example from "example";'),
  ]) {
    expect(() => extractRegions(invalid)).toThrow("unsupported format");
  }
});

test("refreshes region coverage without rebuilding the docs", async ({ page }) => {
  await page.route(REGIONS_README_URL, (route) => route.fulfill({
    contentType: "text/plain",
    body: regionsReadme,
  }));
  await page.goto("/regions");
  await expect(page.getByRole("columnheader", { name: "Default Line" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Updated test destination" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Test language" })).toBeVisible();
  await expect(page.getByText("Unrelated examples.")).toHaveCount(0);

  await page.route(REGIONS_README_URL, (route) => route.fulfill({
    contentType: "text/plain",
    body: regionsReadme.replace("Default Line", "Line Region"),
  }));
  await page.reload();
  await expect(page.getByRole("columnheader", { name: "Line Region" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const guide of ["/quickstart", "/calls", "/errors"]) {
    await page.goto(guide);
    await page.locator('main p a[href="/regions"]').first().click();
    await expect(page).toHaveURL(/\/regions$/);
  }
});

test("retains a readable region snapshot when refresh fails", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const tableHeader = /\| Country \| Country Code \| Calling Code \| Languages \| (?:Default Line|Line Region) \|/;
  const html = await request.get("/regions");
  expect(await html.text()).toContain("<table");
  const markdown = await request.get("/regions.md");
  expect(await markdown.text()).toMatch(tableHeader);
  const llmsFull = await request.get("/llms-full.txt");
  expect(await llmsFull.text()).toMatch(tableHeader);

  for (const response of [
    { status: 503, body: "Unavailable" },
    { status: 200, body: regionsReadme.replace("Test language", "{unsafeMdx()}") },
  ]) {
    await page.route(REGIONS_README_URL, (route) => route.fulfill(response));
    await page.goto("/regions");
    await expect(page.getByRole("status")).toContainText("Could not refresh coverage");
    await expect(page.getByRole("table")).toBeVisible();
    expect(await page.getByRole("row").count()).toBeGreaterThan(2);
    await expect(page.getByText("unsafeMdx()")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const tableRegion = page.getByRole("region", { name: "Region and language coverage" });
    await tableRegion.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await page.unroute(REGIONS_README_URL);
  }
});

test("uses the roomy CALL-E guide navigation on desktop", async ({ page }) => {
  await page.goto("/quickstart");

  for (const guide of guideNavigationItems) {
    const guideLink = page.locator(
      `nav[class*="overflow-y-auto"][class*="shrink-0"] a[href="${guide.path}"]`,
    );
    await expect(guideLink).toBeVisible();

    const guideHeight = await guideLink.evaluate((element) => {
      return element.getBoundingClientRect().height;
    });
    const descriptionContent = await guideLink.evaluate((element) => {
      return window.getComputedStyle(element, "::after").content;
    });

    expect(guideHeight).toBeGreaterThanOrEqual(56);
    expect(descriptionContent).not.toBe("none");
    expect(descriptionContent).not.toBe('""');
  }
});

test("places What's New in the top-level documentation navigation", async ({
  page,
}) => {
  await page.goto("/changelog");

  const docsNavigation = page.locator(
    'header[data-pagefind-ignore="all"] nav:not([aria-label])',
  );
  const links = docsNavigation.getByRole("link");

  await expect(links).toHaveCount(4);
  await expect(links.nth(0)).toHaveText("Guides");
  await expect(links.nth(0)).toHaveAttribute("href", "/quickstart");
  await expect(links.nth(1)).toHaveText("API Reference");
  await expect(links.nth(1)).toHaveAttribute("href", "/api-reference");
  await expect(links.nth(2)).toHaveText("Billing");
  await expect(links.nth(2)).toHaveAttribute("href", "/billing");
  await expect(links.nth(3)).toHaveText("What's New");
  await expect(links.nth(3)).toHaveAttribute("href", "/changelog");
  await expect(
    page.locator(
      'nav[class*="overflow-y-auto"][class*="shrink-0"] a[href="/changelog"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "What's New" }),
  ).toBeVisible();
});

test("documents aggregate billing and preserves pre-connection policy", async ({ page, request }) => {
  await page.goto("/billing");
  const article = page.locator('[data-pagefind-body="true"]');
  await expect(page.getByRole("heading", { level: 1, name: "Billing" })).toBeVisible();
  const billingPreview = article.getByRole("region", { name: "Billing preview", exact: true });
  await expect(billingPreview).toBeVisible();
  await expect(billingPreview).toContainText("Billing preview — coming soon");
  await expect(billingPreview).toContainText("under development and is not yet in effect");
  await expect(billingPreview).toContainText("your current billing remains unchanged");
  await expect(billingPreview.locator('svg[aria-hidden="true"]')).toBeVisible();
  await expect(article).toContainText("Total cost = Carrier Fee + Model Fee");
  await expect(article).not.toContainText("Total cost = Carrier Fee + Model Fee + Task Success Fee");
  const billingNote = article.locator(".billing-note").filter({ hasText: "pre-connection" });
  await expect(billingNote).toContainText("Model fees may apply even if the call is not connected.");
  await expect(billingNote).toHaveCSS("font-size", "14px");
  await expect(billingNote.locator("strong")).toHaveCount(0);
  await expect(article).toContainText("$0.0296");
  await expect(article).toContainText("$0.0148");
  const goalOffer = article.getByRole("region", { name: "Goal pricing offer" });
  await expect(goalOffer).toBeVisible();
  await expect(goalOffer).toContainText("Pay half.");
  await expect(goalOffer).toContainText("Choose Goal.");
  await expect(goalOffer).toContainText("Coming soon");
  await expect(goalOffer.locator(".billing-offer__number")).toHaveText("50%");
  await expect(goalOffer.locator(".billing-offer__discount-label")).toHaveText("SAVE");
  await expect(goalOffer.getByRole("link", { name: "Explore Goal Runs" })).toHaveCount(0);
  await expect(goalOffer).toContainText("vs. One-shot-call");
  await expect(goalOffer.locator('.billing-offer__badge svg[aria-hidden="true"]')).toBeVisible();
  await expect(article).not.toContainText("Goal is currently half the price");
  const successFeeNote = article.locator(".billing-note").filter({ hasText: "Task Success Fee" });
  await expect(successFeeNote).toHaveText("Task Success Fee is an experimental, outcome-based fee shown for reference only. It is currently fully waived.");
  await expect(successFeeNote).toHaveCSS("font-size", "14px");
  await expect(successFeeNote.locator("strong")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Task Success Fee", exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="#task-success-fee"]')).toHaveCount(0);
  const callingGuidance = "Choose Goal for batch and large-scale calling. Keep One-shot-call for development and testing.";
  await expect(goalOffer).not.toContainText(callingGuidance);
  await expect(article.locator(".billing-method-notes > p").first()).toHaveText(callingGuidance);
  await expect(article).not.toContainText("provisional");
  await expect(article).not.toContainText("Deepgram");
  await expect(article).not.toContainText("ElevenLabs");
  const markdown = await request.get("/billing.md");
  expect(markdown.ok()).toBe(true);
  const billingMarkdown = await markdown.text();
  expect(billingMarkdown).toContain("$0.0296");
  expect(billingMarkdown).toContain("$0.0148");
  await expect(article.getByRole("columnheader", { name: "30 seconds", exact: true })).toBeVisible();
  await expect(article.getByRole("columnheader", { name: "60 seconds", exact: true })).toHaveCount(0);
  expect(billingMarkdown).not.toContain("60 seconds");
  expect(billingMarkdown).toContain("Pay half.");
  expect(billingMarkdown).toContain("Choose Goal.");
  expect(billingMarkdown).not.toContain("Explore Goal Runs");
  expect(billingMarkdown).toContain("You save $0.0544 on this 30-second call with Goal.");
  expect(billingMarkdown).toContain("Coming soon");
  expect(billingMarkdown).toContain("Billing preview — coming soon");
  expect(billingMarkdown).toContain("not yet in effect");
  expect(billingMarkdown.split(callingGuidance)).toHaveLength(2);
  expect(billingMarkdown).toContain("It is currently fully waived.");
  expect(billingMarkdown.match(/Task Success Fee/g)).toHaveLength(1);
  expect(billingMarkdown).not.toMatch(/any applicable Task Success Fee|Add Task Success Fee separately|Task Success Fee is charged only/);
  expect(billingMarkdown).not.toContain("provisional");
  expect(billingMarkdown).not.toMatch(/multiplier|standard model cost|provider cost|\$0\.0074|×4|×2/i);
  expect(billingMarkdown).not.toMatch(/earlier billing|previously|same policy as before|existing rules|continue to apply/i);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("link", { name: "Billing", exact: true }).last()).toBeVisible();
});

test("compares prices with stacked bars and accessible fee breakdowns", async ({ page, request }, testInfo) => {
  const markdown = await request.get("/billing.md");
  const text = await markdown.text();
  expect(text).toContain("30-second domestic outbound call");
  expect(text).toContain("$0.1088");
  expect(text).toContain("$0.0544");
  expect(text).toContain("$0.0296 × 3 = $0.0888");
  expect(text).toContain("$0.0200/min × 0.5 min = $0.0100");
  for (const method of ["POST /v1/calls", "POST /v1/goals/{goal_id}/runs", "client.calls.create(...)", "client.goals.run(...)", "Idempotency-Key"]) {
    expect(text).toContain(method);
    expect(text.split(method)).toHaveLength(2);
  }
  expect(text).toContain("no published Goal needed");
  expect(text).toContain("Publish a Goal in CALL-E Chat");

  for (const width of [1280, 390, 320]) {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/billing");
      const offer = page.getByRole("region", { name: "Goal pricing offer" });
      await expect(offer.locator(".billing-offer__badge")).toHaveText("Coming soon");
      await offer.screenshot({ path: testInfo.outputPath(`billing-offer-${width}-${colorScheme}.png`) });
      const comparison = page.getByRole("figure", { name: /30-second call.*Domestic outbound/ });
      await expect(comparison).toBeVisible();
      await expect(comparison).toContainText("Hover or tap a segment for its rate · Preview");
      await expect(comparison).toContainText("Model Fee · / 10s");
      await expect(comparison).toContainText("Carrier Fee · / min");
      await expect(comparison.locator(".billing-comparison__bar--oneshot")).toBeVisible();
      await expect(comparison.locator(".billing-comparison__bar--goal")).toBeVisible();
      const goalRow = comparison.locator(".billing-comparison__row--goal");
      const oneShotRow = comparison.locator(".billing-comparison__row--oneshot");
      await expect(goalRow.locator(".billing-comparison__saving")).toHaveText("Half price");
      await expect(goalRow.locator(".billing-comparison__saved")).toHaveText("You save$0.0544");
      const goalTotal = goalRow.locator(".billing-comparison__total");
      const oneShotTotal = oneShotRow.locator(".billing-comparison__total");
      expect(await goalTotal.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)))
        .toBeGreaterThan(await oneShotTotal.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)));
      const goalModelColor = await goalRow.locator(".billing-comparison__model").evaluate((element) => getComputedStyle(element).backgroundColor);
      const oneShotModelColor = await oneShotRow.locator(".billing-comparison__model").evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(goalModelColor).not.toBe(oneShotModelColor);
      for (const row of [goalRow, oneShotRow]) {
        expect(await row.locator(".billing-comparison__carrier").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("repeating-linear-gradient");
      }
      const methodNotes = page.locator(".billing-method-notes");
      await expect(methodNotes).toBeVisible();
      await expect(comparison).not.toContainText("POST /v1/");
      await expect(offer.locator(".billing-method-notes")).toHaveCount(0);
      const offerBox = (await offer.boundingBox())!;
      const notesBox = (await methodNotes.boundingBox())!;
      expect(notesBox.y).toBeGreaterThanOrEqual(offerBox.y + offerBox.height);
      for (const mode of [
        { endpoint: "POST /v1/calls", sdk: "client.calls.create(...)", guide: "/calls", description: "no published Goal needed" },
        { endpoint: "POST /v1/goals/{goal_id}/runs", sdk: "client.goals.run(...)", guide: "/goal-runs", description: "Publish a Goal in CALL-E Chat" },
      ]) {
        const note = methodNotes.locator("p").filter({ hasText: mode.sdk });
        await expect(note).toBeVisible();
        for (const value of [mode.endpoint, mode.sdk, mode.description]) await expect(note).toContainText(value);
        await expect(note).toHaveCSS("font-size", "14px");
        await expect(note.getByRole("link")).toHaveAttribute("href", mode.guide);
      }
      await methodNotes.screenshot({ path: testInfo.outputPath(`billing-method-notes-${width}-${colorScheme}.png`) });
      const oneshot = (await comparison.locator(".billing-comparison__bar--oneshot").boundingBox())!;
      const goal = (await comparison.locator(".billing-comparison__bar--goal").boundingBox())!;
      expect(goal.width / oneshot.width).toBeCloseTo(0.5, 2);
      expect(goal.x).toBeCloseTo(oneshot.x, 1);
      expect(goal.height).toBeCloseTo(oneshot.height, 1);
      for (const bar of await comparison.locator(".billing-comparison__bar").all()) {
        const totalWidth = (await bar.boundingBox())!.width;
        const modelWidth = (await bar.locator(".billing-comparison__model").boundingBox())!.width;
        expect(modelWidth / totalWidth).toBeCloseTo(0.0888 / 0.1088, 2);
      }
      await comparison.screenshot({ path: testInfo.outputPath(`billing-stacks-${width}-${colorScheme}.png`) });
      for (const price of [
        { name: "One-shot-call", model: "$0.0888", carrier: "$0.0200", modelRate: "$0.0296", carrierRate: "$0.0400" },
        { name: "Goal", model: "$0.0444", carrier: "$0.0100", modelRate: "$0.0148", carrierRate: "$0.0200" },
      ]) {
        for (const fee of [
          { label: "Model Fee", rate: price.modelRate, unit: "10 seconds", usage: "3 × 10-second periods", cost: price.model, other: "Carrier Fee" },
          { label: "Carrier Fee", rate: price.carrierRate, unit: "minute", usage: "0.5 minutes", cost: price.carrier, other: "Model Fee" },
        ]) {
          const trigger = comparison.getByRole("button", { name: `${price.name} ${fee.label}: ${fee.rate} per ${fee.unit}. Show price details`, exact: true });
          await trigger.hover();
          const tooltip = page.getByRole("tooltip");
          await expect(tooltip).toBeVisible();
          for (const value of [fee.label, `${fee.rate} / ${fee.unit}`, fee.usage, fee.cost]) await expect(tooltip).toContainText(value);
          await expect(tooltip).not.toContainText(fee.other);
          const popup = (await page.locator(".billing-cost-tooltip").boundingBox())!;
          expect(popup.x).toBeGreaterThanOrEqual(0);
          expect(popup.x + popup.width).toBeLessThanOrEqual(width);
          await page.screenshot({ path: testInfo.outputPath(`billing-details-${price.name}-${fee.label}-${width}-${colorScheme}.png`), animations: "disabled" });
          await page.keyboard.press("Escape");
          await expect(tooltip).toBeHidden();
          await page.mouse.move(0, 0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }

  const goalButton = page.getByRole("button", { name: "Goal Model Fee: $0.0148 per 10 seconds. Show price details", exact: true });
  await goalButton.focus();
  await expect(page.getByRole("tooltip")).toContainText("$0.0148 / 10 seconds");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toContainText("$0.0200 / minute");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await page.locator(".billing-method-notes").getByRole("link", { name: "Goal guide", exact: true }).click();
  await expect(page).toHaveURL(/\/goal-runs$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Goal Runs/ })).toBeVisible();
});

test("opens and dismisses fee breakdowns by touch", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("http://localhost:4174/billing");
  const goal = page.getByRole("button", { name: "Goal Model Fee: $0.0148 per 10 seconds. Show price details", exact: true });
  const carrier = page.getByRole("button", { name: "Goal Carrier Fee: $0.0200 per minute. Show price details", exact: true });
  await goal.tap();
  await expect(page.getByRole("tooltip")).toContainText("$0.0148 / 10 seconds");
  await goal.tap();
  await expect(page.getByRole("tooltip")).toBeHidden();
  await goal.tap();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await carrier.tap();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await expect(page.getByRole("tooltip")).toContainText("$0.0200 / minute");
  await expect(page.getByRole("tooltip")).toContainText("$0.0100");
  await page.locator("h2#how-billing-works").tap();
  await expect(page.getByRole("tooltip")).toBeHidden();
  await context.close();
});

test("keeps the wide docs article and table of contents together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/changelog");

  const spacing = await page
    .locator('[data-pagefind-filter="section:markdown"]')
    .evaluate((layout) => {
      const article = layout.querySelector(":scope > .typography");
      const tableOfContents = layout.querySelector(
        'aside[class*="overflow-y-auto"]',
      );
      if (!(article instanceof HTMLElement)) {
        throw new Error("Expected the docs article");
      }
      if (!(tableOfContents instanceof HTMLElement)) {
        throw new Error("Expected the desktop table of contents");
      }

      const layoutRect = layout.getBoundingClientRect();
      const articleRect = article.getBoundingClientRect();
      const tableOfContentsRect = tableOfContents.getBoundingClientRect();

      return {
        leadingSpace: articleRect.left - layoutRect.left,
        columnGap: tableOfContentsRect.left - articleRect.right,
        trailingSpace: layoutRect.right - tableOfContentsRect.right,
      };
    });

  expect(Math.abs(spacing.leadingSpace - spacing.trailingSpace)).toBeLessThanOrEqual(
    1,
  );
  expect(spacing.columnGap).toBeLessThanOrEqual(64);
});

test("offers system, light, and dark appearance modes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/quickstart");

  const html = page.locator("html");
  const code = page.locator("code.shiki.not-inline").first();
  const trigger = page.getByTestId("theme-menu-trigger");

  await expect(trigger).toHaveAttribute("data-theme", "system");
  await expect(html).toHaveClass("dark");
  await expect(code).toHaveCSS("background-color", "rgb(11, 18, 32)");

  await trigger.click();
  const lightOption = page.getByRole("menuitemradio", {
    name: "Light",
    exact: true,
  });
  await lightOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "light");
  await expect(html).toHaveClass("light");
  await expect(code).toHaveCSS("background-color", "rgb(246, 248, 250)");
  await expect(lightOption).toBeHidden();

  await trigger.click();
  const darkOption = page.getByRole("menuitemradio", {
    name: "Dark",
    exact: true,
  });
  await darkOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveClass("dark");
  await expect(code).toHaveCSS("background-color", "rgb(11, 18, 32)");
  await expect(darkOption).toBeHidden();

  await trigger.click();
  const systemOption = page.getByRole("menuitemradio", {
    name: "System",
    exact: true,
  });
  await systemOption.click();
  await expect(trigger).toHaveAttribute("data-theme", "system");
  await expect(html).toHaveClass("dark");
  await expect(code).toHaveCSS("background-color", "rgb(11, 18, 32)");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveClass("light");
  await expect(code).toHaveCSS("background-color", "rgb(246, 248, 250)");
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

  for (const guide of docsPages) {
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

  for (const hash of [
    "api-reference",
    "tag/Calls",
    "/tag/Calls",
    "description/auth",
    "/description/auth",
    "models",
    "/models",
  ]) {
    await page.goto(`/#${hash}`);
    await expect(page).toHaveURL(/\/api-reference(?:\/calls)?$/);
  }

  await page.goto("/#calls?section=idempotency");
  await expect(page).toHaveURL(/\/calls#idempotency$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/quickstart$/);

  await page.goto("/#not-a-docs-route");
  await expect(page).toHaveURL(/\/#not-a-docs-route$/);
});

test("renders every migrated guide from its file route", async ({ page }) => {
  for (const guide of docsPages) {
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

test("uses the CALL-E Web palette for docs chrome", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/quickstart");

  const guideNav = page.locator(
    'nav[class*="overflow-y-auto"][class*="shrink-0"]',
  );
  const activeGuide = guideNav.locator('a[href="/quickstart"]');
  const dashboard = page.getByRole("link", {
    name: "Dashboard",
    exact: true,
  });

  await expect(page.locator("body")).toHaveCSS("color", "rgb(46, 47, 51)");
  await expect(guideNav).toHaveCSS(
    "background-color",
    "rgb(244, 249, 255)",
  );
  await expect(activeGuide).toHaveCSS(
    "background-color",
    "rgb(239, 246, 255)",
  );
  await expect(activeGuide).toHaveCSS(
    "box-shadow",
    /rgb\(37, 99, 235\).*2px/,
  );
  await expect(dashboard).toHaveCSS(
    "background-color",
    "rgb(38, 39, 43)",
  );

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 24, 39)",
  );
  await expect(guideNav).toHaveCSS(
    "background-color",
    "rgb(17, 24, 39)",
  );
  await expect(activeGuide).toHaveCSS(
    "background-color",
    "rgb(30, 58, 95)",
  );
  await expect(activeGuide).toHaveCSS(
    "box-shadow",
    /rgb\(96, 165, 250\).*2px/,
  );
  await expect(dashboard).toHaveCSS(
    "background-color",
    "rgb(247, 250, 253)",
  );
  await expect(dashboard).toHaveCSS("color", "rgb(17, 24, 39)");
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
  await expect(page.getByRole("heading", { name: "Ruby HTTP example" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ruby example", exact: true })).toHaveAttribute(
    "href", "https://github.com/CALLE-AI/calle-docs/blob/main/examples/calls.rb",
  );

});

test("switches complete examples without a separate Ruby contents entry", async ({
  page, context, request,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const { width, colorScheme } of [
    { width: 1280, colorScheme: "light" },
    { width: 1280, colorScheme: "dark" },
    { width: 390, colorScheme: "light" },
    { width: 390, colorScheme: "dark" },
  ] as const) {
    await page.goto("about:blank");
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    const dark = colorScheme === "dark";
    await page.goto("/quickstart#run-a-complete-example");
    const python = page.getByRole("tab", { name: "Python", exact: true });
    const ruby = page.getByRole("tab", { name: "Ruby", exact: true });
    await expect(python).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Python", exact: true })).toContainText(
      'python examples/calls.py start ../calle-run --phone "$CALLE_TEST_PHONE"',
    );
    await ruby.click();
    await expect(ruby).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Ruby", exact: true })).toContainText(
      "ruby examples/calls.rb start ../calle-ruby-run --execute --confirm-authorized-recipient",
    );
    await expect(page.getByRole("tabpanel", { name: "Python", exact: true })).toBeHidden();
    const codeTabs = page.locator(".code-block-wrapper").filter({ has: ruby });
    const ordinaryCode = page.locator("pre > .code-block-wrapper").first();
    for (const block of [ordinaryCode, codeTabs]) {
      await expect(block).toHaveCSS("border-radius", "12px");
      await expect(block.locator(":scope > div").first()).toHaveCSS(
        "background-color", dark ? "rgb(17, 28, 46)" : "rgb(238, 242, 246)",
      );
      await expect(block.locator("code.shiki")).toHaveCSS(
        "background-color", dark ? "rgb(11, 18, 32)" : "rgb(246, 248, 250)",
      );
    }
    await expect(ruby).toHaveCSS(
      "background-color", dark ? "rgb(30, 54, 84)" : "rgb(219, 234, 254)",
    );
    const comment = page.getByText("# Preview without sending a request", { exact: true });
    await expect(comment).toHaveCSS("color", dark ? "rgb(139, 148, 158)" : "rgb(106, 115, 125)");
    const commentContrast = await comment.evaluate((element) => {
      const luminance = (color: string) => {
        const rgb = color.match(/\d+/g)!.slice(0, 3).map(Number).map((v) => {
          const c = v / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const foreground = luminance(getComputedStyle(element).color);
      const background = luminance(getComputedStyle(element.closest(".code-block")!).backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(commentContrast).toBeGreaterThanOrEqual(4.5);
    await codeTabs.getByRole("button", { name: "Copy code", exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("ruby examples/calls.rb resume ../calle-ruby-run");
    expect(copied).not.toContain("python examples/");
    await ruby.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(python).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(ruby).toHaveAttribute("aria-selected", "true");
    await expect(ruby).toHaveCSS("outline-width", "2px");
    await expect(page.locator('aside a[href="#ruby-http-example"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await codeTabs.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`example-tabs-${width}-${colorScheme}.png`) });
  }
  await page.goto("/quickstart#ruby-http-example");
  await expect(page.locator("#ruby-http-example")).toHaveCount(1);
  for (const route of ["/quickstart.md", "/llms-full.txt"]) {
    const result = await request.get(route);
    expect(result.ok()).toBe(true);
    const text = await result.text();
    expect(text).toContain("python examples/calls.py resume ../calle-run");
    expect(text).toContain("ruby examples/calls.rb resume ../calle-ruby-run");
  }
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
  await expect(
    page.getByText(/does not use a webhook secret/),
  ).toBeVisible();
  await expect(page.getByText(/cryptographic proof of the sender/)).toBeVisible();

  await page.goto("/sdks");
  await expect(
    page.getByRole("link", { name: "CALLE-AI/server-sdk-typescript" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-typescript",
  );
  await expect(page.getByText("@call-e/calle@0.7.0").first()).toBeVisible();
  await expect(page.getByText("calle-ai==0.7.0").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CALLE-AI/server-sdk-python" }),
  ).toHaveAttribute("href", "https://github.com/CALLE-AI/server-sdk-python");
});

test("recommends Goal Runs for scale with upcoming pricing on the Calls guide", async ({ page, request }, testInfo) => {
  const markdown = await request.get("/calls.md");
  expect(markdown.ok()).toBe(true);
  const text = await markdown.text();
  for (const phrase of ["quick integration, development, and testing", "batch and large-scale calling", "50% less", "upcoming billing model", "This pricing is not yet in effect."]) {
    expect(text).toContain(phrase);
  }
  expect(text).toContain("[Goal Runs](/goal-runs)");
  expect(text).toContain("[upcoming billing model](/billing)");

  for (const width of [1280, 390, 320]) {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/calls");
      const guidance = page.getByRole("complementary", { name: "Calling mode guidance" });
      await expect(guidance).toBeVisible();
      await expect(guidance).toContainText("POST /v1/calls");
      await expect(guidance).toContainText("quick integration, development, and testing");
      await expect(guidance).toContainText("50% less");
      await expect(guidance).toContainText("This pricing is not yet in effect.");
      await expect(guidance.getByRole("link", { name: "Goal Runs", exact: true })).toHaveAttribute("href", "/goal-runs");
      await expect(guidance.getByRole("link", { name: "upcoming billing model" })).toHaveAttribute("href", "/billing");
      const guidanceBox = (await guidance.boundingBox())!;
      const inputsBox = (await page.getByRole("heading", { level: 2, name: /^Call inputs/ }).boundingBox())!;
      expect(guidanceBox.y + guidanceBox.height).toBeLessThan(inputsBox.y);
      expect(guidanceBox.x).toBeGreaterThanOrEqual(0);
      expect(guidanceBox.x + guidanceBox.width).toBeLessThanOrEqual(width);
      expect(await guidance.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await guidance.screenshot({ path: testInfo.outputPath(`calls-guidance-${width}-${colorScheme}.png`) });
    }
  }
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

  await expect(
    callsBody.getByRole("heading", { name: "Call identifiers" }),
  ).toBeVisible();
  await expect(callsBody).toContainText(
    "recipients[].attempts[].provider_call_id",
  );
  await expect(callsBody).toContainText(
    "call.recipients[i].attempts[j].providerCallId",
  );
  await expect(callsBody).toContainText(
    "the webhook's top-level id identifies the event",
  );
  await expect(callsBody).toContainText(
    "Do not use provider_call_id as call_id",
  );

  await expect(
    callsBody.getByRole("heading", {
      name: "Classify the final endpoint",
    }),
  ).toBeVisible();
  await expect(callsBody).toContainText(
    "does not return a built-in AMD disposition",
  );
  await expect(callsBody).toContainText(
    "You control the property name and enum values",
  );
  await expect(callsBody).toContainText(
    "recipientResultSchema:",
  );
  await expect(callsBody).toContainText(
    "call.recipients[i].structuredResult",
  );
  await expect(callsBody).toContainText(
    'call["recipients"][i]["structured_result"]',
  );
  await expect(callsBody).toContainText(
    "recipients[i].structured_result over HTTP",
  );
  await expect(callsBody).toContainText(
    'enum: ["human", "ivr", "voicemail", "unknown"]',
  );
  await expect(callsBody).toContainText(
    "request omits recipient_result_schema",
  );

  const outcomeGuidance = callsBody.getByRole("link", {
    name: "Accepted call execution outcomes",
  });
  await expect(outcomeGuidance).toHaveAttribute(
    "href",
    "/errors#accepted-call-execution-outcomes",
  );
  await outcomeGuidance.click();

  await expect(page).toHaveURL(/\/errors#accepted-call-execution-outcomes$/);
  await expect(
    page.getByRole("heading", { name: "Accepted call execution outcomes" }),
  ).toBeVisible();
  const callsOutcomeWarning = page.locator("main p").filter({
    hasText: "do not define Calls API",
  });
  await expect(callsOutcomeWarning).toContainText(
    "keep the business outcome unresolved",
  );
  await expect(
    callsOutcomeWarning.locator("code").filter({ hasText: "failure_code" }),
  ).toBeVisible();
});

test("links result examples to task completion and endpoint classification", async ({
  page,
}) => {
  for (const route of ["/quickstart", "/webhooks"]) {
    await page.goto(route);
    await page.locator('p a[href="/calls#task-completion"]').first().click();
    await expect(page).toHaveURL(/\/calls#task-completion$/);
    await expect(
      page.getByRole("heading", { name: "Task completion" }),
    ).toBeVisible();
  }

  await page.getByRole("link", { name: "custom answered_by example" }).click();
  await expect(page).toHaveURL(/\/calls#classify-the-final-endpoint$/);
  await expect(
    page.getByRole("heading", { name: "Classify the final endpoint" }),
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
    page.locator('a[href="/goal-runs"]').first(),
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
