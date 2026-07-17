import {
  ApiReferenceReact,
  type AnyApiReferenceConfiguration,
} from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import "../styles/api-reference.css";
import { useEffect, type MouseEvent } from "react";
import { SiteHeader } from "../components/SiteHeader";

type ScalarConfiguration = AnyApiReferenceConfiguration & {
  showToolbar: "never";
};

const scalarConfiguration = {
  url: new URL("openapi/calle.openapi.yaml", document.baseURI).toString(),
  layout: "modern",
  forceDarkModeState: "light",
  hideClientButton: true,
  hideDarkModeToggle: true,
  hideTestRequestButton: true,
  showDeveloperTools: "never",
  showToolbar: "never",
  showOperationId: true,
  defaultOpenAllTags: true,
  defaultOpenFirstTag: true,
  hiddenClients: [],
  agent: {
    disabled: true,
  },
} satisfies ScalarConfiguration;

type ApiReferencePageProps = {
  activeSectionId: string | null;
};

type ApiReferenceNavGroup = {
  title: string;
  items: ApiReferenceNavItem[];
};

type ApiReferenceNavItem = {
  endpointDisplay?: string;
  title: string;
  method: "GET" | "POST" | null;
  path: string | null;
  sectionId: string;
};

const apiReferenceNavGroups: ApiReferenceNavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Introduction",
        method: null,
        path: null,
        sectionId: "api-1/description/introduction",
      },
    ],
  },
  {
    title: "Calls",
    items: [
      {
        title: "Create Call",
        method: "POST",
        path: "/v1/calls",
        sectionId: "api-1/tag/calls/POST/v1/calls",
      },
      {
        title: "Get Call",
        method: "GET",
        path: "/v1/calls/{call_id}",
        sectionId: "api-1/tag/calls/GET/v1/calls/{call_id}",
      },
      {
        title: "List Call Events",
        method: "GET",
        path: "/v1/calls/{call_id}/events",
        sectionId: "api-1/tag/calls/GET/v1/calls/{call_id}/events",
      },
    ],
  },
  {
    title: "Webhooks",
    items: [
      {
        endpointDisplay: "https://{yourserver}.com/calle/webhook",
        title: "Server Message",
        method: "POST",
        path: "/calle/webhook",
        sectionId: "api-1/tag/webhooks/POST/calle/webhook",
      },
    ],
  },
];

const defaultApiReferenceSectionId =
  apiReferenceNavGroups[1]?.items[0]?.sectionId ?? null;

export function ApiReferencePage({ activeSectionId }: ApiReferencePageProps) {
  const selectedSectionId = isVisibleApiReferenceSectionId(activeSectionId)
    ? activeSectionId
    : defaultApiReferenceSectionId;

  useEffect(() => {
    if (!selectedSectionId) {
      return;
    }

    const stopVisibleSection = syncVisibleApiSection(selectedSectionId);
    const stopScrolling = scrollToApiSection(selectedSectionId);
    const stopOpeningResponse = openSuccessResponseInSection(selectedSectionId);
    const stopEndpointLines = renderEndpointLines();

    return () => {
      stopVisibleSection();
      stopScrolling();
      stopOpeningResponse();
      stopEndpointLines();
    };
  }, [selectedSectionId]);

  function handleNavigationClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();
    window.history.pushState(
      {},
      "",
      `#/api-reference?section=${encodeURIComponent(sectionId)}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    scrollToApiSection(sectionId);
  }

  return (
    <div className="docs-app">
      <SiteHeader activeSection="api-reference" />
      <div className="api-reference-shell">
        <aside className="api-reference-sidebar">
          <nav aria-label="API Reference navigation">
            {apiReferenceNavGroups.map((group) => (
              <div className="api-reference-nav-group" key={group.title}>
                <div className="api-reference-nav-label">{group.title}</div>
                {group.items.map((item) => (
                  <a
                    className={
                      item.sectionId === selectedSectionId ? "active" : undefined
                    }
                    href={`#/api-reference?section=${encodeURIComponent(
                      item.sectionId,
                    )}`}
                    key={item.sectionId}
                    onClick={(event) =>
                      handleNavigationClick(event, item.sectionId)
                    }
                  >
                    {item.method ? (
                      <span
                        className={`method-badge method-${item.method.toLowerCase()}`}
                      >
                        {item.method}
                      </span>
                    ) : null}
                    <span className="api-reference-nav-title">
                      {item.title}
                    </span>
                    {item.path ? (
                      <span className="api-reference-nav-path">
                        {item.path}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="api-reference-page">
          <ApiReferenceReact configuration={scalarConfiguration} />
        </main>
      </div>
    </div>
  );
}

function isVisibleApiReferenceSectionId(
  sectionId: string | null,
): sectionId is string {
  if (!sectionId) {
    return false;
  }

  return apiReferenceNavGroups.some((group) =>
    group.items.some((item) => item.sectionId === sectionId),
  );
}

function scrollToApiSection(sectionId: string) {
  let attempts = 0;
  const root = document.querySelector(".api-reference-page");

  const timer = window.setInterval(() => {
    attempts += 1;
    if (scrollToSection() || attempts >= 20) {
      stop();
    }
  }, 100);

  const observer = new MutationObserver(() => {
    if (scrollToSection()) {
      stop();
    }
  });

  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }

  window.requestAnimationFrame(() => {
    if (scrollToSection()) {
      stop();
    }
  });

  function scrollToSection() {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ block: "start" });
      return true;
    }

    return false;
  }

  function stop() {
    window.clearInterval(timer);
    observer.disconnect();
  }

  return stop;
}

function syncVisibleApiSection(sectionId: string) {
  let attempts = 0;
  const root = document.querySelector(".api-reference-page");
  const sectionIds = apiReferenceNavGroups.flatMap((group) =>
    group.items.map((item) => item.sectionId),
  );

  const timer = window.setInterval(() => {
    attempts += 1;
    if (syncSections() || attempts >= 20) {
      stop();
    }
  }, 100);

  const observer = new MutationObserver(() => {
    if (syncSections()) {
      stop();
    }
  });

  if (root) {
    observer.observe(root, {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  window.requestAnimationFrame(() => {
    if (syncSections()) {
      stop();
    }
  });

  function syncSections() {
    let renderedCount = 0;

    for (const currentSectionId of sectionIds) {
      const section = document.getElementById(currentSectionId);
      if (!section) {
        continue;
      }

      renderedCount += 1;
      const isSelected = currentSectionId === sectionId;
      const shouldHide = !isSelected;
      if (section.hidden !== shouldHide) {
        section.hidden = shouldHide;
      }
    }

    return renderedCount === sectionIds.length;
  }

  function stop() {
    window.clearInterval(timer);
    observer.disconnect();
  }

  return stop;
}

function renderEndpointLines() {
  let attempts = 0;
  const root = document.querySelector(".api-reference-page");
  const items = apiReferenceNavGroups.flatMap((group) => group.items);

  const timer = window.setInterval(() => {
    attempts += 1;
    if (syncEndpointLines() || attempts >= 20) {
      stop();
    }
  }, 100);

  const observer = new MutationObserver(() => {
    if (syncEndpointLines()) {
      stop();
    }
  });

  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }

  window.requestAnimationFrame(() => {
    if (syncEndpointLines()) {
      stop();
    }
  });

  function syncEndpointLines() {
    let renderedCount = 0;
    const renderableItems = items.filter((item) => item.method && item.path);

    for (const item of items) {
      if (!item.method || !item.path) {
        continue;
      }

      const section = document.getElementById(item.sectionId);
      const header = section?.querySelector(".operation-header");
      if (!header) {
        continue;
      }

      const endpoint = item.endpointDisplay ?? item.path;
      const existing = section?.querySelector<HTMLElement>(
        ".calle-endpoint-line",
      );
      if (existing) {
        const method = existing.querySelector(".method-badge");
        const path = existing.querySelector("code");
        if (!method || !path) {
          existing.remove();
        } else {
          if (method.textContent !== item.method) {
            method.textContent = item.method;
          }
          if (path.textContent !== endpoint) {
            path.textContent = endpoint;
          }
          renderedCount += 1;
          continue;
        }
      }

      const line = document.createElement("div");
      line.className = "calle-endpoint-line";

      const method = document.createElement("span");
      method.className = `method-badge method-${item.method.toLowerCase()}`;
      method.textContent = item.method;

      const path = document.createElement("code");
      path.textContent = endpoint;

      line.append(method, path);
      header.after(line);
      renderedCount += 1;
    }

    return renderedCount === renderableItems.length;
  }

  function stop() {
    window.clearInterval(timer);
    observer.disconnect();
  }

  return stop;
}

function openSuccessResponseInSection(sectionId: string) {
  let attempts = 0;
  const root = document.querySelector(".api-reference-page");

  const timer = window.setInterval(() => {
    attempts += 1;
    if (openSuccessResponse() || attempts >= 20) {
      stop();
    }
  }, 100);

  const observer = new MutationObserver(() => {
    if (openSuccessResponse()) {
      stop();
    }
  });

  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }

  window.requestAnimationFrame(() => {
    if (openSuccessResponse()) {
      stop();
    }
  });

  function openSuccessResponse() {
    const section = document.getElementById(sectionId);
    if (!section) {
      return false;
    }

    const responseButton = section.querySelector<HTMLButtonElement>(
      'ul[aria-label="Responses"] > li:first-child > button',
    );
    if (!responseButton) {
      return false;
    }

    if (responseButton.getAttribute("aria-expanded") === "true") {
      return true;
    }

    if (!responseButton.textContent?.includes("200")) {
      return false;
    }

    responseButton.click();
    return true;
  }

  function stop() {
    window.clearInterval(timer);
    observer.disconnect();
  }

  return stop;
}
