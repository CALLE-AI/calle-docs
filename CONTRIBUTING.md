# Contributing

Thanks for helping improve the CALL-E Developer Docs.

## Development setup

This repository requires Node.js 22 or later, pnpm 8.10.2, and Python 3.10 or
later.

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run dev
```

Run the complete validation suite before opening a pull request:

```bash
pnpm run validate
```

## What to change

- Edit narrative documentation in `content/guides/`.
- Edit navigation metadata in `src/docs-nav.ts`.
- Edit the documentation shell and styles in `src/`.
- Add or update Playwright coverage in `tests/` when navigation, rendering, or
  other observable site behavior changes.

The API Reference is built from `openapi/calle.openapi.yaml`. Contract changes
must describe behavior already supported by the public CALL-E Developer API.
If you are proposing a new API capability, open an issue before changing the
contract.

Pull requests from forks run validation without deployment credentials.
Production deployment only runs after a maintainer merges a change to `main`.

## Pull requests

Keep pull requests focused and include:

- A clear summary of the user-facing documentation change.
- A link to the affected page or API surface.
- Screenshots for visual changes.
- Confirmation that `pnpm run validate` passes.

Do not include API keys, webhook secrets, phone numbers, customer data, private
URLs, or internal operational details in issues, examples, tests, or pull
requests.
