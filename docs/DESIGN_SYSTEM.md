# tradeX Frontend Design System & UI/UX Standards

**Version:** 1.0  
**Project:** tradeX Campus Marketplace  
**Audience:** Verified University Students & Campus Administration  

---

## 1. Visual Identity & Brand Direction

tradeX is an exclusive university student marketplace built for safe, transparent peer-to-peer campus trading.

- **Primary Brand Theme**: Brunswick & Deep Emerald Green (`#061914`, `#06D6A0`, `#05BA8B`).
- **Surface Modes**:
  - **Persuade (Marketplace Feed & Landing)**: High visual energy, dynamic 3D arch product showcase carousel, fluid curved wave navigation.
  - **Operate (Chat Studio & Admin Dashboard)**: Restrained, dense, highly functional, zero clutter. The tool disappears into the task.
  - **Trust Circle**: High-visibility verification badges (`Verified Student`), transparent safety notices, and private encrypted document handling.

---

## 2. Color Palette & Semantic Vocabulary

### Primary & Brand Colors
- **Brand Emerald (`--emerald-500`)**: `#06D6A0` — Primary actions, active highlights, verified badges.
- **Brand Deep Emerald (`--emerald-700`)**: `#05BA8B` — Interactive text, secondary buttons.
- **Dark Brunswick Chrome (`--brunswick-950`)**: `#061712` — Root background, top bar background, chat studio background.
- **Brunswick Secondary (`--brunswick-900`)**: `#0B2820` — Sidebar surfaces, card headers.

### Semantic State Colors
- **Success (`Approved / Live`)**: `#059669` / `#06D6A0` (Background: `rgba(6, 214, 160, 0.14)`)
- **Warning (`Pending Review / Action Needed`)**: `#D97706` / `#F59E0B` (Background: `rgba(245, 158, 11, 0.14)`)
- **Error / Danger (`Rejected / Suspended / Safety Report`)**: `#DC2626` / `#EF4444` (Background: `rgba(239, 68, 68, 0.15)`)
- **Neutral / Meta (`Timestamps, IDs, Secondary`)**: `#64748B` / `#7AA99A`

---

## 3. Typography & Hierarchy

- **Display Headings**: `Plus Jakarta Sans` / `Josefin Sans` (SemiBold 600, Bold 700).
- **Body & Data**: `Inter`, `-apple-system`, `sans-serif` (Regular 400, Medium 500, SemiBold 600).
- **Tabular Data & Numbers**: `font-variant-numeric: tabular-nums` for prices, timestamps, student IDs, and OTP codes.
- **Scale Ratios**: Tighter scale ratio (1.15–1.2) for administrative surfaces to preserve dense scanability.

---

## 4. Layout & Spacing Conventions

- **8pt Grid**: Multiples of 4px and 8px (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
- **Surface Elevation**: Subtle 1px borders with emerald tint (`rgba(6, 214, 160, 0.28)`) paired with soft drop-shadows. No harsh full-opacity shadows.
- **Responsive Breakpoints**:
  - Desktop: `1024px+` (Multi-pane split consoles, persistent sidebars).
  - Tablet: `768px – 1023px` (Collapsible side-drawers, stacked review panels).
  - Mobile: `320px – 767px` (Tabbed switchers, full-width touch targets, sticky bottom action bars).

---

## 5. Component Interaction & Animation Guidelines

- **Speed**: 150ms–200ms ease-out on hover, active, and toggle states.
- **Purpose-Driven Motion**: Animations only indicate state changes, reveals, or feedback. No gratuitous continuous spinning or bouncing.
- **States Required on Interactive Elements**: `default`, `hover`, `focus-visible`, `active`, `disabled`, and `loading`.
- **Keyboard Navigation**: All interactive controls must support `Tab`, `Enter`, and `Escape`.
