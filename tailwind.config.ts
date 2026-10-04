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
        otdr: {
          bg: "#FFFFFF",
          subtle: "#F5F7FA",
          card: "#FFFFFF",
          border: "#E2E8F0",
          borderDark: "#CBD5E1",
          text: "#1E293B",
          muted: "#64748B",
          accent: "#7DA9C4",
          accentLight: "#E8F1F5",
          accentHover: "#5B8CAE",
          success: "#86C6A5",
          warning: "#E3B168",
          danger: "#D98080",
          grid: "#EDF1F5",
        }
      }
    },
  },
  plugins: [],
};
export default config;
