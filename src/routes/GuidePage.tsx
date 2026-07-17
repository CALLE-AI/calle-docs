import { MDXProvider } from "@mdx-js/react";
import { guideComponents } from "../guide-content";
import { mdxComponents } from "../mdx-components";
import type { ComponentType } from "react";
import type { GuideSlug } from "../docs-nav";

type GuidePageProps = {
  slug: GuideSlug;
};

export function GuidePage({ slug }: GuidePageProps) {
  const GuideComponent = guideComponents[slug] as ComponentType<{
    components?: typeof mdxComponents;
  }>;

  return (
    <article className="guide-article">
      <MDXProvider components={mdxComponents}>
        <GuideComponent components={mdxComponents} />
      </MDXProvider>
    </article>
  );
}
