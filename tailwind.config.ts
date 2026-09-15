import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        surface: "#12151c",
        surface2: "#181c25",
        border: "#232833",
        muted: "#7a8394",
        accent: "#4f7cff",
        buy: "#2fbf71",
        watch: "#e0a72e",
        pass: "#e5484d",
      },
    },
  },
  plugins: [],
};
export default config;
