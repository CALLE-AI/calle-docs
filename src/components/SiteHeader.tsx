import callELogoUrl from "../assets/call-e-logo.svg";

export type SiteHeaderSection =
  | "guides"
  | "api-reference"
  | "sdks"
  | "changelog";

type SiteHeaderProps = {
  activeSection: SiteHeaderSection;
};

export function SiteHeader({ activeSection }: SiteHeaderProps) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="https://www.heycall-e.com/"
        aria-label="Go to CALL-E website"
      >
        <img className="brand-logo" src={callELogoUrl} alt="CALL-E" />
      </a>
      <nav className="topnav" aria-label="Primary navigation">
        <a
          className={activeSection === "guides" ? "active" : undefined}
          href="#/quickstart"
        >
          Documentation
        </a>
        <a
          className={activeSection === "api-reference" ? "active" : undefined}
          href="#/api-reference"
        >
          API Reference
        </a>
        <a
          className={activeSection === "sdks" ? "active" : undefined}
          href="#/sdks"
        >
          SDKs
        </a>
        <a
          className={activeSection === "changelog" ? "active" : undefined}
          href="#/changelog"
        >
          What's New
        </a>
      </nav>
    </header>
  );
}
