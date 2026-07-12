# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

Scoped guidance:

- `apps/mobile/src/components/AGENTS.md` — component organization, HeroUI Native, Uniwind, and safe-area containers.
- `apps/mobile/src/screens/AGENTS.md` — screen and route composition rules.
- `servers/api/AGENTS.md` — Nitro, tRPC, server aliases, and server/client boundaries.
- `packages/AGENTS.md` — shared package boundaries and build expectations.

Repository knowledge:

- When validating the iOS app, follow `docs/agents/local-validation.md`. It defines the project-specific workflow around the Build iOS Apps plugin and the `serve-sim` skill.
- `docs/adr/` — durable architecture and workflow decisions, including test layout and test-data builders.

## Commands

`package.json` scripts are the source of truth. Common workflows:

```bash
pnpm install              # Install workspace dependencies

pnpm run compile          # Compile shared internal packages
pnpm run check            # Lint + Oxfmt check + TypeScript
pnpm run lint             # App + server lint checks
pnpm run lint:app         # Expo ESLint only
pnpm run lint:server      # Oxlint server/shared package checks
pnpm run test             # Jest app tests + Vitest server tests
pnpm run test:app         # Jest app tests
pnpm run test:server      # Vitest server tests
pnpm run typecheck        # App, frontend test, server, and server test TypeScript
pnpm run format           # Oxfmt write

pnpm run server:dev       # Start Nitro API server on localhost:3000
pnpm ios                  # Start the iOS app server / simulator
pnpm android              # Start the Android app server / emulator
pnpm web                  # Start Expo web

pnpm run prebuild         # Compile packages and regenerate native projects
```

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Tests

Write high-signal tests that protect durable behavior. Prefer integration-style tests through a module's public interface, using real in-process collaborators and realistic fixtures; replace only true external seams with controlled adapters. A test should describe an outcome a caller or user cares about, protect an important invariant or failure/recovery path, and remain valid after an internal refactor.

Do not add tests merely to record the implementation journey. Avoid old-versus-new comparisons, tests for transient scaffolding, assertions about private helpers or internal call order, mock call-count tests, and expectations recomputed with the same logic as the implementation. When behavior changes, update or remove tests for obsolete contracts instead of preserving both histories. Before adding a test, be able to name the durable regression it would catch. Keep each test focused on one logical behavior and use independently known expected values.

## Commit Discipline

Commit throughout development at meaningful, reviewable checkpoints instead of waiting until the end. Use focused messages that describe the behavior or architectural change, keep unrelated work in separate commits, and avoid vague checkpoint or catch-all commits. Order commits so the history tells the implementation story: each commit should be coherent on its own, and the sequence should make the motivation, foundations, behavior changes, and validation easy for a reviewer to follow.

## Architecture

This is a pnpm/Turbo monorepo with three TypeScript workspaces:

- **App (`apps/mobile/`)** — Expo SDK 57 / React Native 0.86 / React 19 app using Expo Router, Uniwind, HeroUI Native, TanStack Form, TanStack Query, and a tRPC client.
- **Server (`servers/api/`)** — Nitro 3 API server with tRPC v11, deployable to Cloudflare Workers.
- **Shared packages (`packages/`)** — compiled internal packages for cross-workspace contracts such as `@repo/rpc`.

The main request path is:

```text
Expo screen -> tRPC client -> server router -> procedure -> response
```
