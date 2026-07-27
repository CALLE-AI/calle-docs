# Agent Guidelines

## Sources of truth

- This repository is the source of truth for the public CALL-E Developer Docs
  site.
- The CALL-E backend contract is the source of truth for Developer API
  behavior.
- `openapi/calle.openapi.yaml` is a public snapshot of that backend contract.
  Do not invent API paths, fields, errors, or behavior in this repository.

## API documentation sync

When maintainers provide a backend API change:

1. Read the approved backend specification, OpenAPI diff, and rollout status.
2. Update `openapi/calle.openapi.yaml`, affected MDX guides, examples,
   changelog, and observable tests.
3. Run `pnpm run validate`.
4. Open a focused pull request that links the backend change and lists the
   affected public API surface.
5. Do not merge or deploy. Production publication is triggered by a maintainer
   merging the pull request to `main`.

The public docs must not describe a new capability before that capability is
available in the public API.

## Security

- Never add API keys, OSS credentials, private URLs, customer data, phone
  numbers, or internal operational details.
- Pull request validation must not reference deployment secrets.
- Changes to `.github/workflows/` or deployment scripts require explicit
  maintainer review.
