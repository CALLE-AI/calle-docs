# CALL-E Developer Docs

Open-source developer documentation for the CALL-E Developer API.

The source is maintained on GitHub for public contributions. Merges to `main`
are validated and deployed to the official CALL-E documentation domain through
Aliyun OSS and its CDN or gateway.

## Contributing

Documentation fixes and improvements are welcome. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup, repository
layout, and pull request checklist.

## Local development

Requirements:

- Node.js 22.12 or later
- pnpm 8.10.2
- Python 3.10 or later

Install dependencies and start the site:

```bash
pnpm install
pnpm run dev
```

The local server runs at `http://localhost:5174`.

Run the complete validation suite before opening a pull request:

```bash
pnpm exec playwright install chromium
pnpm run validate
```

## Repository layout

- `content/guides/` contains the hand-written MDX guides.
- `zudoku.config.tsx` defines navigation, search, branding, API Reference, and
  machine-readable documentation output.
- `src/styles.css` contains the small CALL-E theme layer on top of Zudoku.
- `openapi/calle.openapi.yaml` is the public API contract used by the API
  Reference.
- `public/` contains static brand assets, crawler policy, and the synchronized
  OpenAPI copy.
- `tests/` contains Playwright smoke tests.
- `scripts/` contains OpenAPI sync, static-build verification, and OSS
  deployment tooling.

The build copies `openapi/calle.openapi.yaml` to
`public/openapi/calle.openapi.yaml` and asks Zudoku to emit the static site to
`dist/`.

Each guide is published in both human- and agent-readable forms:

- `/quickstart` is a prerendered HTML page.
- `/quickstart.md` is the raw Markdown version.
- `/llms.txt` indexes every guide plus the API Reference and raw OpenAPI
  contract.
- `/llms-full.txt` contains the complete guide corpus.
- `/openapi/calle.openapi.yaml` remains the authoritative machine-readable API
  contract because OpenAPI Reference pages do not have Markdown exports.
- `/sitemap.xml` and `/robots.txt` provide crawler discovery.

The backend contract is the source of truth for the Developer API. The OpenAPI
file in this repository is the public snapshot used to build and publish the
API Reference.

## Scope

The site is documentation-only. Zudoku's API playground is disabled, so the
API Reference cannot send live CALL-E API requests from the browser.

## License

The project is available under the [MIT License](./LICENSE).
