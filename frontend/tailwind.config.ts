import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};

export default config;
