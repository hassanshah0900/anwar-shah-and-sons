# 0004. Monochrome design system on shadcn/ui

- **Status**: Accepted
- **Date**: 2026-11-01

## Context

The storefront sells clothing, so product photography should carry the colour, and the
interface should stay out of its way. The look should feel deliberate and editorial, not
like a generic component-library template (bright accents, heavily rounded cards, pill
buttons, soft shadows). We also want to move quickly, with accessible components.

## Decision

Build the UI with **Tailwind CSS 4** and **shadcn/ui** (Radix primitives), restyled to a
strict system:

- **Colour:** black, white and zero-chroma greys, as semantic tokens (`background`,
  `foreground`, `muted`, `border`, ...) with light and dark values. Destructive and success
  are low-chroma and used only for status.
- **Shape:** minor rounding only. The radius scale tops out at 4px (`rounded-xs` to
  `rounded-lg`). `rounded-full` is reserved for genuinely circular elements.
- **Depth:** borders separate surfaces. Shadows are faint and only lift overlays. No
  gradients, no backdrop blur.
- **Type:** Instrument Serif for display headings, Geist for the interface, Geist Mono for
  codes such as SKUs. Prices use tabular figures.
- **Themes:** light and dark via `next-themes`, following the system setting by default.

shadcn/ui was chosen over MUI, Chakra and Mantine because its components are copied into
the repository as plain Tailwind code we own and can restyle, rather than a styling
runtime we work against. The shadcn CLI runs pinned through `npx` and is not a dependency.

### Enforcement

The rules are enforced in code rather than left to review:

1. `globals.css` resets Tailwind's default colour, radius and shadow scales. Classes such
   as `bg-blue-500` generate no CSS, and larger radius or shadow steps resolve to the capped
   values.
2. `src/test/design-system.test.ts` fails the test run on what the theme cannot block:
   default-palette classes, arbitrary radius or colour values, radius steps above
   `rounded-lg`, gradients and backdrop blur.
3. `/styleguide` renders every token and component in both themes for visual review.

## Consequences

- The store has one consistent, recognisable look, and photography stands out.
- New components must use semantic tokens. A new colour need means adding a token, which
  is a visible and reviewable change.
- Components pulled from shadcn/ui must be reviewed and restyled on arrival. The guard test
  flags most deviations automatically.
- Status colours are intentionally quiet, so errors also need clear text, not colour alone.
