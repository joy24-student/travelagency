/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        bengali: ["HindSiliguri_400Regular", "NotoSansBengali_400Regular", "sans-serif"],
        "bengali-medium": ["HindSiliguri_500Medium", "sans-serif"],
        "bengali-semibold": ["HindSiliguri_600SemiBold", "sans-serif"],
        "bengali-bold": ["HindSiliguri_700Bold", "sans-serif"],
        noto: ["NotoSansBengali_400Regular", "sans-serif"],
        mono: ["monospace"],
      },
      fontSize: {
        micro: ["12px", { lineHeight: "16px" }],
        "2xs": ["12px", { lineHeight: "16px" }], // Enforce minimum accessible threshold
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["28px", { lineHeight: "36px" }],
        "4xl": ["32px", { lineHeight: "40px" }],
        "5xl": ["40px", { lineHeight: "48px" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        full: "9999px",
      },
      colors: {
        background: {
          DEFAULT: "#f8f9fa",
          dark: "#0f172a",
          oled: "#000000",
        },
        card: {
          DEFAULT: "#ffffff",
          dark: "#1e293b",
          oled: "#0a0a0a",
        },
        surface: {
          DEFAULT: "#f1f5f9",
          dark: "#1e293b",
          oled: "#050505",
        },
        border: {
          DEFAULT: "#e2e8f0",
          dark: "#334155",
          oled: "#27272a",
        },
        primary: {
          50: "#eef6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#287dfa",
          600: "#1e60d0",
          700: "#1548a6",
          800: "#0f3277",
          900: "#0a214f",
          DEFAULT: "#287dfa",
          dark: "#3b82f6",
        },
        secondary: {
          DEFAULT: "#1a237e",
          dark: "#6366f1",
        },
        accent: {
          DEFAULT: "#fed65b",
          dark: "#fed65b",
        },
        status: {
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#3b82f6",
        },
        trip: {
          blue: "#287dfa",
          bg: "#f5f7fa",
          dark: "#333333",
          gray: "#596780",
        },
        luxe: {
          ink: "#000666",
          navy: "#1a237e",
          surface: "#f8f9fa",
          gold: "#fed65b",
        },
      },
    },
  },
  plugins: [],
};
