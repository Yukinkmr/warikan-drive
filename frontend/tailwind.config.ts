import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        accent: "var(--accent)",
        accentDim: "var(--accent-dim)",
        green: "var(--green)",
        greenDim: "var(--green-dim)",
        red: "var(--red)",
        text: "var(--text)",
        muted: "var(--muted)",
        label: "var(--label)",
        inputBg: "var(--input-bg)",
        statBg: "var(--stat-bg)",
      },
      maxWidth: {
        app: "440px",
        "app-md": "672px",
        "app-lg": "768px",
        "app-xl": "896px",
      },
      screens: {
        xs: "480px",
      },
      borderRadius: {
        card: "var(--radius)",
        "card-lg": "var(--radius-lg)",
      },
      boxShadow: {
        glow: "var(--glow)",
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
