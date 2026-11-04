# Register

Register PWA for the Tir Lavigny shooting club — Vue 3 + TypeScript frontend, built to static assets and served by nginx.

## Stack

Vue 3 · TypeScript · Vite · Vitest · Playwright · orval (API client generation) · Docker (nginx:alpine)

## Local development

```bash
pnpm install
pnpm dev     # Vite dev server; /api is proxied to localhost:8000 (see vite.config.ts)
pnpm build   # type-check (vue-tsc) + production build to dist/
```

## Tests

- `pnpm test` — Vitest unit/component tests
- `pnpm test:coverage` — coverage report
- `pnpm lint` / `pnpm format` — ESLint / Prettier

## Notes

- The API client is generated from the OpenAPI spec: `pnpm generate-api` (orval)
- Non-production builds show a "STAGING"/"DEV" banner at the top of the page, controlled by the `VITE_APP_ENV` build-time variable
