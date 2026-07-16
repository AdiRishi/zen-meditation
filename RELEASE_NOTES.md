# Release Notes

## v1.2.0 - 2026-07-16

### Clearer onboarding and privacy information

Onboarding now makes your progress through setup clearer. Privacy information has also been updated to explain diagnostic telemetry.

### Highlights

- See clearer progression while setting up your practice, schedule, and reminders.
- Review updated privacy information, including a published privacy policy.

### Fixes

- Diagnostic telemetry is now clearly disclosed in the app’s privacy information.

### Internal Changes

- Published the Moss privacy policy documentation.

### Testing Notes

- Added coverage for onboarding flow progress.
- Updated privacy screen tests for the diagnostic telemetry disclosure.

## v1.1.0 - 2026-07-16

### App version in Settings

You can now find the installed app version in Settings and on the About screen.

### Highlights

- View the installed app version from Settings and About.

### Internal Changes

- Added shared app-version handling and updated the mobile app configuration.
- Updated Settings and About screen tests to cover the version label.

### Testing Notes

- Automated screen tests were updated to verify the app version appears in Settings and About.

## v1.0.1 - 2026-07-16

### Maintenance and release improvements

This release updates the app’s underlying components and improves the reliability of future releases.

### Internal Changes

- Upgraded Expo and related dependencies.
- Added automated release preparation and iOS store submission workflows.
- Corrected store application identifiers and normalized release script formatting.
- Updated release documentation and analysis tooling.

## v1.0.0 - 2026-07-16

### A quiet rhythm for daily practice

Moss provides a calm, local-first meditation timer with gentle structure for building a regular practice.

### Highlights

- Set up and complete uninterrupted meditation sessions with a choice of gentle completion sounds.
- Create a flexible practice schedule and optional local reminders.
- Review practice history and progress without accounts, subscriptions, or cloud storage.
- Choose a light, dark, or system appearance with living scenes that follow the time of day.

### Internal Changes

- Established the first EAS production build and App Store Connect submission configuration.
- Kept preferences and practice history entirely on-device with SQLite.

### Testing Notes

- Added automated coverage for session timing, local persistence, progress calculations, notifications, and the primary app flows.
