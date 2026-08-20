---
name: skill-open-design-ui
description: Apply open-design product UI workflow for premium visual redesigns, dashboards, landing pages, design tokens, component libraries, responsive product screens, visual QA, anti-generic styling, and professional frontend delivery.
category: frontend
risk: low
source: https://github.com/nexu-io/open-design
---

# Skill Open Design UI

Use this skill when a screen needs a real visual upgrade, a cohesive product direction, or a reduction in generic AI-looking UI. Build the improvement in code, not as a mockup-only recommendation.

## Impeccable Workflow

This skill adopts the design vocabulary from [Impeccable](https://impeccable.style/):

1. Set context before styling: capture audience, product/brand lane, voice, anti-references, and existing tokens in `PRODUCT.md` and `DESIGN.md` when supported.
2. Choose the smallest named intervention: `typeset`, `layout`, `colorize`, `animate`, `clarify`, `adapt`, `distill`, `quieter`, or `bolder`. Avoid vague beautification requests.
3. For greenfield work, use `shape` -> `craft`; for existing screens, use `critique` -> `polish`. Treat generated variants as options to evaluate, not authority.
4. Review with `audit` and `harden`, including accessibility, performance, theming, responsive behavior, internationalization, overflow, error states, and messy real data.
5. Use the anti-pattern catalog as a negative checklist: no decorative gradient text, default purple/cyan palette, gratuitous glassmorphism/glows, side-tab borders, card-in-card nesting, extreme radii, flat typography, or motion without meaning.

When the CLI is available, `npx impeccable detect <target>` can add a deterministic anti-pattern check. It is a supplement to visual inspection, not a substitute for it.

## Workflow

1. Read the existing interface: brand cues, typography, tokens, spacing, component rules, icon library, imagery, routes, and analytics boundaries.
2. Choose one explicit visual direction before coding: Modern Minimal, Tech Utility, Editorial, Bold Product, or Calm Enterprise.
3. Translate the direction into concrete tokens: surface, border, text hierarchy, accent color, elevation, spacing scale, radius, motion, and density.
4. Preserve product function while improving presentation. Do not break routes, forms, event tracking, permissions, or test expectations.
5. Build the smallest complete version that shows the new system across the real states touched by the task.
6. Validate with screenshots or browser inspection at mobile and desktop sizes.

## Direction Rules

- Modern Minimal: use restraint, whitespace, strong hierarchy, and sharp alignment. Avoid empty-looking admin screens.
- Tech Utility: use compact controls, clear status language, dense tables, and precise feedback.
- Editorial: use strong typography and rhythm for content-heavy or public pages, but keep CTAs and product proof visible.
- Bold Product: use confident color and contrast for launch or marketing surfaces without overpowering workflow UI.
- Calm Enterprise: use quiet contrast, predictable navigation, and high information density for repeated daily work.

## Design System Application

- Use existing tokens first. If tokens are missing, introduce local variables with clear names and minimal scope.
- Keep radius, border, shadow, and spacing internally consistent across repeated components.
- Use lucide or the app's existing icon set for standard actions.
- Prefer real product screenshots, real data states, or faithful UI previews over generic illustrations.
- Use cards only for repeated items, grouped data, or framed tools. Do not turn every section into a floating panel.
- Keep mobile as a designed composition, not a stacked desktop layout.

## Visual QA

- Inspect viewports: `320x568`, `390x844`, `768x1024`, `1024x768`, and a desktop width.
- Check text fit, line breaks, clipping, overlapping, contrast, disabled states, hover/focus states, and tap target size.
- Verify charts, canvases, images, icons, and remote assets render and have useful fallbacks.
- Confirm that the first viewport shows the actual product, offer, or working surface, not only decorative atmosphere.
- Run available gates that match the risk: lint, typecheck, build, targeted tests, and E2E when navigation or flows change.

## Copy And Localization

- Replace filler copy with product-specific language tied to the user's next action.
- Keep Portuguese and English text spelled correctly and encoded as UTF-8.
- Avoid visible instructional text that explains the UI instead of making the UI understandable.
- Preserve established product terms and capitalization.

## Done Criteria

- The visual direction is coherent and visible in the implemented screen.
- The primary action and status are clear within three seconds.
- Responsive layouts, interaction states, and copy quality are verified.
- The result is distinctive without copying another product or adding unnecessary dependencies.
