import type { ReactNode } from "react";
import { docsNavItems, guideNavItems } from "../docs-nav";
import { SiteHeader, type SiteHeaderSection } from "./SiteHeader";

type DocsLayoutProps = {
  activeHref: string;
  children: ReactNode;
  rightRail: ReactNode;
};

export function DocsLayout({ activeHref, children, rightRail }: DocsLayoutProps) {
  const activeSection: SiteHeaderSection =
    activeHref === "#/sdks"
      ? "sdks"
      : activeHref === "#/changelog"
        ? "changelog"
        : "guides";

  return (
    <div className="docs-app">
      <SiteHeader activeSection={activeSection} />

      <div className="docs-frame">
        <aside className="sidebar" aria-label="Docs navigation">
          <div className="sidebar-section">
            <div className="sidebar-label">Guides</div>
            {guideNavItems.map((item) => (
              <a
                key={item.href}
                className={item.href === activeHref ? "active" : undefined}
                href={item.href}
              >
                <span>{item.title}</span>
                <small>{item.description}</small>
              </a>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Reference</div>
            {docsNavItems
              .filter((item) => item.type === "api-reference")
              .map((item) => (
                <a
                  key={item.href}
                  className={item.href === activeHref ? "active" : undefined}
                  href={item.href}
                >
                  <span>{item.title}</span>
                  <small>{item.description}</small>
                </a>
              ))}
          </div>
        </aside>

        <main className="content-shell">{children}</main>
        <aside className="right-rail">{rightRail}</aside>
      </div>
    </div>
  );
}
