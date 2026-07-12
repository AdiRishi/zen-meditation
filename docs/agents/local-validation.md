# Local App Validation

Use the Build iOS Apps plugin for iOS validation, preferring its simulator-browser workflow for visual and interactive checks. Use the repository's `serve-sim` skill as the auxiliary CLI reference, and reach for other plugin workflows only when the browser mirror cannot answer the validation question.

The Codex environment at `.codex/environments/environment.toml` owns dependency installation and native prebuild work for new worktrees.

Start the API and iOS app in separate terminals:

```sh
pnpm run server:dev
pnpm ios
```

The API listens on `http://localhost:3000`. `pnpm ios` compiles the shared packages, starts the Expo development server, and builds and launches the app in Simulator. Use Build iOS Apps for the simulator validation workflow after launch.

Stop the local services, app/log sessions, and any device-scoped `serve-sim` helper started for the validation when finished. Do not stop pre-existing processes or another task's simulator mirror.
