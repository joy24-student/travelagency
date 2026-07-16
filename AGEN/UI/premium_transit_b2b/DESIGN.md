---
name: Premium Transit B2B
colors:
  surface: "#f9f9f9"
  surface-dim: "#dadada"
  surface-bright: "#f9f9f9"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f3f3f3"
  surface-container: "#eeeeee"
  surface-container-high: "#e8e8e8"
  surface-container-highest: "#e2e2e2"
  on-surface: "#1a1c1c"
  on-surface-variant: "#454652"
  inverse-surface: "#2f3131"
  inverse-on-surface: "#f1f1f1"
  outline: "#767683"
  outline-variant: "#c6c5d4"
  surface-tint: "#4c56af"
  primary: "#000666"
  on-primary: "#ffffff"
  primary-container: "#1a237e"
  on-primary-container: "#8690ee"
  inverse-primary: "#bdc2ff"
  secondary: "#006e2a"
  on-secondary: "#ffffff"
  secondary-container: "#5cfd80"
  on-secondary-container: "#00732c"
  tertiary: "#331000"
  on-tertiary: "#ffffff"
  tertiary-container: "#551f00"
  on-tertiary-container: "#fb6b00"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e0e0ff"
  primary-fixed-dim: "#bdc2ff"
  on-primary-fixed: "#000767"
  on-primary-fixed-variant: "#343d96"
  secondary-fixed: "#69ff87"
  secondary-fixed-dim: "#3ce36a"
  on-secondary-fixed: "#002108"
  on-secondary-fixed-variant: "#00531e"
  tertiary-fixed: "#ffdbcb"
  tertiary-fixed-dim: "#ffb692"
  on-tertiary-fixed: "#341100"
  on-tertiary-fixed-variant: "#7a3000"
  background: "#f9f9f9"
  on-background: "#1a1c1c"
  surface-variant: "#e2e2e2"
  champagne-highlight: "#FFF8E1"
  surface-glass: rgba(255, 255, 255, 0.7)
  primary-gradient: "linear-gradient(135deg, #1A237E 0%, #3949AB 100%)"
  accent-vibrant: "linear-gradient(135deg, #FF6D00 0%, #FF9100 100%)"
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: "700"
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "700"
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: "700"
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 20px
  gutter-md: 16px
  card-padding: 24px
  section-gap: 32px
---

## Brand & Style

The design system is engineered for a high-performance B2B travel environment, blending the consumer-facing warmth of Airbnb with the functional density of enterprise SaaS. The brand personality is professional yet aspirational, positioning itself as a reliable partner for travel logistics while maintaining a premium "concierge" aesthetic.

The visual style is **Modern Corporate with Glassmorphic accents**. It utilizes a sophisticated layering system where core functional elements remain grounded in clarity, while expressive surfaces (hero sections, featured cards) utilize translucent materials and vibrant gradients to evoke the excitement of travel.

## Colors

The palette is anchored by **Deep Indigo**, providing a sense of institutional trust and stability necessary for B2B transactions. **Vibrant Emerald** is reserved for success states, confirmations, and primary "Book Now" actions to drive conversion.

**Sunset Orange** serves as a high-energy accent for urgent alerts, limited-time offers, or "New" badges. **Soft Champagne** is used as a sophisticated background alternative to pure white, creating a warmer, more premium editorial feel for curated content. Glassmorphic surfaces should use the `surface-glass` token with a `20px` backdrop-blur to maintain legibility over complex backgrounds.

## Typography

This design system utilizes **Plus Jakarta Sans** exclusively to ensure a modern, geometric, and highly legible experience across all touchpoints.

The hierarchy is intentionally "top-heavy," with bold headlines to guide users through dense travel data. Use `label-bold` for category tags and small UI identifiers to ensure they are distinct from body copy. Line heights are generous to prevent visual fatigue during long booking sessions. For mobile devices, `headline-xl` should scale down to `headline-xl-mobile` to ensure clear presentation on smaller viewports.

## Layout & Spacing

The system follows an **8px grid** to ensure consistency across all components. For the mobile application, a **fluid grid** model is used with standard `20px` horizontal margins to provide breathing room for large cards.

Complex forms, such as the booking engine, should utilize a `16px` gutter between input fields. In high-density areas, such as KPI dashboards, padding can be reduced to `12px` to maximize information density while maintaining the established roundedness. Reflow rules dictate that all multi-column layouts on desktop must collapse to a single column on mobile, with the exception of swipeable horizontal galleries for property listings or package deals.

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Tonal Layering** and **Ambient Shadows**.

1.  **Base Layer:** The white or Soft Champagne background.
2.  **Raised Layer:** Standard cards use a subtle `0px 4px 20px rgba(0, 0, 0, 0.05)` shadow with a light grey border (`#E0E0E0`).
3.  **Glass Layer:** Overlays and floating navigation bars use `surface-glass` with a white 1px inner border to simulate the edge of the glass.
4.  **Feature Layer:** High-priority items (e.g., active booking) use multi-layered shadows—a sharp inner shadow for definition and a soft, broad outer shadow tinted with the primary color to create a "glow" effect.

## Shapes

The shape language is friendly and modern. Large containers and primary cards use `rounded-xl` (24px) to create a distinct, high-end mobile app feel. Smaller interactive elements like buttons, input fields, and chips use a `rounded-md` (12px) standard. Icons should always feature rounded terminals and corners to align with the `Plus Jakarta Sans` letterforms.

## Components

### High-Density KPI Cards

Used for B2B dashboards. These feature a 2-column layout with a small line chart or Sparkline showing travel trends. Use `headline-md` for the metric and `label-md` for the descriptor.

### Swipeable Booking Items

For managing current itineraries. These cards utilize a horizontal swipe gesture to reveal quick actions (Cancel, Edit, Share). The card face should be clean, featuring the destination name in `headline-md` and the `secondary-vibrant` color for the booking status.

### Step-Based Package Wizard

A multi-page form for building travel packages. It features a sticky progress bar at the top using the `primary-gradient`. Each step is housed in a `rounded-xl` card with `surface-glass` effects for the "Next" and "Back" navigation footer.

### Buttons & Inputs

- **Primary Button:** Uses `primary-gradient` with white text and `rounded-md` corners.
- **Action Button:** Uses `accent-vibrant` for critical conversion points.
- **Inputs:** Clean white fills with 1px soft grey borders, transitioning to a 2px `primary-indigo` border on focus.

### Icons & Illustrations

Use custom SVG icons with a 2px stroke weight. For hero sections, use "Premium Travel" themed illustrations with soft gradients and isometric perspectives to convey depth and professionalism.
