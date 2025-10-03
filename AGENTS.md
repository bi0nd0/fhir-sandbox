# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/`. Browser-only code stays in `src/client` with the Vite entry at `main.ts` and shared styles. API routes are grouped in `src/server` by feature folders (`routes`, `handlers`, `services`, `oauth`), with helpers colocated. Shared contracts reside in `src/types`. Tests mirror API resources in `tests/api`, and reference FHIR bundles in `data/r4` are read-only fixtures. Static assets belong in `public`; production artifacts land in `dist/`.

## Build, Test, and Development Commands
Use `npm run dev` for the Vite client on port 5173 and `npm run dev:server` to watch the Hono API. `npm run build` compiles server types and emits optimized client assets. Run `npm run lint` before pushing to clear ESLint issues. Execute `npm test` (or `npm test -- --run tests/api/patient.test.ts`) to validate endpoints with Vitest.

## Coding Style & Naming Conventions
Write TypeScript with ES modules and 2-space indentation. Prefer camelCase for variables and functions, PascalCase for components, classes, and shared types. Keep handlers slim; move reusable logic into `src/server/utils/`. Prettier handles formatting, and ESLint warnings must be resolved before merge.

## Testing Guidelines
Vitest powers API suites under `tests/api/*.test.ts`. Cover success, error, and auth flows, leaning on `data/r4` fixtures instead of inline JSON. Run the full suite with `npm test` before review and add targeted cases whenever behavior changes.

## Commit & Pull Request Guidelines
Write concise, imperative commit subjects (e.g., `Add encounter paging`). Keep history linear by rebasing or squashing fixups. PRs should describe the change, link issues, list manual checks, and include UI screenshots when relevant. Highlight breaking API updates or new env vars.

## Security & Configuration Tips
Document environment variables you touch, especially `CORS_ALLOW_ORIGINS`, `DATA_ROOT`, and `EXTERNAL_BASE_URL`. Never commit secrets—store them in ignored `.env` files. Use `createChildLogger` helpers and redact PHI or tokens from logs.
