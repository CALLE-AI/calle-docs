# Docs Site Deployment

The CALL-E docs site is a static Vite build. It can be hosted from any static
origin, including an official website path such as `/docs/`, `/developers/`, or
`/calle-docs-site/`.

## Build Gates

Run these checks before publishing a new docs build:

```bash
pnpm install
pnpm run validate
```

`pnpm run validate` runs typecheck, build, static dist verification, and
Playwright smoke tests. Use the same command from CI once the docs-site deploy
pipeline is wired.

`pnpm run build` copies the public OpenAPI contract from
`openapi/calle.openapi.yaml` into `public/openapi/calle.openapi.yaml` before
Vite builds the site.

`pnpm run verify:dist` checks that the static output contains:

- `dist/index.html`
- hashed entry JavaScript and CSS assets
- `dist/openapi/calle.openapi.yaml`
- relative asset paths suitable for subpath hosting
- Phase 1 OpenAPI paths for `/v1/calls` and `/calle/webhook`

## Static Host Requirements

Serve the entire `dist/` directory as static files. The app uses hash routing,
so the static host does not need an SPA rewrite rule for guide routes such as
`#/quickstart` or `#/api-reference`.

Keep these paths publicly readable:

```text
<base>/index.html
<base>/assets/*
<base>/openapi/calle.openapi.yaml
```

The Vite config uses `base: "./"` so built assets are relative to
`index.html`. The API Reference resolves the OpenAPI URL relative to the page
base, which lets the same build work under either a domain root or a subpath.

## Deployment

Build the site:

```bash
pnpm run validate
```

Publish the contents of `dist/` to the website path, not the `dist` directory
itself. For example, if the official site serves `/developers/`, then
`dist/index.html` should be available at:

```text
https://example.com/developers/index.html
```

## Post-Deploy Smoke Checks

Set `BASE_URL` to the published docs path:

```bash
BASE_URL="https://example.com/developers"
```

Verify the static entry point, OpenAPI document, and entry asset:

```bash
curl -fsS "$BASE_URL/index.html" -o /tmp/calle-docs-index.html
ASSET="$(sed -n 's/.*src="\([^" ]*assets\/index-[^"]*\.js\)".*/\1/p' /tmp/calle-docs-index.html | head -n 1)"
ASSET_PATH="${ASSET#./}"
curl -fsSI "$BASE_URL/openapi/calle.openapi.yaml" | sed -n '1p'
curl -fsSI "$BASE_URL/$ASSET_PATH" | sed -n '1p'
```

Verify key routes in a browser or Playwright:

```text
<base>/#/quickstart
<base>/#/authentication
<base>/#/api-reference
<base>/#/webhooks
<base>/#/sdks
<base>/#/changelog
```

The API Reference route must fetch:

```text
<base>/openapi/calle.openapi.yaml
```

## GitHub Pages

The `Deploy GitHub Pages` workflow validates the site, uploads `dist/`, and
deploys it after changes land on `main`. The repository must use GitHub Actions
as its Pages source.
