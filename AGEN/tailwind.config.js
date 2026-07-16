/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        agency: {
          primary: "#4F46E5",
          secondary: "#06B6D4",
          accent: "#F97316",
          background: "#0F172A",
          surface: "#1E293B",
        },
      },
    },
  },
  plugins: [],
};
