import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rail: {
          DEFAULT: "#1C1F27",
          well: "#12141A",
          line: "#2A2E38",
          muted: "#8A8F9A",
          value: "#EAEBEE",
        },
        surface: "#F4F5F7",
        panel: "#FFFFFF",
        line: "#E2E3E7",
        ink: "#16181E",
        muted: "#65696F",
        amber: "#F2A60C",
        ready: "#3FB36F",
        err: "#E5484D",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        well: "6px",
      },
      boxShadow: {
        well: "inset 0 1px 2px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
