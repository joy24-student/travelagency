---
name: Aetheris Enterprise
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
  outline: "#918fa0"
  outline-variant: "#464554"
  surface-tint: "#c3c0ff"
  primary: "#c3c0ff"
  on-primary: "#1f00a4"
  primary-container: "#4338ca"
  on-primary-container: "#c1beff"
  inverse-primary: "#5148d7"
  secondary: "#4cd7f6"
  on-secondary: "#003640"
  secondary-container: "#03b5d3"
  on-secondary-container: "#00424e"
  tertiary: "#d0bcff"
  on-tertiary: "#3c0091"
  tertiary-container: "#6029c9"
  on-tertiary-container: "#cfbaff"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#e3dfff"
  primary-fixed-dim: "#c3c0ff"
  on-primary-fixed: "#100069"
  on-primary-fixed-variant: "#372abf"
  secondary-fixed: "#acedff"
  secondary-fixed-dim: "#4cd7f6"
  on-secondary-fixed: "#001f26"
  on-secondary-fixed-variant: "#004e5c"
  tertiary-fixed: "#e9ddff"
  tertiary-fixed-dim: "#d0bcff"
  on-tertiary-fixed: "#23005c"
  on-tertiary-fixed-variant: "#5516be"
  background: "#0b1326"
  on-background: "#dae2fd"
  surface-variant: "#2d3449"
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for elite, high-performance enterprise environments, evoking a "Unicorn Startup" aesthetic that balances technical sophistication with premium luxury. The personality is authoritative, AI-driven, and meticulously polished.

The visual direction is a hybrid of **Glassmorphism** and **Subtle Neomorphism** set against a deep-space backdrop. It utilizes translucent surfaces with high-density backdrop blurs, floating geometry, and soft, multi-layered shadows to create a sense of infinite depth. The interface should feel like a high-end command center—precise, data-rich, and impeccably modern.

Key visual pillars:

- **Luminance over Flatness:** Use light as a material, where borders are thin glowing strokes and surfaces are refractive.
- **Deep Hierarchy:** Elements exist on clearly defined planes, separated by atmospheric haze and varying degrees of transparency.
- **Precision Typography:** High-density information layouts that remain legible through strict typographic hierarchy and generous white space within components.

## Colors

This design system utilizes an "Ultra-Dark Navy" foundation to allow vibrant primary and accent colors to pop with neon-like intensity.

- **Foundation:** The main canvas is `#0F172A`. All surfaces stacked above this foundation use varying degrees of glass transparency (`rgba(255, 255, 255, 0.08)`) and high-end blur.
- **Primary & Secondary:** Indigo and Royal Blue are the workhorses for interaction states. Electric Cyan is reserved for AI features and high-priority data visualizations.
- **Gradients:** Use "Deep Sea" for large structural backgrounds or sidebar states, and "Sunset" for premium call-to-actions or "Unicorn" status features.
- **Semantic Logic:** Success, Warning, and Error states should be tinted with the system's luxury palette (e.g., use the vibrant orange for warnings rather than a flat yellow).

## Typography

The typography strategy combines the expressive, modern character of **Plus Jakarta Sans** for headings with the systematic clarity of **Inter** for UI and body text.

- **Tracking:** Headings use tight tracking (`-0.02em` to `-0.04em`) to create a compact, high-end editorial feel. Labels and small captions use increased tracking for legibility against glass backgrounds.
- **Visual Weight:** Use font weight to establish hierarchy rather than just size. Bold headings should feel heavy and grounded, while body text remains light and airy.
- **Contrast:** Maintain high contrast between text and the dark backgrounds. Use `white` for primary text and `rgba(255, 255, 255, 0.6)` for secondary/metadata.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous margins to reinforce the "Premium" feel.

- **Grid Model:** A 12-column system for desktop, transitioning to a 4-column system for mobile.
- **Rhythm:** An 8px base unit drives all spacing (4, 8, 16, 24, 32, 48, 64, 80).
- **Padding:** Use "Large" internal padding for cards and containers (minimum 32px) to ensure the glass effects have room to breathe.
- **Breakpoints:**
  - Mobile: < 768px (20px margins)
  - Tablet: 768px - 1280px (32px margins)
  - Desktop: > 1280px (Fixed 1440px max-width container, centered).

## Elevation & Depth

Depth is the most critical aspect of this design system. It is achieved through three layered techniques:

1.  **Glassmorphism (Surfaces):** Main UI containers use `rgba(255, 255, 255, 0.08)` with a `30px` backdrop-filter blur.
2.  **Subtle Neomorphism (Borders):** Instead of heavy shadows, use dual-stroke borders. A top/left border of `rgba(255, 255, 255, 0.15)` and a bottom/right border of `rgba(0, 0, 0, 0.2)` to create a simulated 3D "extruded" glass effect.
3.  **Multi-Layered Shadows:**
    - _Level 1 (Cards):_ `0 4px 12px rgba(0,0,0,0.1)`
    - _Level 2 (Modals/Active):_ `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)`
    - _Level 3 (Floating AI):_ Add a soft Cyan or Purple outer glow (`drop-shadow`) to represent active AI processing.

## Shapes

The shape language is ultra-rounded and organic, inspired by modern hardware and the "Arc" browser aesthetic.

- **Base Radius:** Primary containers, cards, and buttons use a `24px` (1.5rem) radius or larger.
- **Pill Shapes:** Search bars, tags, and small buttons should be fully pill-shaped (rounded-full).
- **Consistency:** Ensure nested elements have a smaller radius than their parent containers to maintain visual harmony (e.g., if a card is 24px, an inner button should be 12px or 16px).

## Components

- **Buttons:**
  - _Primary:_ Gradient fill (Deep Sea) with a subtle inner white glow on the top edge.
  - _Glass:_ Transparent with a 1px white border (`0.12` opacity) and `30px` blur.
- **Input Fields:** Semi-transparent dark fills with a "focus" state that triggers a Cyan outer glow and increases border opacity.
- **Cards:** The signature component. Must include a `1px` border that catches the light and a heavy backdrop blur. No solid backgrounds.
- **Chips/Badges:** High-contrast backgrounds (Vibrant Orange or Luxury Purple) with white text. Use pill-shape exclusively.
- **AI Sidebar:** A persistent floating glass panel with a vertical gradient stroke.
- **Data Tables:** Remove row borders; use alternating subtle glass tints (`0.04` vs `0.08` opacity) and large horizontal cell padding.
