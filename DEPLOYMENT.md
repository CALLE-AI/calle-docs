# Docs Site Deployment

The CALL-E Developer Docs source is maintained in this repository. The backend
contract is the source of truth for the Developer API, while
`openapi/calle.openapi.yaml` is the public snapshot published with the docs.

Merges to `main` build the static site and deploy `dist/` to a private Aliyun
OSS bucket. A CDN or gateway exposes the official public documentation domain.
GitHub Pages is not the production host.

## GitHub environment

Create a GitHub Actions environment named `production` and restrict deployment
to the `main` branch.

Add these environment secrets:

| Secret | Purpose |
| --- | --- |
| `OSS_KEY_ID` | Access key ID for the docs deployment identity. |
| `OSS_KEY_SECRET` | Access key secret for the docs deployment identity. |

Add these environment variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `OSS_BUCKET_URI` | `oss://example-docs-bucket/` | Destination bucket. |
| `OSS_ENDPOINT` | `oss-ap-southeast-1.aliyuncs.com` | Regional OSS endpoint. |
| `OSS_DEPLOY_PREFIX` | `calle-docs-site/prod` | Production object prefix served by the public domain. |
| `DOCS_PUBLIC_URL` | `https://docs.example.com` | CDN or gateway URL used by the post-deploy smoke check. |

The deployment identity should have only the OSS permissions needed to list the
configured docs prefix and read or write docs objects below it. Do not reuse
broad developer credentials.

## Workflow

The deployment workflow runs after a push to `main` or a manual dispatch:

1. Install locked Node.js dependencies.
2. Run `pnpm run validate`.
3. Upload the generated `dist/` directory as a short-lived workflow artifact.
4. Start the `production` environment job.
5. Download the exact artifact built by the validation job.
6. Upload it to the explicit `OSS_DEPLOY_PREFIX` in OSS.
7. Verify signed reads of `index.html` and
   `openapi/calle.openapi.yaml`.
8. List the destination prefix and confirm every build object exists.
9. Fetch the entry page and OpenAPI document through `DOCS_PUBLIC_URL`, then
   compare both files byte-for-byte with the build artifact.

The build job does not reference deployment secrets. Pull requests from forks
only run CI and cannot access the `production` environment.

## Build gates

Run the same checks locally before opening a pull request:

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run validate
```

`pnpm run validate` runs typecheck, build, static dist verification, deployment
script tests, and Playwright smoke tests.

The build copies `openapi/calle.openapi.yaml` into the public static tree before
Vite emits `dist/`. The Vite config uses relative asset paths so the build works
behind either a domain root or a CDN path prefix.

## Private OSS and CDN

The OSS bucket remains private. A direct unauthenticated OSS request may return
`403 AccessDenied` even after a successful upload. Signed OSS reads prove the
objects exist; the separate `DOCS_PUBLIC_URL` check proves the CDN or gateway is
serving them.

Recommended cache behavior:

- `index.html`: no cache or short cache.
- `openapi/calle.openapi.yaml`: no cache or short cache.
- `assets/*`: one year, immutable.

The site uses hash routing, so routes such as `#/quickstart` and
`#/api-reference` do not require server-side route rewrites.

## Manual dry run

With the four OSS environment variables set locally:

```bash
python3 scripts/deploy_docs_to_oss.py \
  --deploy-prefix calle-docs-site/prod \
  --dry-run
```

The dry run prints the destination and file plan but never prints credential
values. Use `calle-docs-site/test` only for an explicitly configured
non-production origin.
