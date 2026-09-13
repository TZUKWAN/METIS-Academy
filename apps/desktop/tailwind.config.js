/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0b0d12", 900: "#0f1115", 800: "#151923", 700: "#1d2330", 600: "#2a3242" },
        paper: { 50: "#f5f6f8", 200: "#d9dde5", 400: "#9aa3b2" },
        accent: { DEFAULT: "#5b8def", deep: "#3e6bd6", mint: "#4fc3a1", amber: "#e0a458", rose: "#d16a7a" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Microsoft YaHei", "sans-serif"],
        serif: ["Georgia", "Songti SC", "SimSun", "serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
