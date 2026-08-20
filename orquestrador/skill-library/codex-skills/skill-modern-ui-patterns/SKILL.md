---
name: skill-modern-ui-patterns
description: Use for professional SaaS UI implementation and refinement in React, TypeScript, Tailwind, dashboards, admin panels, tables, forms, settings, billing, onboarding, responsive layouts, component states, and design-system consistency.
category: frontend
risk: low
source: local-saas-ui-patterns
---

# Skill Modern UI Patterns

Use this skill when building or improving operational SaaS screens. Favor product clarity, compact density, accessibility, and maintainable components over decorative novelty.

## Impeccable Product Vocabulary

Use [Impeccable](https://impeccable.style/) as a design-thinking layer, not as a replacement for the existing component system:

- Start from product context: audience, task, product voice, and visual defaults to avoid. Reuse `PRODUCT.md` and `DESIGN.md` when present.
- For new work, use `shape` (brief) -> `craft` (implementation) -> `critique` (design review) -> `polish` (final refinement). For existing work, begin with `critique` or a named pass such as `typeset`, `layout`, `colorize`, `quieter`, or `bolder`.
- Separate product mode from brand mode: dashboards and admin screens need semantic states, repeatable components, and fluent density; landing pages can carry stronger type, imagery, and brand expression.
- Prefer purposeful hierarchy and restraint over AI-default decoration. Avoid generic gradients, excessive roundness, glass cards, nested cards, oversized icon containers, repetitive section kickers, and a single undifferentiated font unless the design system has a reason for them.
- Finish with `audit` and `harden` when the change affects production UI, then verify realistic content, responsive states, accessibility, and existing analytics.

## Symptom Routing

- Generic or interchangeable -> `critique`, `distill`, then `bolder` or `shape`.
- Busy or overdecorated -> `quieter`, `distill`, and remove redundant copy or containers.
- Broken on small screens -> `adapt`, `layout`, and `harden` with long localized values.
- Hard to scan -> `typeset`, `layout`, and strengthen primary-action hierarchy.

## Workflow

1. Reuse the app shell, component library, tokens, icons, form helpers, table patterns, and data-loading conventions already in the repository.
2. Identify the screen type: dashboard, list/table, detail page, form, settings, billing, onboarding, support/admin, or reporting.
3. Map the core workflow: scan, filter, compare, act, confirm, recover. Design the UI around that sequence.
4. Implement with stable structure: predictable grid tracks, constrained widths, consistent spacing, and responsive state transitions.
5. Add complete states for data and interaction: skeleton/loading, empty, no results, partial error, permission denied, saving, saved, validation error, and destructive confirmation.
6. Verify the result in mobile, tablet, and desktop viewports before claiming completion.

## Dashboard Patterns

- Put the page title, freshness indicator, primary action, and key filters near the top.
- Use metric cards only for decision-making numbers; include trend, period, source, or caveat when ambiguity would cause rework.
- Prefer one strong chart or table cluster over many small decorative cards.
- Keep chart legends, tooltips, and empty states readable at small widths.
- Use clear units and formatting: currency, dates, rates, counts, percentages, latency, and quota.
- Make drill-down paths obvious through row clicks, detail drawers, segmented controls, or tabs.

## Component Patterns

- Use icon buttons for common compact tools: edit, delete, copy, refresh, export, filter, search, sort, expand, collapse, undo, redo, close.
- Use text or icon-plus-text buttons for commands whose consequence must be explicit.
- Keep cards shallow. Do not place page sections inside floating cards or nest cards inside cards.
- Use drawers for contextual detail, modals for blocking decisions, popovers for lightweight controls, and pages for durable workflows.
- Keep destructive actions confirmable and auditable. Show what will be affected.
- Preserve existing analytics, URLs, form semantics, and keyboard behavior while refactoring UI.

## Forms And Tables

- Put validation near the field, summarize submission failures, and preserve user input after errors.
- Mark required fields using the project convention and provide examples for ambiguous values.
- Keep table headers, row actions, sorting, filtering, pagination, and bulk selection consistent with existing screens.
- Provide empty states with one clear next action when action is possible; otherwise explain the missing prerequisite briefly.
- For wide tables, prioritize columns, provide column visibility or detail expansion when feasible, and avoid hiding primary identifiers.

## Professional Finish

- Keep palettes balanced; avoid one-note purple/blue, beige, slate, or brown themes unless the product already uses them.
- Use typography hierarchy appropriate to the surface. Do not use hero-scale text inside dashboards, cards, or sidebars.
- Keep copy specific, spelled correctly, and free of mojibake.
- Verify contrast, focus states, disabled states, truncation, wrapping, and icon alignment.
- Do not add new UI dependencies unless they solve a concrete gap and match the existing stack.

## Done Criteria

- The UI supports the main workflow without explanation text.
- Layout remains stable with realistic data and long labels.
- Loading, empty, error, and success states are implemented where relevant.
- Responsive behavior is verified.
- Lint, typecheck, build, or targeted tests run when available.
