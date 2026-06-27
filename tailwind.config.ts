import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The "machine" — dark control rail
        rail: {
          DEFAULT: "#1C1F27",
          well: "#12141A", // recessed input wells
          line: "#2A2E38", // hairlines on dark
          muted: "#8A8F9A", // labels on dark
          value: "#EAEBEE", // readout values on dark
        },
        // The "conversation" — light working surface
        surface: "#F4F5F7",
        panel: "#FFFFFF",
        line: "#E2E3E7", // hairlines on light
        ink: "#16181E", // primary text
        muted: "#65696F", // secondary text on light
        // Signal colors — used sparingly
        amber: "#F2A60C", // ignition / live
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
