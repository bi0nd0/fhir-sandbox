# Repository Guidelines

## Project Structure & Module Organization
- `src/client`: Vite entry (`main.ts`) and global CSS; keep browser-only code here.
- `src/server`: Hono API grouped by feature folders (`routes`, `handlers`, `services`, `oauth`); colocate helpers beside the route they support.
- `src/types`: shared contracts consumed by both client and server.
- `tests/api`: Vitest suites mirroring REST resources; add one file per resource or flow.
- `data/r4`: reference FHIR bundles used by tests and demos; treat as read-only fixtures.
- `public`: static files served verbatim; built assets are emitted to `dist/`.

## Build, Test, and Development Commands
- `npm run dev`: Vite dev server with HMR on port 5173.
- `npm run dev:server`: watch the Node API via `tsx watch`.
- `npm run build`: compile server types and produce optimized client assets.
- `npm run lint`: ESLint check across `src/` and `tests/`.
- `npm test`: run Vitest; narrow scope with `npm test -- --run tests/api/patient.test.ts`.

## Coding Style & Naming Conventions
- TypeScript + ES modules; prefer 2-space indentation.
- CamelCase for variables/functions, PascalCase for components, classes, and shared types.
- Keep handlers lean; extract reusable logic into `src/server/utils/`.
- Use Prettier (editor integration) and resolve ESLint warnings before pushing.

## Testing Guidelines
- Store specs beside related routes under `tests/api`, using `*.test.ts`.
- Validate success, error, and auth paths; re-use fixtures from `data/r4` instead of inline JSON.
- Run `npm test` before review and add cases whenever behavior or endpoints change.

## Commit & Pull Request Guidelines
- Write concise, imperative commit subjects (~72 chars). Example: `Add encounter paging`.
- Rebase or squash noisy fixups; keep history linear.
- Each PR should describe the change, reference issues, list manual checks, and attach UI screenshots when relevant.
- Call out breaking API changes or new environment variables in the PR description.

## Security & Configuration Tips
- Document env vars touched in changes; key ones include `CORS_ALLOW_ORIGINS`, `DATA_ROOT`, `EXTERNAL_BASE_URL`, and OIDC issuer options.
- Do not commit secrets; rely on local `.env` files ignored by Git.
- Use `createChildLogger` helpers and redact PHI or tokens from log statements.
