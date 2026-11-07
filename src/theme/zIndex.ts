/**
 * Centralized Z-Index Hierarchy - Shopno Jatra
 * Eliminates ad-hoc z-index collisions across overlays, headers, modals, and floating action buttons.
 */

export const Z_INDEX = {
  /** Default layer for cards and content */
  base: 0,
  /** Surface and elevated content items */
  surface: 1,
  /** Active selected cards or hovered elements */
  cardActive: 2,
  /** Sticky section headers and tab navigation segments */
  stickyHeader: 10,
  /** Bottom docked trip player or mini soundscape bar */
  dock: 20,
  /** Persistent bottom navigation bars */
  bottomNav: 30,
  /** Floating Action Buttons (FABs) */
  fab: 40,
  /** Dropdowns, autocomplete popovers, select menus */
  dropdown: 50,
  /** Modal backdrop overlays */
  modalBackdrop: 100,
  /** Modal sheets, alert dialogs, full screen modals */
  modal: 101,
  /** Top toast notifications & alert banners */
  toast: 999,
  /** Critical telephony / incoming call overlays */
  criticalOverlay: 1000,
} as const;

export type ZIndexLayer = keyof typeof Z_INDEX;
