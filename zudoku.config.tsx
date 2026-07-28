import type { ZudokuConfig } from "zudoku";
import { ScrollToTop } from "./src/components/ScrollToTop.js";
import { ThemeMenu } from "./src/components/ThemeMenu.js";
import "./src/styles.css";

const legacyHashRedirect = `
(() => {
  if (window.location.pathname !== "/") return;

  const [route, query = ""] = window.location.hash.slice(1).split("?", 2);
  const guideRoutes = new Set([
    "/quickstart",
    "/authentication",
    "/calls",
    "/goal-runs",
    "/webhooks",
    "/errors",
    "/sdks",
    "/changelog",
  ]);

  if (guideRoutes.has(route)) {
    const section = new URLSearchParams(query).get("section");
    window.location.replace(
      section ? \`\${route}#\${encodeURIComponent(section)}\` : route,
    );
    return;
  }

  if (
    route === "/api-reference" ||
    route.startsWith("/api-1/") ||
    route.startsWith("tag/") ||
    route.startsWith("description/") ||
    route === "models"
  ) {
    window.location.replace("/api-reference");
    return;
  }

  window.location.replace("/quickstart");
})();
`;

const config = {
  port: 5174,
  canonicalUrlOrigin: "https://docs.heycall-e.com",
  metadata: {
    title: "%s | CALL-E Developer Docs",
    defaultTitle: "CALL-E Developer Docs",
    description:
      "Guides and API reference for building server-side CALL-E integrations.",
    favicon: "/favicon.svg",
    applicationName: "CALL-E Developer Docs",
  },
  site: {
    logo: {
      src: {
        light: "/call-e-logo.svg",
        dark: "/call-e-logo.svg",
      },
      alt: "CALL-E",
      width: "100px",
      href: "https://www.heycall-e.com/",
      reloadDocument: true,
    },
    showPoweredBy: false,
  },
  header: {
    themeSwitcher: {
      enabled: false,
    },
    navigation: [
      {
        label: "Website",
        to: "https://www.heycall-e.com/",
        target: "_blank",
      },
      {
        label: "Dashboard",
        to: "https://dashboard.heycall-e.com/",
        target: "_blank",
      },
    ],
    placements: {
      navigation: "end",
      search: "center",
    },
  },
  slots: {
    "head-navigation-end": () => (
      <ThemeMenu
        className="theme-menu--desktop"
        testId="theme-menu-trigger"
      />
    ),
    "mobile-top-bar-end": () => (
      <ThemeMenu
        className="theme-menu--mobile"
        testId="theme-menu-trigger-mobile"
      />
    ),
    "layout-after-head": ScrollToTop,
  },
  docs: {
    files: "/content/guides/**/*.{md,mdx}",
    defaultOptions: {
      copyPage: true,
      toc: true,
      showLastModified: false,
    },
    publishMarkdown: true,
    llms: {
      llmsTxt: true,
      llmsTxtFull: true,
      includeProtected: false,
    },
  },
  navigation: [
    {
      type: "custom-page",
      path: "/",
      display: "hide",
      layout: "none",
      element: (
        <main className="docs-index">
          <p className="docs-index__eyebrow">CALL-E Developer API</p>
          <h1>CALL-E Developer Docs</h1>
          <p>
            Start with the Quickstart or browse the machine-readable API
            contract.
          </p>
          <nav aria-label="Documentation entry points">
            <a href="/quickstart">Open Quickstart</a>
            <a href="/openapi/calle.openapi.yaml">Download OpenAPI</a>
          </nav>
        </main>
      ),
    },
    {
      type: "category",
      label: "Guides",
      collapsible: false,
      items: [
        { type: "doc", file: "quickstart", label: "Quickstart" },
        { type: "doc", file: "authentication", label: "Authentication" },
        { type: "doc", file: "calls", label: "Calls" },
        { type: "doc", file: "goal-runs", label: "Goal Runs" },
        { type: "doc", file: "webhooks", label: "Webhooks" },
        { type: "doc", file: "errors", label: "Errors" },
        { type: "doc", file: "sdks", label: "SDKs" },
        { type: "doc", file: "changelog", label: "What's New" },
      ],
    },
    {
      type: "link",
      label: "API Reference",
      to: "/api-reference",
    },
  ],
  apis: [
    {
      type: "file",
      input: "./openapi/calle.openapi.yaml",
      path: "/api-reference",
      options: {
        disablePlayground: true,
        disableSecurity: false,
        showInfoPage: true,
        expandAllTags: true,
        schemaDownload: {
          enabled: true,
          fileName: "calle-openapi",
        },
      },
    },
  ],
  defaults: {
    apis: {
      disablePlayground: true,
    },
  },
  aiAssistants: ["claude", "chatgpt"],
  search: {
    type: "pagefind",
  },
  syntaxHighlighting: {
    themes: {
      light: "github-dark",
      dark: "github-dark",
    },
  },
  sitemap: {
    siteUrl: "https://docs.heycall-e.com",
  },
  enableStatusPages: true,
  plugins: [
    {
      getHead: () => <script>{legacyHashRedirect}</script>,
    },
  ],
  theme: {
    light: {
      background: "#ffffff",
      foreground: "#2a2a2a",
      card: "#ffffff",
      cardForeground: "#2a2a2a",
      primary: "#087f75",
      primaryForeground: "#ffffff",
      muted: "#f5f6f7",
      mutedForeground: "#666b73",
      accent: "#e2f7f3",
      accentForeground: "#07766d",
      border: "#e6e8eb",
      input: "#dfe3e6",
      ring: "#0a9f90",
      radius: "0.5rem",
    },
    dark: {
      background: "#0f1217",
      foreground: "#f3f4f6",
      card: "#151920",
      cardForeground: "#f3f4f6",
      primary: "#35c9b8",
      primaryForeground: "#08110f",
      muted: "#1b2028",
      mutedForeground: "#a4a9b1",
      accent: "#163c38",
      accentForeground: "#91e8dd",
      border: "#2b3038",
      input: "#343a44",
      ring: "#35c9b8",
      radius: "0.5rem",
    },
  },
} satisfies ZudokuConfig;

export default config;
