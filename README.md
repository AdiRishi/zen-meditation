<div align="center">

<img src="./docs/design/assets/moss-app-icon.png" width="112" alt="Moss app icon" />

# Moss

**A quiet rhythm for daily practice.**

Moss is a meditation companion that supports the practice without becoming the focus of it.

</div>

![Moss daily practice experience](./docs/design/screens/02-daily-practice.png)

## Presence without pressure

Meditation asks for quiet. Most phone timers end it with an alarm.

Moss is designed around a gentler experience: choose how long you want to sit, begin with minimal ceremony, and return with a soft sound when the session is complete. Outside the session, flexible goals, subtle reminders, and thoughtful progress help a practice become regular without turning it into another obligation.

Moss is not a guided-meditation service or a content library. It is the calm structure around a person's own practice.

- **Sit without interruption.** Once a session begins, Moss asks for nothing.
- **Return gently.** Soft sound, restrained motion, and calm language replace the abrupt alarm.
- **Build a rhythm.** Flexible schedules and reminders make it easier to come back.
- **See progress without pressure.** Progress is encouraging and tangible, never punitive.

## Designed to recede

Moss's interface is warm, spacious, and purposefully quiet. The open ensō represents a practice that is alive rather than perfected: complete enough to hold the moment, open enough to begin again.

The visual system pairs an ink-and-mist foundation with a restrained moss accent, editorial Newsreader display type, clear Geist interface type, and motion that feels more like breath than spectacle.

The complete foundation lives in the repository:

- [Vision](./docs/VISION.md) — why Moss should exist and how it should feel.
- [Product](./docs/PRODUCT.md) — the core experience, boundaries, and open decisions.
- [Design system](./docs/design/README.md) — brand, screens, assets, and implementation tokens.
- [Brand specification](./docs/design/BRAND.md) — identity, colour, typography, layout, motion, sound, and voice.

## Project status

> [!NOTE]
> Moss is in active development. The complete local-first product flow is implemented; release packaging and store distribution remain future work.

## Engineering

Moss is a TypeScript monorepo scaffold whose current product is built for iOS and Android. The app uses Expo and React Native, keeps preferences and practice history in on-device SQLite, and does not require an account or server connection.

| Layer     | Technology                                          |
| --------- | --------------------------------------------------- |
| App       | Expo 57, React Native 0.86, React 19, Expo Router   |
| Interface | HeroUI Native, Uniwind, Tailwind CSS v4, Reanimated |
| Data      | Expo SQLite, Zod, local notifications               |
| Quality   | Strict TypeScript, Jest, ESLint, Oxfmt              |
| Workspace | pnpm, Turborepo                                     |

## Quick start

You will need the Node.js version in [`.node-version`](./.node-version), pnpm 11, and Xcode or Android Studio for native development.

```bash
git clone https://github.com/AdiRishi/moss-meditation.git
cd moss-meditation
pnpm install
```

Generate the native projects when needed and start the app:

```bash
pnpm run prebuild
pnpm ios

# Or:
pnpm android
```

## Everyday commands

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `pnpm run compile`  | Compile shared internal packages through Turbo |
| `pnpm run check`    | Run lint, formatting checks, and TypeScript    |
| `pnpm run test`     | Run workspace tests through Turbo              |
| `pnpm run format`   | Format the repository with Oxfmt               |
| `pnpm run prebuild` | Regenerate the native iOS and Android projects |

## Repository guide

```text
apps/mobile/     Expo app, routes, screens, and interface components
docs/            Product vision, design system, and architecture decisions
```

Architecture and workflow decisions are recorded in [`docs/adr`](./docs/adr/README.md). The local simulator validation workflow is documented in [`docs/agents/local-validation.md`](./docs/agents/local-validation.md).

## License

Moss is available under the [MIT License](./LICENSE).

---

<div align="center">

Made with ❤️

</div>
