import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", ".legacy/**", "drizzle/**"],
  },
  {
    rules: {
      // Console prohibited — use lib/logger.
      "no-console": ["error", { allow: ["error"] }],
      // Forbid `any` unless explicitly justified.
      "@typescript-eslint/no-explicit-any": "error",
      // Unused vars must be prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Smoke / scripts may use console for direct CLI output.
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
