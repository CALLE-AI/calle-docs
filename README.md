# CALL-E Developer Docs

Open-source developer documentation for the CALL-E Developer API.

Read the published docs at
[calle-ai.github.io/calle-docs](https://calle-ai.github.io/calle-docs/).

## Contributing

Documentation fixes and improvements are welcome. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup, repository
layout, and pull request checklist.

## Local development

Requirements:

- Node.js 22 or later
- pnpm 8.10.2

Install dependencies and start the site:

```bash
pnpm install
pnpm run dev
```

The local server runs at `http://127.0.0.1:5174`.

Run the complete validation suite before opening a pull request:

```bash
pnpm exec playwright install chromium
pnpm run validate
```

## Repository layout

- `content/guides/` contains the hand-written MDX guides.
- `src/` contains the React documentation shell and styles.
- `openapi/calle.openapi.yaml` is the public API contract used by the API
  Reference.
- `tests/` contains Playwright smoke tests.
- `scripts/` contains the OpenAPI sync and static-build verification scripts.

The build copies `openapi/calle.openapi.yaml` to
`public/openapi/calle.openapi.yaml` and emits the static site to `dist/`.

## Scope

The site is documentation-only. The API Reference is read-only and does not
send live CALL-E API requests from the browser.

## License

The project is available under the [MIT License](./LICENSE).
