import type { Config } from "tailwindcss";

/**
 * Tailwind 4 keeps most config in CSS via @theme.
 * This file exists for tooling (IDE, ESLint plugin) and content scanning hints.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
