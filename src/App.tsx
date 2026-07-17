import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { DocsLayout } from "./components/DocsLayout";
import { PageToc } from "./components/PageToc";
import { SiteHeader } from "./components/SiteHeader";
import {
  apiReferenceNavItem,
  getGuideNavItem,
  isGuideSlug,
  type GuideSlug,
} from "./docs-nav";
import { GuidePage } from "./routes/GuidePage";

const ApiReferencePage = lazy(() =>
  import("./routes/ApiReferencePage").then((module) => ({
    default: module.ApiReferencePage,
  })),
);

type DocsRoute =
  | {
      type: "guide";
      slug: GuideSlug;
      href: string;
      sectionId: string | null;
    }
  | {
      type: "api-reference";
      href: string;
      sectionId: string | null;
    };

export function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const route = useMemo(() => parseRoute(hash), [hash]);

  useEffect(() => {
    if (route.type !== "api-reference" || !route.sectionId) {
      return;
    }

    const canonicalHash = `#/api-reference?section=${encodeURIComponent(
      route.sectionId,
    )}`;
    if (hash === canonicalHash) {
      return;
    }

    window.history.replaceState({}, "", canonicalHash);
    setHash(canonicalHash);
  }, [hash, route]);

  useEffect(() => {
    if (route.type !== "guide" || !route.sectionId) {
      return;
    }

    window.setTimeout(() => {
      document.getElementById(route.sectionId ?? "")?.scrollIntoView({
        block: "start",
      });
    }, 0);
  }, [route]);

  if (route.type === "api-reference") {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <ApiReferencePage activeSectionId={route.sectionId} />
      </Suspense>
    );
  }

  const guide = getGuideNavItem(route.slug);

  return (
    <DocsLayout
      activeHref={route.href}
      rightRail={<PageToc baseHref={route.href} items={guide.toc} />}
    >
      <GuidePage slug={route.slug} />
    </DocsLayout>
  );
}

function ApiReferenceLoading() {
  return (
    <div className="docs-app">
      <SiteHeader activeSection="api-reference" />
      <div className="api-reference-shell" aria-busy="true">
        <aside className="api-reference-sidebar">
          <div className="api-reference-nav-group">
            <div className="api-reference-nav-label">Calls</div>
            <div className="api-reference-loading-row" />
            <div className="api-reference-loading-row" />
            <div className="api-reference-loading-row" />
          </div>
          <div className="api-reference-nav-group">
            <div className="api-reference-nav-label">Webhooks</div>
            <div className="api-reference-loading-row" />
          </div>
        </aside>
        <main className="api-reference-page">
          <div className="api-reference-loading-panel">
            <div className="api-reference-loading-kicker">API Reference</div>
            <div className="api-reference-loading-title" />
            <div className="api-reference-loading-line" />
            <div className="api-reference-loading-card" />
          </div>
        </main>
      </div>
    </div>
  );
}

function parseRoute(hash: string): DocsRoute {
  let value = "";
  if (hash.startsWith("#/")) {
    value = hash.slice(2);
  } else if (hash.startsWith("#")) {
    value = hash.slice(1);
  }

  const [path, queryString = ""] = value.split("?", 2);
  const sectionId = new URLSearchParams(queryString).get("section");

  if (path === "api-reference") {
    return {
      type: "api-reference",
      href: apiReferenceNavItem.href,
      sectionId,
    };
  }

  if (
    path.startsWith("api-1/") ||
    path.startsWith("description/") ||
    path.startsWith("tag/") ||
    path === "models"
  ) {
    return {
      type: "api-reference",
      href: apiReferenceNavItem.href,
      sectionId: path.startsWith("api-1/") ? path : `api-1/${path}`,
    };
  }

  if (isGuideSlug(path)) {
    return {
      type: "guide",
      slug: path,
      href: `#/${path}`,
      sectionId,
    };
  }

  return {
    type: "guide",
    slug: "quickstart",
    href: "#/quickstart",
    sectionId: null,
  };
}
