import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#173532",
        river: { 50: "#eef9f7", 100: "#d8f1ec", 500: "#168a79", 600: "#0f7063", 700: "#0d594f", 900: "#173532" },
        sun: "#f4b942",
        earth: "#8b5e3c"
      },
      boxShadow: { card: "0 8px 30px rgba(23,53,50,.09)" }
    }
  },
  plugins: []
} satisfies Config;

