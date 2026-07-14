# Local App Validation

Use the Build iOS Apps plugin for iOS validation, preferring its simulator-browser workflow for visual and interactive checks. Use the repository's `serve-sim` skill as the auxiliary CLI reference, and reach for other plugin workflows only when the browser mirror cannot answer the validation question.

The Codex environment at `.codex/environments/environment.toml` owns dependency installation and native prebuild work for new worktrees.

Zen is a local-only app. Its preferences, active session, and practice history are persisted on the device with SQLite, so validation does not require any server process.

Metro needs access to host file watchers and port `8081`, while the native build needs access to Simulator services. In Codex, run the iOS command with scoped host escalation rather than starting it in the filesystem sandbox.

Before starting, make sure no stale development server is listening on port `8081`. Confirm that any listener belongs to this repository and is not owned by another task, then stop it gracefully. For example:

```sh
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill <pid>
```

Start the iOS app with scoped host escalation:

```sh
pnpm ios
```

`pnpm ios` starts the Expo development server on port `8081`, builds the native app, and launches it in Simulator. Use Build iOS Apps for the simulator validation workflow after launch.

SQLite state survives app relaunches. Include a terminated-app relaunch when validating onboarding, preferences, session recovery, or progress. Use the in-app reset control when a test needs true first-run state instead of treating Metro or Simulator restarts as data resets.

Before the first `serve-sim` invocation in a validation session, run its prerequisite check:

```sh
./.agents/skills/serve-sim/scripts/check-prereqs.sh
```

When the simulator browser mirror remains on `Connecting...`, allow the device-scoped `serve-sim` helper time to initialize and refresh the existing browser page. A few refreshes after the helper reports that framebuffer capture is ready usually reconnect the stream; do not open duplicate tabs. Only treat the mirror as ready after a real simulator frame is visible.

## Cleanup

Before the final response, stop Metro, app/log sessions, and the simulator mirror started for the validation unless the user explicitly asked to leave them running. Stop the long-running terminal sessions gracefully and wait for them to exit.

Stop only the device-scoped simulator stream started for this validation:

```bash
pnpm --filter @repo/mobile exec serve-sim --list
pnpm --filter @repo/mobile exec serve-sim --kill <simulator-udid>
```

Run `pnpm --filter @repo/mobile exec serve-sim --list` again and confirm that it no longer lists the simulator used for this validation. Other device-scoped streams may belong to another task and must be left running. Never use an unscoped `serve-sim --kill`.

After stopping Metro, verify its standard port is clear:

```bash
lsof -iTCP:8081 -sTCP:LISTEN -n -P || true
```

The command should print no listening process for Metro instances you started. If the port is still occupied by a process you started, stop it gracefully and check again. Do not stop a pre-existing process or a process owned by another task.
