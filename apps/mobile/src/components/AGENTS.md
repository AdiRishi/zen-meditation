# Components

## Organization

- `src/components/ui/` — generic reusable UI primitives such as typography and screen containers.
- `src/components/screens/<screen-name>/` — components specific to a single screen.
- `src/components/` top level — app-shell and shared app components such as providers, tabs, links, and brand elements.

Prefer extracting components into files over co-locating them in screen files. Screen files in `src/screens/` should focus on data fetching, state, and composition.

## Styling

Tailwind CSS v4 is provided by Uniwind through `className` on React Native components. Theme tokens live in `src/global.css` under `@layer theme`.

Use `tailwind-variants` (`tv()`) for reusable variant-based styling. Small one-off conditional classes are fine when they stay readable.

HeroUI Native: `Card` extends `Surface`, which applies base padding. To remove default card padding, set `className="p-0"` on `<Card>` itself, not on `<Card.Body>`.

## Safe Areas

`StandardView`, `StandardScrollView`, and `FormScrollView` own screen safe-area handling through `useScreenContainerInsets`. Keep scroll-view and safe-area mechanics centralized in `ScreenScrollViewBase`.

Do not wrap these containers in `SafeAreaView` or apply Uniwind safe-area utilities (`py-safe`, `pt-safe-*`, `pb-safe-*`). Use `edgeToEdge` only for intentional full-bleed screens, and put content spacing in `contentContainerClassName`.

Full-window screen scroll containers guarantee that content is at least as tall as the visible viewport, so `justify-between` and `justify-center` compositions lay out against what the person actually sees. Native-tab and contained surfaces make no viewport-height promise. Never size scroll content yourself with `min-h-full`, `h-full`, or `grow` — percentage heights and `flexGrow` resolve against the scroll frame, which on iOS includes the safe areas, and they override the container's guarantee with an overflowing one.

For a primary action pinned to the bottom of a screen, use `StickyFooterScrollView` (`Root` + `Body`/`FormBody` + `Footer`): the footer lives outside the scroll view, owns its safe-area clearance, and stays visible however tall the body grows.

## Comments

Prefer clearer code over explanatory comments. Use short JSX section comments only to mark meaningful blocks in larger components.
