# Moss Design

> **Status: approved design foundation.** These documents and boards are the current source of truth for app implementation.

This directory translates the product intent in [`VISION.md`](../VISION.md) and [`PRODUCT.md`](../PRODUCT.md) into Moss’s brand system, product surfaces, and implementation tokens.

## Source of truth

| Artifact                       | Purpose                                                                                   | Status                     |
| ------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------- |
| [`BRAND.md`](./BRAND.md)       | Identity, colour, typography, layout, components, motion, sound, voice, and accessibility | Current specification      |
| [`SCREENS.md`](./SCREENS.md)   | Product surfaces and interaction intent                                                   | Current specification      |
| [`tokens.json`](./tokens.json) | Machine-readable brand values                                                             | Current specification      |
| `assets/`                      | Transparent ensō master, light/dark presentations, and app icon                           | Production assets          |
| `brand/`                       | Brand foundation, visual identity, motion/sound, and product architecture                 | Canonical visual reference |
| `screens/`                     | Product screens, components, and system states                                            | Canonical visual reference |

## Board coverage

| Design area                                                                 | Board                                                                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Foundation, personality, identity forms, and usage                          | [`brand/01-brand-foundation.png`](./brand/01-brand-foundation.png)                             |
| Colour, typography, spacing, materials, accessibility, and timer components | [`brand/02-visual-identity-system.png`](./brand/02-visual-identity-system.png)                 |
| Motion timing, silent sessions, completion sound, and reduced motion        | [`brand/03-motion-and-sound-system.png`](./brand/03-motion-and-sound-system.png)               |
| Navigation, information architecture, and core experience flows             | [`brand/04-product-architecture-and-flows.png`](./brand/04-product-architecture-and-flows.png) |
| Splash, welcome, practice goal, schedule, and reminder permission           | [`screens/01-onboarding.png`](./screens/01-onboarding.png)                                     |
| Today, duration, and completion sound                                       | [`screens/02-daily-practice.png`](./screens/02-daily-practice.png)                             |
| Active session, gentle ending, and completion                               | [`screens/03-meditation-flow.png`](./screens/03-meditation-flow.png)                           |
| Progress, history, schedule, reminders, and settings                        | [`screens/04-progress-and-settings.png`](./screens/04-progress-and-settings.png)               |
| Components, navigation, bottom sheet, and system states                     | [`screens/05-component-and-states.png`](./screens/05-component-and-states.png)                 |

`previous-design-work/` is historical source material, not a dependency of this package. Keep it until the implemented app has received final visual approval; after that, it can be removed.
