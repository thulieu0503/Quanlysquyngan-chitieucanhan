import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C9972B",
          dark: "#A87A1C",
          tint: "#F6E9C9",
        },
        green: {
          DEFAULT: "#1F6E4A",
          dark: "#164F36",
          tint: "#E3F0E7",
        },
        ink: {
          DEFAULT: "#211C14",
          soft: "#7A7264",
          muted: "#4B4438",
        },
        cream: "#FBF8F1",
        border: "#E7E0D2",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
