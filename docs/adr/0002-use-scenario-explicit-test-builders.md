# Use Scenario-Explicit Meditation Test Data

Mobile behavior depends on preferences, active-session state, completed practice history, notification permission, and the current time. Tests must make the fields that define each scenario visible instead of inheriting a global happy-path fixture.

Tests use small builders or fixtures at the nearest useful scope. A fixture may start from `DEFAULT_PREFERENCES` for structural defaults, but each test supplies the preference overrides, timestamps, durations, and session status that determine the outcome. Persistence tests exercise `SQLiteMeditationStore` through its public interface with an in-process SQLite adapter. Provider and screen tests use a test-only in-memory `MeditationStore` as a controlled collaborator, while notification tests replace only the native Expo adapter.

This keeps local-first scenarios readable and allows internal refactors without coupling tests to SQLite statements, provider call order, or native-module implementation details.
