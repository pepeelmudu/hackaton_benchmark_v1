import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e0a",
        panel: "#0d140d",
        phosphor: "#39ff14",
        phosphordim: "#1f8f12",
        amber: "#ffb000",
        danger: "#ff3355",
        muted: "#5c7a5c",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
