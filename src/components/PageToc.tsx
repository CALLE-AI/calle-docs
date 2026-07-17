import type { TocItem } from "../docs-nav";

type PageTocProps = {
  baseHref: string;
  items: TocItem[];
};

export function PageToc({ baseHref, items }: PageTocProps) {
  return (
    <nav className="page-toc" aria-label="On this page">
      <div className="page-toc-title">On this page</div>
      {items.map((item) => (
        <a key={item.id} href={`${baseHref}?section=${encodeURIComponent(item.id)}`}>
          {item.title}
        </a>
      ))}
    </nav>
  );
}
