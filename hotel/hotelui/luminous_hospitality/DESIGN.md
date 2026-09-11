---
name: Luminous Hospitality
colors:
  surface: "#0b1326"
  surface-dim: "#0b1326"
  surface-bright: "#31394d"
  surface-container-lowest: "#060e20"
  surface-container-low: "#131b2e"
  surface-container: "#171f33"
  surface-container-high: "#222a3d"
  surface-container-highest: "#2d3449"
  on-surface: "#dae2fd"
  on-surface-variant: "#c7c4d7"
  inverse-surface: "#dae2fd"
  inverse-on-surface: "#283044"
  outline: "#908fa0"
  outline-variant: "#464554"
  surface-tint: "#c0c1ff"
  primary: "#c0c1ff"
  on-primary: "#1000a9"
  primary-container: "#8083ff"
  on-primary-container: "#0d0096"
  inverse-primary: "#494bd6"
  secondary: "#4edea3"
  on-secondary: "#003824"
  secondary-container: "#00a572"
  on-secondary-container: "#00311f"
  tertiary: "#ffb95f"
  on-tertiary: "#472a00"
  tertiary-container: "#ca8100"
  on-tertiary-container: "#3e2400"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#e1e0ff"
  primary-fixed-dim: "#c0c1ff"
  on-primary-fixed: "#07006c"
  on-primary-fixed-variant: "#2f2ebe"
  secondary-fixed: "#6ffbbe"
  secondary-fixed-dim: "#4edea3"
  on-secondary-fixed: "#002113"
  on-secondary-fixed-variant: "#005236"
  tertiary-fixed: "#ffddb8"
  tertiary-fixed-dim: "#ffb95f"
  on-tertiary-fixed: "#2a1700"
  on-tertiary-fixed-variant: "#653e00"
  background: "#0b1326"
  on-background: "#dae2fd"
  surface-variant: "#2d3449"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "700"
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: "600"
    lineHeight: 12px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 16px
  card-gap: 12px
---

## Brand & Style

The design system is engineered for a high-performance, data-driven hospitality management environment. The brand personality is **sophisticated, technical, and vigilant**, designed to provide hotel partners with a sense of control and clarity during busy operations.

The visual style is a fusion of **Corporate Modernism** and **Glassmorphism**. It utilizes a deep "midnight" foundation to reduce eye strain during long shifts, layered with translucent cards that feature subtle glowing borders and vibrant neon accents. These accents act as functional beacons, drawing the user's eye to critical status updates and performance metrics. The emotional response is one of premium reliability—an interface that feels as high-end as the properties being managed.

## Colors

This design system utilizes a **dark-first palette** optimized for depth and information hierarchy.

- **Foundation:** The canvas is a deep, near-black navy. Surfaces use a layered approach with semi-transparent navy-grays to create a "glass" effect.
- **Accents:** A neon-inspired spectrum is used strictly for semantic meaning.
  - **Vibrant Blue/Indigo:** Primary actions and brand presence.
  - **Emerald Green:** Growth metrics, "Available" status, and successful payments.
  - **Amber/Orange:** "Occupied" or "Pending" states requiring attention.
  - **Rose/Red:** Maintenance issues or cancellations.
- **Gradients:** Subtle linear gradients (e.g., Indigo to Purple) are used for high-impact areas like VIP badges or primary header backgrounds to add a sense of luxury.

## Typography

The typography system relies on **Inter** for its exceptional legibility in data-heavy interfaces.

The hierarchy is strictly maintained through weight and color rather than just size. **Headlines** utilize semi-bold and bold weights (600-700) to anchor sections. **Numerical data** (prices, room counts) should always be prominent, often using a higher weight than the surrounding descriptive text.

For small labels and secondary metadata (e.g., "vs last month" or "Booking ID"), use a reduced opacity (60-70%) or the `label-sm` style with increased letter spacing to ensure the interface doesn't feel cluttered despite the high density of information.

## Layout & Spacing

This design system follows a **fluid-to-fixed hybrid layout**. On mobile devices, it uses a 4-column grid with 16px side margins. On larger screens, the content is contained within a centered max-width to maintain readability.

The layout is **card-centric**. Information is grouped into logical modules with a consistent `card-gap` of 12px to 16px. This vertical rhythm creates a clear separation between different types of data (e.g., Quick Actions vs. Live Overview). Internal card padding should be generous (16px) to allow the data to breathe against the dark background.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Backdrop Blurs** rather than traditional heavy shadows.

1.  **Level 0 (Canvas):** The deepest background color (#0B0E14).
2.  **Level 1 (Cards):** Semi-transparent surfaces (`rgba(30, 41, 59, 0.7)`) with a `1px` stroke. The stroke uses a subtle gradient or a low-opacity white/blue to simulate a glass edge.
3.  **Level 2 (Active States/Popovers):** Elements that sit above cards use a higher opacity and a subtle "ambient glow"—a low-spread, low-opacity shadow tinted with the primary indigo color to suggest light emission from the element itself.
4.  **Charts & Indicators:** These elements utilize "Inner Glows" and bright strokes to appear as if they are illuminated from behind the glass surface.

## Shapes

The shape language is **distinctly rounded** to soften the technical nature of the data.

- **Standard Cards:** Use `rounded-lg` (16px) to create a friendly, modern container.
- **Buttons & Chips:** Use a mix of `rounded-lg` for standard buttons and full `pill-shaped` radius for status chips (e.g., "Confirmed", "Paid") to distinguish them from interactive buttons.
- **Icon Containers:** Quick action icons sit within "Squircle" or heavily rounded boxes (12px) to maintain the soft-tech aesthetic.

## Components

- **Buttons:** Primary buttons use a solid Indigo gradient with white text. Secondary buttons use a ghost style with a subtle border and the primary color for the label.
- **Status Chips:** Small, high-contrast badges. Use a background opacity of 15% of the status color with a 100% opacity text color (e.g., light green text on dark green tint).
- **Cards:** The core container. Must feature a `1px` semi-transparent border and a subtle background blur (`backdrop-filter: blur(10px)`).
- **Input Fields:** Darker than the card surface with a thin border that glows Indigo when focused.
- **Navigation Bar:** A persistent bottom bar with a blur effect and a "floating" active indicator above the selected icon.
- **Data Visualizations:** Line charts should use smooth bezier curves with a gradient fill below the line, transitioning from the accent color to transparent. Data points should have a "pulsing" glow effect.
