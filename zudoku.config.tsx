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
      ],
    },
    {
      type: "link",
      label: "API Reference",
      to: "/api-reference",
    },
    {
      type: "doc",
      file: "changelog",
      label: "What's New",
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
      foreground: "#2e2f33",
      card: "#ffffff",
      cardForeground: "#2e2f33",
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      muted: "#f7fafd",
      mutedForeground: "#5b6472",
      accent: "#eff6ff",
      accentForeground: "#1d4ed8",
      border: "#dde5ef",
      input: "#dde5ef",
      ring: "#2563eb",
      radius: "0.5rem",
    },
    dark: {
      background: "#111827",
      foreground: "#f7fafd",
      card: "#182235",
      cardForeground: "#f7fafd",
      primary: "#60a5fa",
      primaryForeground: "#0b1220",
      muted: "#182235",
      mutedForeground: "#a8b3c7",
      accent: "#1e3a5f",
      accentForeground: "#bfdbfe",
      border: "#2d3b50",
      input: "#34445b",
      ring: "#60a5fa",
      radius: "0.5rem",
    },
  },
} satisfies ZudokuConfig;

export default config;
