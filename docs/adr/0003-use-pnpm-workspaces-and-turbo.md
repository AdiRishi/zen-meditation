# Use pnpm Workspaces And Turbo

Zen keeps pnpm workspace boundaries and a Turbo task graph even while the mobile app is the only active product workspace. Turbo provides consistent root orchestration and dependency-aware tasks as shared packages or other independently justified workspaces are added. Empty `apps/*`, `packages/*`, and `servers/*` workspace globs are intentional scaffolding; adding a workspace still requires a concrete product need.
