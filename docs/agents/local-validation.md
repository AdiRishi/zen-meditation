# Local App Validation

Use the Build iOS Apps plugin for iOS validation, preferring its simulator-browser workflow for visual and interactive checks. Use the repository's `serve-sim` skill as the auxiliary CLI reference, and reach for other plugin workflows only when the browser mirror cannot answer the validation question.

The Codex environment at `.codex/environments/environment.toml` owns dependency installation and native prebuild work for new worktrees.

The API and Expo development processes need access to host file watchers, localhost ports, and Simulator services. In Codex, run both development commands with scoped host escalation rather than starting them in the filesystem sandbox.

Before starting them, make sure no stale development server is listening on ports `3000` or `8081`. Confirm that any listener belongs to this repository and is not owned by another task, then stop it gracefully. Port `3000` is used by the Nitro API and port `8081` is used by Metro. For example:

```sh
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill <pid>
```

Start the API and iOS app with scoped host escalation in separate terminals:

```sh
pnpm run server:dev
pnpm ios
```

The API listens on `http://localhost:3000`. `pnpm ios` compiles the shared packages, starts the Expo development server on port `8081`, and builds and launches the app in Simulator. Use Build iOS Apps for the simulator validation workflow after launch.

When the simulator browser mirror remains on `Connecting...`, allow the device-scoped `serve-sim` helper time to initialize and refresh the existing browser page. A few refreshes after the helper reports that framebuffer capture is ready usually reconnect the stream; do not open duplicate tabs. Only treat the mirror as ready after a real simulator frame is visible.

Stop the local services, app/log sessions, and any device-scoped `serve-sim` helper started for the validation when finished. Do not stop pre-existing processes or another task's simulator mirror.
