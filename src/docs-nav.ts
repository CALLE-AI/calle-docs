export type GuideSlug =
  | "quickstart"
  | "authentication"
  | "calls"
  | "webhooks"
  | "errors"
  | "sdks"
  | "changelog";

export type TocItem = {
  id: string;
  title: string;
};

export type GuideNavItem = {
  type: "guide";
  slug: GuideSlug;
  title: string;
  href: string;
  description: string;
  toc: TocItem[];
};

export type ApiReferenceNavItem = {
  type: "api-reference";
  title: string;
  href: string;
  description: string;
};

export type DocsNavItem = GuideNavItem | ApiReferenceNavItem;

export const guideNavItems: GuideNavItem[] = [
  {
    type: "guide",
    slug: "quickstart",
    title: "Quickstart",
    href: "#/quickstart",
    description: "Create one call and read the structured result.",
    toc: [
      { id: "install", title: "Install" },
      { id: "create-a-client", title: "Create a client" },
      { id: "create-and-wait", title: "Create and wait" },
      { id: "read-the-result", title: "Read the result" },
    ],
  },
  {
    type: "guide",
    slug: "authentication",
    title: "Authentication",
    href: "#/authentication",
    description: "Use API keys safely from trusted server environments.",
    toc: [
      { id: "api-keys", title: "API keys" },
      { id: "authorization-header", title: "Authorization header" },
      { id: "environments", title: "Environments" },
      { id: "server-only", title: "Server-only usage" },
      { id: "webhook-secrets", title: "Webhook secrets" },
      { id: "auth-errors", title: "Auth errors" },
    ],
  },
  {
    type: "guide",
    slug: "calls",
    title: "Calls",
    href: "#/calls",
    description: "Understand the call creation contract and event flow.",
    toc: [
      { id: "call-inputs", title: "Call inputs" },
      { id: "structured-results", title: "Structured results" },
      { id: "idempotency", title: "Idempotency" },
      { id: "polling-and-events", title: "Polling and events" },
    ],
  },
  {
    type: "guide",
    slug: "webhooks",
    title: "Webhooks",
    href: "#/webhooks",
    description: "Verify terminal webhooks and process events safely.",
    toc: [
      { id: "terminal-events", title: "Terminal events" },
      { id: "signature-verification", title: "Signature verification" },
      { id: "example-servers", title: "Example servers" },
      { id: "idempotent-handling", title: "Idempotent handling" },
    ],
  },
  {
    type: "guide",
    slug: "errors",
    title: "Errors",
    href: "#/errors",
    description: "Handle stable API errors and recovery paths.",
    toc: [
      { id: "error-envelope", title: "Error envelope" },
      { id: "stable-error-codes", title: "Stable error codes" },
      { id: "recovery-guidance", title: "Recovery guidance" },
    ],
  },
  {
    type: "guide",
    slug: "sdks",
    title: "SDKs",
    href: "#/sdks",
    description: "Install the stable TypeScript and Python server SDKs.",
    toc: [
      { id: "packages", title: "Packages" },
      { id: "package-status", title: "Package status" },
      { id: "source-repositories", title: "Source repositories" },
      { id: "local-examples", title: "Local examples" },
      { id: "supported-methods", title: "Supported methods" },
      { id: "availability", title: "Availability" },
      { id: "supported-scope", title: "Supported scope" },
    ],
  },
  {
    type: "guide",
    slug: "changelog",
    title: "What's New",
    href: "#/changelog",
    description: "Track CALL-E Developer API and SDK product updates.",
    toc: [
      { id: "june-8-2026", title: "June 8, 2026" },
      {
        id: "developer-api-and-server-sdks",
        title: "What's New: Developer API and server SDKs",
      },
    ],
  },
];

export const apiReferenceNavItem: ApiReferenceNavItem = {
  type: "api-reference",
  title: "API Reference",
  href: "#/api-reference",
  description: "Read the OpenAPI-powered endpoint reference.",
};

export const docsNavItems: DocsNavItem[] = [
  ...guideNavItems,
  apiReferenceNavItem,
];

export function getGuideNavItem(slug: GuideSlug): GuideNavItem {
  const item = guideNavItems.find((navItem) => navItem.slug === slug);
  if (!item) {
    throw new Error(`Unknown guide slug: ${slug}`);
  }
  return item;
}

export function isGuideSlug(value: string): value is GuideSlug {
  return guideNavItems.some((item) => item.slug === value);
}
