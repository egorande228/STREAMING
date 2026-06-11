import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Prefix with 'app-' to avoid collisions with Tailwind core utilities
        "app-base":    "var(--bg-base)",
        "app-surface": "var(--bg-surface)",
        "app-card":    "var(--bg-card)",
        "app-card-hover": "var(--bg-card-hover)",
        gold: {
          DEFAULT: "var(--gold)",
          bright:  "var(--gold-bright)",
          faint:   "var(--gold-faint)",
        },
        live: "var(--live)",
      },
      fontFamily: {
        display: ["var(--font-display)", "cursive"],
        score:   ["var(--font-score)", "monospace"],
        body:    ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
