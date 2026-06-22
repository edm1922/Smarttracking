---
name: Smart Tracking
description: Internal enterprise operations platform for inventory, payroll, and workflow management
colors:
  corporate-blue: "#2563eb"
  corporate-blue-deep: "#1e40af"
  accent-green: "#50C878"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-muted: "#f1f5f9"
  neutral-border: "#e2e8f0"
  neutral-ink: "#0f172a"
  neutral-secondary: "#64748b"
  admin-bg: "#0f172a"
  admin-sidebar: "#1e293b"
  admin-border: "#1e293b"
  admin-accent: "#6366f1"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 900
    fontSize: "1.875rem"
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 900
    fontSize: "0.625rem"
    letterSpacing: "0.05em"
    textTransform: "uppercase"
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
---

# Design System: Smart Tracking

## 1. Overview

**Creative North Star: "The Operations Bridge"**

Smart Tracking is an internal operations platform built for precision and speed. The interface takes its cue from a mission control center — everything has a place, everything has a purpose, and the operator's attention is the resource worth protecting. Density is high enough to be useful, never high enough to overwhelm.

The system expressly rejects cluttered enterprise UI conventions. No cascading tab bars, no data dumps without hierarchy, no three-click scavenger hunts. Instead, every screen leads with a clear primary action and surfaces relevant data through progressive disclosure. Cards have room to breathe. Tables are the default for dense data, not endless nested lists.

**Key Characteristics:**
- Clean layout with generous whitespace around primary content areas
- Cards use subtle shadows for depth, not heavy borders or glass effects
- Dark admin portal is a deliberate contrast, not a default aesthetic
- Typography-driven hierarchy: bold weight and uppercase tracking signal importance
- Purpose-built feel — not a generic template

## 2. Colors

The palette is restrained and functional: a single blue primary, a neutral scale for structure, and a reserved green for affirmative actions. Dark mode (admin portal) uses the same philosophy inverted.

### Primary
- **Corporate Blue** (`#2563eb`): Primary actions, active navigation, focused states, and the brand anchor. Use for buttons, links, selected nav items, and focus rings. Maintains 4.5:1 contrast on all surfaces.
- **Corporate Blue Deep** (`#1e40af`): Hover states for primary buttons and interactive elements. One step darker for the same hue family.

### Secondary (Admin Portal Only)
- **Indigo Accent** (`#6366f1`): The admin portal's equivalent of Corporate Blue — replaces it on all admin-themed surfaces to distinguish the two contexts.

### Success
- **Accent Green** (`#50C878`): Save, create, and release actions. Distinct from the primary blue to signal commitment (persisting data) versus navigation. Used for "Add Item", "Save", and release workflow buttons.

### Neutral
- **Slate Ink** (`#0f172a`, `#f8fafc` in dark mode): Body text and primary headings. Minimum 4.5:1 against all backgrounds.
- **Cloud Surface** (`#ffffff`, `#0f172a` in dark mode): Card and container backgrounds.
- **Mist Surface** (`#f8fafc`, `#0f172a` in dark mode): Page-level background outside cards.
- **Silver Border** (`#e2e8f0`, `#1e293b` in dark mode): Lines, dividers, table strokes, input borders.
- **Steel Slate** (`#64748b`): Secondary and muted text, placeholder labels, inactive navigation.

### Named Rules

**The One-Accent Rule.** Corporate Blue is the only accent on any standard screen. Green is reserved for affirmative data mutations; it is not a decoration. The admin portal swaps blue for indigo but keeps green unchanged — a deliberate signal that the primary context has shifted.

## 3. Typography

**Display & Body Font:** Geist Variable (with ui-sans-serif, system-ui, sans-serif fallback)
**Mono Font:** Geist Mono Variable (with ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace fallback)

**Character:** Confident and utilitarian. Geist's tight letterforms and even color suit a data-heavy interface where legibility at small sizes is critical. The system relies on weight contrast (900 weight for labels, 400 for body) rather than size contrast alone, so dense tables and sidebars remain scannable.

### Hierarchy
- **Page Title** (`text-3xl`, 900 weight, `1.25` line-height, `tracking-tight`): Top-level page heading. Appears once per view.
- **Card Heading** (`text-xl`, 700-900 weight, `tracking-tight`): Section titles within cards and modal dialog headers.
- **Subheading** (`text-sm`, 600 weight): Secondary groupings, table header equivalent text.
- **Body** (`text-sm`, 400 weight, `0.875rem / 1.5`): Default reading size for table cells, form values, descriptions.
- **Label / Caption** (`text-[10px]`, 900 weight, `0.05em` letter-spacing, uppercase): The signature Smart Tracking voice — ultracompact, all-caps labels for table column headers, sidebar section titles, stat card labels, and form group headers.
- **Mono** (`text-xs / text-sm`): Code, IDs, reference numbers, and system identifiers.

### Named Rules

**The All-Caps Authority Rule.** Critical interface labels (table headers, sidebar sections, button text, stat card descriptors) are set in `10px / 900 weight / 0.05em tracking / uppercase`. This is not decorative — it packs meaning into minimal horizontal space and creates a consistent scannable rhythm. Paragraph-length content never uses uppercase.

## 4. Elevation

The system uses a hybrid approach: shadows for depth signaling on interactive containers, flat surfaces for backgrounds and static content. Shadows are subtle and purposeful — never dramatic — consistent with the professional, no-nonsense brand personality.

### Shadow Vocabulary
- **Card Rest** (`shadow-sm`): Default resting state for cards and containers. A whisper of depth that separates content from the page background without calling attention to itself.
- **Card Hover** (`shadow-md`, with `hover:shadow-md transition-shadow`): Cards gently lift on hover to signal interactivity. The transition is subtle — no dramatic float effect.
- **Modal** (`shadow-2xl`): Dialog and modal windows. The heaviest shadow in the system, establishing clear modal hierarchy over all other content.
- **Premium Modal** (`shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]`): High-impact modals (release workflow, large previews). Used sparingly — only when the modal content itself merits the emphasis.
- **Premium Button** (`shadow-lg shadow-primary/20` or `shadow-lg shadow-green-200/50`): Colored shadows on primary and success buttons, matching the button's own hue at low opacity. Adds tactile confidence to the call-to-action.

### Named Rules

**The Flat-By-Default Rule.** Backgrounds, table rows, and structural containers are flat. Shadows only appear on interactive surfaces (cards, buttons, modals) as a response to state. A flat surface at rest is a deliberate design choice, not an unfinished one.

## 5. Components

### Buttons

Buttons are compact and typography-driven. Every variant centers on a `font-black` weight with `uppercase tracking-widest` at `10px–11px` for a tactile, confident feel. Radius varies by context (`rounded-lg` for inline, `rounded-xl` to `rounded-2xl` for hero positions).

- **Shape:** `8px` (`rounded-lg`) for inline toolbar buttons; `12px–16px` (`rounded-xl` to `rounded-2xl`) for prominent call-to-action buttons; `24px` (`rounded-[2rem]`) for full-width modal actions.
- **Primary Solid:** Corporate Blue background, white text, shadow matching the button hue. Hover darkens to Corporate Blue Deep. Active state scales inward (`active:scale-95`) for tactile feedback.
- **Success Solid:** Accent Green background, white text, green-tinted shadow. Hover darkens the green. Same active scale pattern. Used exclusively for data-persisting actions (save, add item, release).
- **Secondary / Ghost:** Silver Border or no border, Steel Slate text, transparent or Mist background. Hover adds a subtle background tint.
- **Destructive:** Red-600 background, white text, red-tinted shadow. Same active scale pattern.
- **Dark (Admin):** Slate Ink background, white text. Admin portal only.
- **Inset (Export/Utility):** White background, Silver Border, neutral-gray text. Hover lifts the border contrast.

### Cards / Containers

- **Corner Style:** `16px–24px` (`rounded-2xl` to `rounded-3xl`). Dashboard stat cards and chart containers use `rounded-3xl`; inline cards and skeleton placeholders use `rounded-2xl`.
- **Background:** Cloud Surface (`#ffffff`).
- **Border:** Silver Border (`#e2e8f0`, 1px).
- **Shadow:** `shadow-sm` at rest, `shadow-md` on hover (with `transition-shadow`).
- **Internal Padding:** `32px` (`p-8`) for dashboard cards, `24px` (`p-6`) for inline cards, `16px` (`p-4`) for compact cards.
- **Internal Layout:** Cards group related content with a heading row and body below. They never nest inside other cards.

### Inputs / Fields

- **Style:** `8px` (`rounded-md`) or `12px` (`rounded-lg`) radius, Silver Border stroke, transparent or Mist Surface background. Compact inputs use `rounded-md`; prominent form fields use `rounded-lg`.
- **Focus:** Corporate Blue border ring (`focus:border-primary`, `focus:ring-1 focus:ring-primary`). For premium forms, a `4px` Corporate Blue glow ring (`focus:ring-4 focus:ring-primary/10`) behind the field.
- **Premium Inputs:** Appear in release workflows and edit dialogs. Use `rounded-2xl`, 50% opacity Mist Surface background, weight `font-bold`, with a wider `4px` glow on focus.
- **Disabled:** 50% opacity Mist Surface background (`bg-gray-50`), muted text, no interaction.
- **Error:** Red-300 border with red-tinted focus ring. Error message appears below the field at `text-sm text-red-600`.
- **Placeholder:** Steel Slate at 4.5:1 contrast ratio. Never the default muted gray.

### Navigation

- **Sidebar:** Fixed 256px (`w-64`) column, Cloud Surface background, full-height. Navigation items are compact: `12px` font, `rounded-md`, `32px` vertical padding per item. Active state fills with Corporate Blue; inactive items carry Steel Slate text with hover to Slate Ink.
- **Section Labels:** Use the all-caps authority pattern: `10px / 900 weight / uppercase tracking-wider / Steel Slate`.
- **Sub-items:** `12px` font, `22px` vertical padding per item, indented. Active state uses a 5% opacity Corporate Blue fill with Corporate Blue text.
- **Role Badges:** `rounded-full` pills at `10px` / `900 weight` / uppercase / tracking-widest. Color-coded per role (amber for payroll_staff, blue for payroll_admin, purple for admin).

### Tables

The primary data presentation pattern in the system. Enterprise-grade with sticky headers and custom scrollbars.

- **Shape:** `12px` (`rounded-xl`) outer container, `rounded-none` interior.
- **Header:** Fixed sticky header at top, background Mist Surface, font-weight `900` with uppercase tracking at `10px`, Steel Slate text.
- **Rows:** `16px` vertical padding per cell, alternating or solid Snow Mist. Hover activates a subtle background tint.
- **Thumb Scrollbar:** Custom `6px` scrollbar with rounded thumb in Silver Border — thinner than the browser default so table chrome doesn't dominate.

## 6. Do's and Don'ts

### Do:
- **Do** use Corporate Blue as the sole primary accent on standard screens. One accent, one voice.
- **Do** use Accent Green exclusively for data-persisting actions (save, create, release). It is a semantic signal, not a decorative color.
- **Do** lead every screen with a clear primary action. The page title and first button should answer "what do I do here?"
- **Do** use the all-caps label system (`10px / 900 weight / uppercase / tracking-widest`) for table headers, sidebar sections, stat card labels, and button text. This is the system's signature voice.
- **Do** use tables for dense data. Tables with sticky headers and custom scrollbars are the correct container for inventory lists, transaction logs, and data grids.
- **Do** use progressive disclosure for secondary detail. Cards should show what's needed, not everything possible.
- **Do** keep cards at one level of nesting. Cards inside cards create visual clutter and violate the system's clarity principle.
- **Do** confirm destructive actions with a modal that requires explicit acknowledgment (exact name typing or confirmation text).
- **Do** maintain WCAG 2.1 AA contrast on all text, including placeholders and disabled states.

### Don't:
- **Don't** use Corporate Blue for success/save actions. Green signals commitment; blue signals navigation.
- **Don't** nest cards inside cards. If you need hierarchical containers, use a table or a flat list with indentation.
- **Don't** use glassmorphism, gradient text (`background-clip: text`), or decorative backdrop blurs. The system is functional, not decorative.
- **Don't** add side-stripe borders (`border-left` or `border-right` greater than 1px as a colored accent) on cards or list items. Use full borders or background tints instead.
- **Don't** use bounce or elastic easing on transitions. Ease-out curves only.
- **Don't** use generic SaaS template patterns: identical card grids with icon + heading + text, hero-metric templates (big number + small label + gradient accent), or tiny uppercase eyebrow text above every section.
- **Don't** use pure black (`#000`) or pure gray — always tint toward the surrounding hue.
- **Don't** use excessive animation. Motion serves function: state transitions, modal entrances, and hover feedback. No choreographed page entrances or scroll-driven sequences.
- **Don't** let heading text overflow its container. Test clamp values at every breakpoint.
- **Don't** use Inter, Arial, or system default fonts. Geist is the system's typeface — use it consistently.
