# Zen Brand System

> **Current specification.** See the [brand foundation](./brand/01-brand-foundation.png), [visual identity system](./brand/02-visual-identity-system.png), and [motion and sound system](./brand/03-motion-and-sound-system.png) for the canonical visual expression of this system. The written typography specification and `tokens.json` supersede the legacy family labels printed on the visual-identity board.

## Foundation

**Purpose:** Make a regular meditation practice easier to begin, sustain, and return to.

**Product promise:** Support the practice without becoming the focus of it.

**Brand essence:** Presence without pressure.

**Tagline:** A quiet rhythm for daily practice.

### Personality

- Calm, never sleepy.
- Thoughtful, never precious.
- Warm, never sentimental.
- Confident, never demanding.
- Minimal, never empty.

### Voice

Use short, direct sentences. Invite rather than instruct. Acknowledge effort without judgement. Avoid urgency, productivity language, spiritual clichés, and exaggerated praise.

## Identity

The ensō is the primary symbol. Its open circle represents a practice that is alive rather than perfected: complete enough to hold the moment, open enough to begin again.

- Preserve the brush texture and open right edge.
- Use Ink on Mist for the primary mark.
- Use Mist on Ink for the inverse mark.
- Keep clear space equal to one quarter of the symbol diameter.
- Do not rotate, redraw, outline, place in another container, or combine it with decorative effects.

## Colour

| Token | Hex       | Role                                       |
| ----- | --------- | ------------------------------------------ |
| Mist  | `#F5F2EB` | Primary canvas and inverse foreground      |
| Sand  | `#E6DFD2` | Elevated surfaces and quiet fills          |
| Stone | `#CFC6B8` | Borders, separators, and inactive controls |
| Moss  | `#7B866E` | Brand accent and positive completion       |
| Slate | `#4B5154` | Secondary text and dark surfaces           |
| Ink   | `#1E2326` | Primary text, emphasis, and dark canvas    |

Light mode uses Mist as the canvas, warm white for raised surfaces, Ink for primary text, Slate for secondary text, and Moss for selected or affirmative actions.

Dark mode uses Ink as the canvas, Slate-derived surfaces, Mist for primary text, Sand for secondary text, and a softened Moss accent. Dark mode should remain warm and quiet rather than becoming high-contrast black.

## Typography

Zen pairs **Geist** with **Newsreader**. Both families are available through Google Fonts under the SIL Open Font License 1.1 and may be bundled in the product without a commercial font licence.

### Primary sans — Geist

Use Geist for body copy, labels, controls, navigation, and data. Its restrained neo-grotesque construction keeps the interface clear and contemporary without making it feel technological or demanding.

Use Regular for reading text, Medium for controls and labels, and Semibold only where hierarchy cannot be achieved through size, spacing, or colour.

### Serif accent — Newsreader

Use Newsreader sparingly for emotional headlines, session time, and reflective moments. Its screen-first editorial character adds warmth without becoming ornamental or precious.

Use Regular for display text and Medium only when a smaller serif title needs additional presence.

**Newsreader Italic is the product's reflective voice.** Use it for at most one line per screen — the line where Zen speaks softly to the person ("A quiet rhythm carries you home.", "Gently returning."). Never use italic for labels, data, or controls.

### Scale

| Style      | Size / line height | Face               | Use                               |
| ---------- | ------------------ | ------------------ | --------------------------------- |
| Timer      | 68 / 76            | Newsreader Regular | Session time, tabular numerals    |
| Display    | 48 / 52            | Newsreader Regular | Brand and hero moments            |
| Reflection | 20 / 30            | Newsreader Italic  | One reflective line per screen    |
| Eyebrow    | 13 / 18            | Geist Medium       | Tracked date and section eyebrows |
| H1         | 36 / 42            | Newsreader Regular | Primary screen statement          |
| H2         | 28 / 34            | Newsreader Regular | Section heading                   |
| H3         | 20 / 26            | Geist Medium       | Card and modal heading            |
| Body       | 16 / 24            | Geist Regular      | Primary reading text              |
| Small      | 14 / 20            | Geist Regular      | Supporting content                |
| Label      | 12 / 16            | Geist Medium       | Controls and metadata             |
| Caption    | 11 / 15            | Geist Regular      | Timestamps and tertiary detail    |

Use tabular numerals for timers, durations, streaks, and charts. Avoid bold display typography and dense all-caps copy. Short labels may use modest tracking.

## Layout

- Build on an 8-point spacing rhythm.
- Use 24-point phone gutters and 32-point major section spacing.
- Keep the primary action within comfortable thumb reach.
- Prefer one clear focal point per screen.
- Use negative space to reduce decision pressure, not as decoration.
- Minimum touch target: 44 by 44 points.

### Shape and depth

- Small radius: 8 points.
- Control radius: 12 points.
- Card radius: 20 points.
- Modal radius: 28 points.
- Full pill: 999 points.
- Use warm tonal separation before shadows.
- Shadows should be broad, soft, and low opacity.
- Borders should be one pixel and low contrast.

## Components

- **Session ring:** the signature element. A hairline circular track that a moss arc draws closed as a session progresses; the arc always stops short of closing (a 12° ensō gap, "open enough to begin again"). Reused at every scale: around the breathing field, drawn in on completion, and as day rings in rhythm views. Planned days show an empty track; sitting draws the circle.
- **Primary action:** Moss fill, Mist label, full pill, full-width when it closes a decision.
- **Secondary action:** transparent or Sand fill with Ink label.
- **Cards:** warm surface, quiet border, one clear purpose.
- **Selectors:** large readable value, restrained selected ring, no ornamental chrome.
- **Progress:** rings, dots, and restrained bars; no confetti or aggressive achievement treatment.
- **Navigation:** three destinations — Today, Progress, Settings.
- **Timer:** serif tabular numerals with guidance secondary to time.

## Motion

Motion should feel like breath, never spectacle.

- Tap response: 120 ms.
- Screen transition: 240 ms.
- Card or modal transition: 240–450 ms.
- Breathing loop: 2.4–3.2 seconds.
- Use gentle ease-out on entry and ease-in on exit.
- Avoid bounce, overshoot, rapid parallax, and decorative looping.
- Respect reduced-motion settings with fades and static states.

## Sound and Haptics

- Sessions remain silent until completion.
- The completion sound should be soft, brief, and low in perceived urgency.
- Never use an alarm pattern, repeated alert, or sharp high-frequency attack.
- Haptics are optional and limited to starting, pausing, and completing a session.
- Reminder sounds follow system settings and should not attempt to command attention.

## Accessibility

- Meet WCAG AA contrast for text and essential controls.
- Keep body text at 16 points by default.
- Support Dynamic Type without clipping or overlapping.
- Give every control a clear accessibility label and state.
- Do not communicate progress or completion through colour alone.
- Provide reduced-motion behaviour and a fully usable silent experience.
