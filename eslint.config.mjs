import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Browser-only SDKs that read `window` at module-eval time crash during
      // server evaluation. Ban static *value* imports; type-only imports are
      // erased so they stay allowed, and values must be loaded lazily via
      // `await import(...)` (or the local `ivs-runtime-enums` shim for IVS enum
      // values).
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "amazon-ivs-player",
              message:
                "Browser-only SDK: reads `window` at module-eval and crashes during server evaluation. Use `await import('amazon-ivs-player')` for the player, the local `ivs-runtime-enums` for enum values, and `import type` for types.",
              allowTypeImports: true,
            },
            {
              name: "pusher-js",
              message:
                "Browser-only library: reads `window` at module-eval and crashes during server evaluation. Use `await import('pusher-js')` inside an effect, and `import type` for types.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
