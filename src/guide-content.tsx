import AuthenticationGuide from "../content/guides/authentication.mdx";
import CallsGuide from "../content/guides/calls.mdx";
import ChangelogGuide from "../content/guides/changelog.mdx";
import ErrorsGuide from "../content/guides/errors.mdx";
import QuickstartGuide from "../content/guides/quickstart.mdx";
import SdksGuide from "../content/guides/sdks.mdx";
import WebhooksGuide from "../content/guides/webhooks.mdx";
import type { ComponentType } from "react";
import type { GuideSlug } from "./docs-nav";

export const guideComponents: Record<GuideSlug, ComponentType> = {
  quickstart: QuickstartGuide,
  authentication: AuthenticationGuide,
  calls: CallsGuide,
  webhooks: WebhooksGuide,
  errors: ErrorsGuide,
  sdks: SdksGuide,
  changelog: ChangelogGuide,
};
