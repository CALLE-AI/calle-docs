import { expect, type Page, test } from "@playwright/test";
import path from "node:path";

test("renders the default quickstart page inside the docs shell", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Quickstart" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "API Reference" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Webhooks" })).toBeVisible();
  await expect(
    page.locator(".code-block").filter({ hasText: "pnpm add @call-e/calle" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(".code-block").filter({ hasText: "pip install calle-ai" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("@call-e/calle@beta")).toHaveCount(0);
  await expect(page.getByText("Python SDK package is in preparation."))
    .toHaveCount(0);
  await expect(page.locator(".doc-badge", { hasText: "Phase 1" }))
    .toHaveCount(0);
  await expect(page.getByRole("link", { name: "Authentication", exact: true }))
    .toHaveAttribute("href", "#/authentication");
});

test("links the header brand back to the CALL-E website", async ({ page }) => {
  await page.goto("/");

  const brand = page.getByRole("link", { name: "Go to CALL-E website" });
  await expect(brand).toHaveAttribute("href", "https://www.heycall-e.com/");
  await expect(brand.getByRole("img", { name: "CALL-E" })).toBeVisible();
});

test("publishes the official CALL-E favicon metadata", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "./favicon.svg",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "./favicon.svg",
  );
  await expect(page.locator('meta[name="msapplication-TileImage"]'))
    .toHaveAttribute("content", "./favicon.svg");
});

test("shows minimal required fields in quickstart create examples", async ({
  page,
}) => {
  await page.goto("/");

  const taskOnlyJson = page.locator(".code-block", {
    hasText: /"task":\s*"[^"]*<E164_PHONE>[^"]*"/,
  }).first();
  await expect(taskOnlyJson).toBeVisible();
  await expect(taskOnlyJson).not.toContainText('"recipient"');
  await expect(taskOnlyJson).not.toContainText('"recipients"');

  await expect(page.locator(".code-block", {
    hasText: /task:\s*"[^"]*<E164_PHONE>[^"]*"/,
  }).first()).toBeVisible();
  await expect(page.locator(".code-block", {
    hasText: /task="[^"]*<E164_PHONE>[^"]*"/,
  }).first()).toBeVisible();
  await expect(page.getByText("call task").first()).toBeVisible();
  await expect(page.getByText('region: "US"')).toHaveCount(0);
  await expect(page.getByText('locale: "en-US"')).toHaveCount(0);
  await expect(page.getByText("workflow_run_id")).toHaveCount(0);
  await expect(page.getByText("idempotencyKey")).toHaveCount(0);
  await expect(page.getByText("idempotency_key")).toHaveCount(0);
  await expect(page.getByText("additionalProperties")).toHaveCount(0);
});

test("shows quickstart result examples", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.locator(".code-block", {
      hasText: /"status": "completed"[\s\S]*"structuredResult"[\s\S]*"can_hear_clearly"/,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".code-block", {
      hasText: /"status": "completed"[\s\S]*"taskCompleted"[\s\S]*"completionConfidence"[\s\S]*"evidence"/,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".code-block", {
      hasText: /"status": "completed"[\s\S]*"structured_result"[\s\S]*"can_hear_clearly"/,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".code-block", {
      hasText: /"status": "completed"[\s\S]*"task_completed"[\s\S]*"completion_confidence"[\s\S]*"evidence"/,
    }),
  ).toBeVisible();
  await expect(page.getByText("resultValidation")).toHaveCount(0);
  await expect(page.getByText("result_validation")).toHaveCount(0);
});

test("positions the primary navigation beside the brand", async ({ page }) => {
  await page.goto("/");

  const brandRight = await page.locator(".brand").evaluate((element) => {
    return element.getBoundingClientRect().right;
  });
  const navigationLeft = await page.locator(".topnav").evaluate((element) => {
    return element.getBoundingClientRect().left;
  });
  const activeBottom = await page.locator(".topnav a.active").evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      borderBottomColor: style.borderBottomColor,
      borderBottomWidth: style.borderBottomWidth,
    };
  });

  expect(navigationLeft).toBeLessThan(brandRight + 40);
  expect(activeBottom.borderBottomColor).toBe("rgb(15, 118, 110)");
  expect(activeBottom.borderBottomWidth).toBe("2px");
});

test("renders syntax-colored guide code blocks", async ({ page }) => {
  await page.goto("/");

  const codeBlock = page.locator(".code-block").filter({
    hasText: 'import { CalleClient } from "@call-e/calle";',
  }).first();

  const keyword = codeBlock.locator(".token-keyword", { hasText: "import" })
    .first();
  const stringToken = codeBlock.locator(".token-string", {
    hasText: "@call-e/calle",
  }).first();

  await expect(keyword).toBeVisible();
  await expect(stringToken).toBeVisible();

  const defaultCodeColor = await codeBlock.locator("pre").evaluate((element) => {
    return window.getComputedStyle(element).color;
  });
  const keywordColor = await keyword.evaluate((element) => {
    return window.getComputedStyle(element).color;
  });

  expect(keywordColor).not.toBe(defaultCodeColor);
});

test("keeps guide examples US-specific", async ({ page }) => {
  const guideHashes = ["/#/calls", "/#/sdks"];
  const nonUsExampleFragments = [
    "+8613800000000",
    'region: "CN"',
    '"region": "CN"',
    'locale: "zh-CN"',
    '"locale": "zh-CN"',
  ];

  for (const guideHash of guideHashes) {
    await page.goto(guideHash);
    await expect(page.getByText("<RECIPIENT_1_E164_PHONE>").first()).toBeVisible();
    await expect(page.getByText("en-US").first()).toBeVisible();

    for (const fragment of nonUsExampleFragments) {
      await expect(page.getByText(fragment)).toHaveCount(0);
    }
  }
});

test("uses phone placeholders instead of copy-pasteable example numbers", async ({
  page,
}) => {
  const guideHashes = ["/", "/#/calls", "/#/webhooks", "/#/errors", "/#/sdks"];
  const realLookingExampleNumbers = [
    "+14155550100",
    "+14155550101",
    "+8618585062540",
  ];

  for (const guideHash of guideHashes) {
    await page.goto(guideHash);
    await expect(page.getByText("<E164_PHONE>").or(
      page.getByText("<RECIPIENT_1_E164_PHONE>"),
    ).first()).toBeVisible();

    for (const phone of realLookingExampleNumbers) {
      await expect(page.getByText(phone)).toHaveCount(0);
    }
  }
});

test("documents call tasks with plural recipients and no legacy recipient field", async ({
  page,
}) => {
  const guideHashes = ["/", "/#/calls", "/#/webhooks", "/#/sdks"];

  for (const guideHash of guideHashes) {
    await page.goto(guideHash);
    await expect(page.getByText("call task").first()).toBeVisible();
    await expect(
      page.locator(".code-block").filter({ hasText: /"recipient"\s*:\s*\{/ }),
    ).toHaveCount(0);
    await expect(
      page.locator(".code-block").filter({ hasText: /recipient:\s*\{/ }),
    ).toHaveCount(0);
    await expect(
      page.locator(".code-block").filter({ hasText: /recipient=\s*\{/ }),
    ).toHaveCount(0);
  }

  for (const guideHash of ["/#/calls", "/#/webhooks", "/#/sdks"]) {
    await page.goto(guideHash);
    await expect(page.getByText("recipients").first()).toBeVisible();
  }
});

test("documents webhook recipient attempts", async ({ page }) => {
  await page.goto("/#/webhooks");

  await expect(
    page.locator(".code-block").filter({
      hasText: /"recipients"[\s\S]*"attempts"[\s\S]*"provider_call_id"/,
    }).first(),
  ).toBeVisible();
  await expect(page.getByText("transcript_turns").first()).toBeVisible();
  await expect(
    page.locator(".code-block").filter({
      hasText: /"transcript_turns"[\s\S]*"offset_seconds"[\s\S]*"speaker"[\s\S]*"text"/,
    }).first(),
  ).toBeVisible();
});

test("renders all guide pages from navigation", async ({ page }) => {
  const guides = [
    {
      hash: "#/authentication",
      heading: "Authentication",
      text: "Authorization: Bearer",
    },
    { hash: "#/calls", heading: "Calls", text: "result_schema" },
    { hash: "#/webhooks", heading: "Webhooks", text: "structured_result" },
    { hash: "#/errors", heading: "Errors", text: "idempotency_conflict" },
    { hash: "#/sdks", heading: "SDKs", text: "server-sdk-typescript" },
    {
      hash: "#/changelog",
      heading: "What's New",
      text: "What's New: Developer API and server SDKs",
    },
  ];

  for (const guide of guides) {
    await page.goto(`/${guide.hash}`);
    await expect(
      page.getByRole("heading", { exact: true, name: guide.heading }),
    ).toBeVisible();
    await expect(page.getByText(guide.text).first()).toBeVisible();
  }
});

test("documents API key authentication and server-only boundaries", async ({
  page,
}) => {
  await page.goto("/#/authentication");

  await expect(
    page.getByRole("heading", { name: "Authentication" }),
  ).toBeVisible();
  await expect(page.getByText('export CALLE_API_KEY="calle_test_key"'))
    .toBeVisible();
  await expect(
    page.getByRole("link", { name: "CALL-E dashboard", exact: true }),
  ).toHaveAttribute("href", "https://dashboard.heycall-e.com/account/api-keys");
  await expect(
    page.getByText("Authorization: Bearer $CALLE_API_KEY"),
  ).toBeVisible();
  await expect(
    page.getByText("Do not commit API keys, print them in logs"),
  ).toBeVisible();
  await expect(page.getByText("The CALL-E SDKs are server SDKs"))
    .toBeVisible();
  await expect(page.getByText("CALLE_WEBHOOK_SECRET")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Webhooks", exact: true }),
  ).toHaveAttribute("href", "#/webhooks");
});

test("documents public What's New updates", async ({ page }) => {
  await page.goto("/#/changelog");

  await expect(
    page.getByRole("heading", { exact: true, name: "What's New" }),
  ).toBeVisible();
  await expect(page.getByText("Product updates for the CALL-E Developer API"))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "June 8, 2026" }))
    .toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "What's New: Developer API and server SDKs",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".code-block").filter({ hasText: "pnpm add @call-e/calle" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(".code-block").filter({ hasText: "pip install calle-ai" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("@call-e/calle@beta")).toHaveCount(0);
  await expect(page.getByText("Python SDK support is in preparation."))
    .toHaveCount(0);
  await expect(page.getByText("Create outbound call tasks")).toBeVisible();
  await expect(page.getByText("Phase 1")).toHaveCount(0);
  await expect(page.getByText(["pend", "ing", " publisher"].join("")))
    .toHaveCount(0);
  await expect(page.getByText(["release", " run", "book"].join("")))
    .toHaveCount(0);
  await expect(page.getByText(`publish-${"npm"}.yml`)).toHaveCount(0);
  await expect(page.locator(".topnav a", { hasText: "What's New" })).toHaveClass(
    /active/,
  );
});

test("documents SDK source repositories and stable package availability", async ({
  page,
}) => {
  await page.goto("/#/sdks");

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
  await expect(page.locator("li code", { hasText: "@call-e/calle@0.2.0" }))
    .toBeVisible();
  await expect(page.locator("li code", { hasText: "calle-ai==0.2.0" }))
    .toBeVisible();
  await expect(page.getByText("Phase 1")).toHaveCount(0);
  await expect(
    page.locator(".code-block").filter({ hasText: "pnpm add @call-e/calle" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(".code-block").filter({ hasText: "pip install calle-ai" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("@call-e/calle@beta")).toHaveCount(0);
  await expect(page.getByText("Python SDK support is in preparation."))
    .toHaveCount(0);
  await expect(page.getByText(["Test", "Py", "PI"].join(""))).toHaveCount(0);
  await expect(page.getByText(["Py", "PI", " packages"].join("")))
    .toHaveCount(0);
  await expect(page.getByText(["rehe", "arsal"].join(""))).toHaveCount(0);
  await expect(page.getByText(["pend", "ing"].join(""))).toHaveCount(0);
  await expect(page.getByText("Each repository includes public source code"))
    .toBeVisible();
  await expect(page.getByText(["release", "checklist"].join(" ")))
    .toHaveCount(0);
  await expect(page.getByText(["SDK", "release", "run", "book"].join(" ")))
    .toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Python security policy" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-python/blob/main/SECURITY.md",
  );
  await expect(page.getByText("pnpm run example:webhook")).toBeVisible();
  await expect(page.getByText("uv run python examples/webhook_server.py"))
    .toBeVisible();

  const tableBackground = await page
    .locator(".guide-article table th")
    .first()
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  expect(tableBackground).toBe("rgb(249, 250, 251)");
});

test("links webhook guides to runnable SDK webhook server examples", async ({
  page,
}) => {
  await page.goto("/#/webhooks");

  await expect(
    page.getByRole("link", { name: "TypeScript webhook server" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-typescript/blob/main/examples/webhook-server.ts",
  );
  await expect(
    page.getByRole("link", { name: "Python webhook server" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/CALLE-AI/server-sdk-python/blob/main/examples/webhook_server.py",
  );
  await expect(page.getByText("POST /calle/webhook")).toBeVisible();
  await expect(
    page.locator("p code", { hasText: "client.webhooks.unwrap" }),
  ).toBeVisible();
});

test("renders the read-only Scalar API Reference from the OpenAPI contract", async ({
  page,
}) => {
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;

  await expect(
    page.getByRole("navigation", { name: "API Reference navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "POST Create Call /v1/calls" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "POST Create Call /v1/calls" }),
  ).toHaveClass(/active/);
  await expect(
    page.getByRole("link", {
      name: "GET List Call Events /v1/calls/{call_id}/events",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "POST Server Message /calle/webhook",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Models" })).toHaveCount(0);
  await expect(
    page.locator(".api-reference-nav-label", { hasText: "Schemas" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".api-reference-page .references-rendered")
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(400);
  await expect(page.locator(".api-reference-page .t-doc__header"))
    .toHaveCSS("display", "none");
  await page.setViewportSize({ width: 835, height: 700 });
  await expect
    .poll(() =>
      page
        .locator(".api-reference-page .references-rendered")
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(300);
  await expect(page.getByLabel("Docs navigation")).toHaveCount(0);
  await expect(page.getByText("Create one call and read the structured result."))
    .toHaveCount(0);
  await page.getByRole("link", { name: "POST Create Call /v1/calls" }).click();
  await expect(page).toHaveURL(/section=api-1%2Ftag%2Fcalls%2FPOST%2Fv1%2Fcalls/);
  const createCallRegion = page.getByRole("region", {
    name: "Create Call",
  });
  await expect
    .poll(() =>
      createCallRegion.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThanOrEqual(70);
  await expectNoVisibleText(page, "CALL-E Developer API");
  await expect(
    createCallRegion.getByRole("heading", {
      name: "Create Call",
    }),
  ).toBeVisible();
  await expect(
    createCallRegion.getByText("Stable caller-provided key", { exact: false })
      .first(),
  ).toBeVisible();
  await expect(
    createCallRegion.getByText("Natural-language instruction for the call task", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expect(
    createCallRegion.getByText("Optional explicit recipients for this call task", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expect(
    createCallRegion.getByText("JSON Schema object that defines", {
      exact: false,
    }).first(),
  ).toBeVisible();
  const responseToggle = createCallRegion.locator(
    'ul[aria-label="Responses"] > li:first-child > button',
  );
  if ((await responseToggle.getAttribute("aria-expanded")) === "false") {
    await responseToggle.click();
  }
  await expect(responseToggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    createCallRegion.getByText("Public CALL-E call task identifier", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expect(
    createCallRegion.getByText("Structured result object extracted", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expectNoVisibleText(page, "400 Stable API error.");
  await expectNoVisibleText(page, "401 Stable API error.");
  await expect(createCallRegion.getByRole("tab", { name: "Status: 201" }))
    .toBeVisible();
  const narrowRenderedWidth = await page
    .locator(".api-reference-page .references-rendered")
    .evaluate((element) => element.getBoundingClientRect().width);
  const narrowDarkCardWidth = await page
    .locator(".api-reference-page .scalar-card.dark-mode")
    .first()
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(narrowDarkCardWidth).toBeLessThanOrEqual(narrowRenderedWidth);
  await expect(page.getByText("Try it")).toHaveCount(0);
  await expectNoVisibleText(page, "Test Request");
  await expectNoVisibleText(page, "Send Request");
  await expectNoVisibleText(page, "Developer Tools");
  await expectNoVisibleText(page, "Configure");
  await expectNoVisibleText(page, "Share");
  await expectNoVisibleText(page, "Deploy");
  await expect(
    page.locator('[data-addressbar-action="send"]:visible'),
  ).toHaveCount(0);

  await page.goto("/#tag/calls/POST/v1/calls");
  await expect(
    page.getByRole("navigation", { name: "API Reference navigation" }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /#\/api-reference\?section=api-1%2Ftag%2Fcalls%2FPOST%2Fv1%2Fcalls/,
  );
  await expect
    .poll(() =>
      page
        .getByRole("region", { name: "Create Call" })
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThanOrEqual(70);
  await expect(
    page.getByRole("region", { name: "Create Call" })
      .getByText("Natural-language instruction for the call", {
        exact: false,
      }),
  ).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("region", { name: "Get Call" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "List Call Events" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Server Message" }),
  ).toHaveCount(0);
});

test("loads the OpenAPI document relative to the published page path", async ({
  page,
}) => {
  await page.route("**/calle-docs-site/**", async (route) => {
    const url = new URL(route.request().url());
    const relativePath =
      url.pathname.replace(/^\/calle-docs-site\/?/, "") || "index.html";
    await route.fulfill({
      path: path.join(process.cwd(), "dist", relativePath),
    });
  });

  const openApiResponse = page.waitForResponse((response) => {
    return (
      new URL(response.url()).pathname ===
        "/calle-docs-site/openapi/calle.openapi.yaml" &&
      response.status() === 200
    );
  });

  await page.goto("/calle-docs-site/#/api-reference");
  await openApiResponse;

  await expect(
    page.getByRole("link", { name: "POST Create Call /v1/calls" }),
  ).toBeVisible();
});

test("renders the webhook Server Message reference like an inbound endpoint", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;
  await page.getByRole("link", {
    name: "POST Server Message /calle/webhook",
  }).click();

  await expect(page).toHaveURL(
    /section=api-1%2Ftag%2Fwebhooks%2FPOST%2Fcalle%2Fwebhook/,
  );

  const webhookRegion = page.getByRole("region", {
    name: "Server Message",
  });
  await expect(
    webhookRegion.getByRole("heading", { name: "Server Message" }),
  ).toBeVisible();
  await expect(
    webhookRegion.getByText("https://{yourserver}.com/calle/webhook"),
  ).toBeVisible();
  await expect(webhookRegion.getByText("Auth Required")).toHaveCount(0);
  await expect(
    webhookRegion.locator(".property-name", { hasText: "CALL-E-Event-Id" }),
  ).toBeVisible();
  await expect(
    webhookRegion.locator(".property-name", { hasText: "CALL-E-Timestamp" }),
  ).toBeVisible();
  await expect(
    webhookRegion.locator(".property-name", { hasText: "CALL-E-Signature" }),
  ).toBeVisible();
  await expect(
    webhookRegion.getByText("Event payload CALL-E sends", { exact: false }),
  ).toBeVisible();
  await expect(
    webhookRegion.getByText("Terminal call task snapshot", { exact: false }),
  ).toBeVisible();
  await expect(
    webhookRegion.getByText("curl https://example.com/calle/webhook", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    webhookRegion.locator(
      'ul[aria-label="Responses"] > li:first-child > button',
    ),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    webhookRegion.getByText("CALL-E treats any 2xx response as delivered", {
      exact: false,
    }),
  ).toBeVisible();
});

test("keeps the API Reference pinned to the selected API", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;

  await page.getByRole("link", {
    name: "GET List Call Events /v1/calls/{call_id}/events",
  }).click();

  await expect(
    page.getByRole("region", { name: "List Call Events" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Create Call" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Get Call" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Server Message" }),
  ).toHaveCount(0);

  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() =>
      page
        .getByRole("region", { name: "List Call Events" })
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThanOrEqual(56);
  await expect(
    page.getByRole("region", { name: "Server Message" }),
  ).toHaveCount(0);
  expect(scrollHeight).toBeLessThan(2200);
});

test("allows immediate scrolling after selecting an API", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;
  await page.getByRole("link", { name: "POST Create Call /v1/calls" }).click();

  await expect(page.getByRole("region", { name: "Create Call" }))
    .toBeVisible();
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(350);

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(200);
});

test("keeps the API sample column within one viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;
  await page.getByRole("link", { name: "POST Create Call /v1/calls" }).click();

  const rightColumn = page
    .locator("#api-1\\/tag\\/calls\\/POST\\/v1\\/calls .section-columns")
    .locator(":scope > .section-column")
    .nth(1);
  await expect(rightColumn).toBeVisible();

  const initialBox = await rightColumn.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      height: rect.height,
      top: rect.top,
    };
  });
  expect(initialBox.height).toBeLessThanOrEqual(812);

  await page.evaluate((top) => {
    window.scrollBy(0, top - 80);
  }, initialBox.top);
  await page.waitForTimeout(200);

  const visibleBox = await rightColumn.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      height: rect.height,
      top: rect.top,
    };
  });
  expect(visibleBox.top).toBeGreaterThanOrEqual(68);
  expect(visibleBox.top).toBeLessThanOrEqual(120);
  expect(visibleBox.bottom).toBeLessThanOrEqual(900);
  expect(visibleBox.height).toBeLessThanOrEqual(812);
});

test("renders API Reference with a Vapi-like desktop endpoint layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference");
  await openApiResponse;
  await page.getByRole("link", { name: "POST Create Call /v1/calls" }).click();

  const sidebarWidth = await page.locator(".api-reference-sidebar").evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(sidebarWidth).toBeGreaterThanOrEqual(300);

  const contentBox = await page
    .locator("#api-1\\/tag\\/calls\\/POST\\/v1\\/calls .section-content")
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        rightGap: window.innerWidth - rect.right,
        width: rect.width,
      };
    });
  expect(contentBox.width).toBeGreaterThan(1400);
  expect(contentBox.rightGap).toBeLessThan(2);

  const sectionColumns = page
    .locator("#api-1\\/tag\\/calls\\/POST\\/v1\\/calls .section-columns")
    .locator(":scope > .section-column");
  await expect(sectionColumns).toHaveCount(2);

  const leftColumnBox = await sectionColumns.nth(0).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width };
  });
  const rightColumnBox = await sectionColumns.nth(1).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width };
  });
  expect(rightColumnBox.x).toBeGreaterThan(leftColumnBox.x + leftColumnBox.width);
  expect(Math.abs(rightColumnBox.y - leftColumnBox.y)).toBeLessThan(80);
  expect(rightColumnBox.width).toBeGreaterThan(600);

  const darkCardBackground = await page
    .locator(".api-reference-page .scalar-card.dark-mode")
    .first()
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  expect(darkCardBackground).toBe("rgb(17, 24, 39)");

  const responseCard = page.locator(
    "#api-1\\/tag\\/calls\\/POST\\/v1\\/calls .response-card",
  );
  const visibleResponseRows = await page
    .locator(
      '#api-1\\/tag\\/calls\\/POST\\/v1\\/calls ul[aria-label="Responses"] > li',
    )
    .evaluateAll((items) => {
      return items.flatMap((item) => {
        const style = window.getComputedStyle(item);
        const rect = item.getBoundingClientRect();
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0 ||
          rect.height === 0
        ) {
          return [];
        }

        return [item.textContent?.replace(/\s+/g, " ").trim() ?? ""];
      });
    });
  expect(visibleResponseRows).toHaveLength(1);
  const visibleResponseRow = visibleResponseRows[0] ?? "";
  expect(visibleResponseRow).toContain("201 Call task accepted.");
  await expect(responseCard).toHaveCSS("background-color", "rgb(17, 24, 39)");
  await expect(responseCard.locator(".scalar-code-block"))
    .toHaveCSS("background-color", "rgb(11, 15, 25)");
  const visibleResponseControls = await responseCard.evaluate((element) => {
    return Array.from(
      element.querySelectorAll(".tab, .scalar-card-checkbox"),
    ).flatMap((control) => {
      const style = window.getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width === 0 ||
        rect.height === 0
      ) {
        return [];
      }

      return [control.textContent?.replace(/\s+/g, " ").trim() ?? ""];
    });
  });
  expect(visibleResponseControls).toEqual(["Status: 201"]);

  const responseCodeDefaultColor = await responseCard
    .locator("code")
    .evaluate((element) => window.getComputedStyle(element).color);
  const responseKeyColor = await responseCard
    .locator(".hljs-attr", { hasText: '"id"' })
    .first()
    .evaluate((element) => window.getComputedStyle(element).color);
  const responseStringColor = await responseCard
    .locator(".hljs-string", { hasText: "call_123" })
    .first()
    .evaluate((element) => window.getComputedStyle(element).color);

  expect(responseKeyColor).not.toBe(responseCodeDefaultColor);
  expect(responseStringColor).not.toBe(responseKeyColor);
});

test("omits API Reference schemas from navigation and rendered content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const openApiResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/openapi/calle.openapi.yaml") &&
      response.status() === 200
    );
  });

  await page.goto("/#/api-reference?section=api-1%2Fmodels");
  await openApiResponse;

  await expect(
    page.getByRole("link", { name: "POST Create Call /v1/calls" }),
  ).toHaveClass(/active/);
  await expect(page.getByRole("link", { name: "Models" })).toHaveCount(0);
  await expect(
    page.locator(".api-reference-nav-label", { hasText: "Schemas" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Models" })).toHaveCount(0);
  await expect(page.locator("#api-1\\/models:visible")).toHaveCount(0);
});

test("page toc links preserve the guide route and scroll to sections", async ({
  page,
}) => {
  await page.goto("/");

  const scrollYBeforeClick = await page.evaluate(() => window.scrollY);

  await page.getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Read the result" })
    .click();

  await expect(page).toHaveURL(/#\/quickstart\?section=read-the-result$/);

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrollYBeforeClick);

  const headingTop = await page.locator("#read-the-result").evaluate((element) => {
    return element.getBoundingClientRect().top;
  });
  expect(headingTop).toBeGreaterThanOrEqual(56);
});

async function expectNoVisibleText(page: Page, text: string) {
  await expect
    .poll(async () => {
      return page.getByText(text).evaluateAll((elements) => {
        return elements.filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );
        }).length;
      });
    })
    .toBe(0);
}
