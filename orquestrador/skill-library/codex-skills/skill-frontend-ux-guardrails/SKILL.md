---
name: skill-frontend-ux-guardrails
description: Apply frontend UX quality gates for SaaS dashboards, product screens, modals, tables, forms, responsive layouts, overflow fixes, accessibility, visual validation, spelling, and reduction of UI rework.
category: frontend
risk: medium
source: local-product-ux-guardrails
---

# Skill Frontend UX Guardrails

Use this skill to harden visible product UI before delivery. Treat it as a quality gate for responsive behavior, readability, visual integrity, and interaction states.

## Impeccable Design Pass

Use the [Impeccable](https://impeccable.style/) vocabulary when the interface needs more than a bug fix:

- Establish context before changing visuals: audience, product versus brand surface, voice, visual direction, and anti-references. If the repository uses them, read `PRODUCT.md` and `DESIGN.md`.
- Route by symptom: `typeset` for typography, `layout` for rhythm and space, `colorize` for palette and contrast, `animate` for purposeful motion, `clarify` for copy, and `adapt` for responsive behavior.
- Run the pre-ship loop on a narrow target: `audit` for accessibility, performance, theming, responsive quality, and anti-patterns; `clarify` for confusing copy; `harden` for edge cases, internationalization, errors, and overflow.
- Check for generated-UI tells: generic gradients, gratuitous glassmorphism or glow, side-accent cards, card nesting, flat type hierarchy, one-font-everywhere, giant icon tiles, redundant helper copy, and modal abuse. Keep an intentional pattern only with a product rationale.
- When available, run `npx impeccable detect <target>` as an additional deterministic signal. It complements, but does not replace, browser QA and accessibility checks.

## Quality Rubric

Score the target from 0 to 4 for hierarchy, contrast, responsiveness, accessibility, performance, and visual distinctiveness. Record P0/P1 issues before polish; defer P2/P3 refinements when they do not affect the primary task.

## Workflow

1. Inspect the existing product surface first: routes, components, design tokens, layout primitives, and current breakpoints.
2. Define the primary user task for the screen. Remove or demote UI that does not help that task.
3. Start with constrained viewports: `320x568`, `390x844`, `768x1024`, `1024x768`, and `1440x900`.
4. Fix layout stability before polish: overflow, wrapping, spacing, sticky areas, table width, modal height, and action placement.
5. Validate all user-visible states touched by the change: loading, empty, error, disabled, success, pending, selected, hover, focus, and destructive confirmation.
6. Check copy and encoding. Preserve correct accents, product terms, punctuation, and casing. Do not leave mojibake, replacement characters, or broken ASCII fallbacks.
7. Run the lightest meaningful verification: lint/typecheck/build when available, plus browser or screenshot checks for visible UI changes.

## SaaS Dashboard Guardrails

- Keep dashboards scannable: one clear header, one primary action, grouped filters, aligned metrics, and predictable table/chart placement.
- Prefer dense but readable operational layouts over marketing hero sections inside app surfaces.
- Use stable dimensions for metric cards, charts, tables, sidebars, toolbars, and status chips so content changes do not shift the layout.
- Make filters explicit and recoverable: show active filters, empty results, reset actions, and persisted query state when the product already supports it.
- Do not hide critical actions only behind hover on touch layouts.
- Do not require horizontal scrolling for core comprehension. If a data table must scroll, keep labels, actions, and context visible.

## Responsive Checks

- At `320px`, verify buttons wrap or compress without text clipping, tables degrade intentionally, and modals fit within the viewport.
- At tablet widths, verify sidebars, drawers, and charts do not leave unusable gutters or overlapping controls.
- At desktop widths, verify content does not stretch into unreadable line lengths or sparse card grids.
- Test long realistic values: customer names, emails, plan names, currency, percentages, error messages, and localized labels.
- Confirm safe areas for sticky headers, bottom bars, drawers, popovers, and toasts.

## Visual Validation

- Use browser snapshots or screenshots when changing layout, typography, charting, navigation, or modal behavior.
- Compare before and after if the change is a redesign or visual cleanup.
- Check for blank canvases, invisible text, clipped icons, duplicate scrollbars, overlapping overlays, and low-contrast disabled states.
- Verify keyboard focus order and visible focus styles for forms, menus, dialogs, and table actions.
- Report the viewports tested and any residual visual risk.

## Done Criteria

- No unintended page-level horizontal overflow.
- Mobile and desktop layouts are intentionally designed.
- User actions and system states are clear.
- Text is spelled correctly and UTF-8 safe.
- Existing routes, form behavior, and analytics are preserved unless the task explicitly changes them.
