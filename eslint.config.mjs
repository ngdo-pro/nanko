import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // src/domain/** must stay pure: no DB access, no server-only code. It is
    // imported from both Route Handlers and client-side hooks, so anything
    // it imports transitively ends up in the client bundle.
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/*"],
              message: "domain/ must not import db/ — put database access in server/.",
            },
            {
              group: ["@/server", "@/server/*"],
              message:
                "domain/ must not import server/ — server/ depends on domain/, not the reverse.",
            },
            {
              group: ["server-only"],
              message:
                "domain/ must not import server-only — it must stay safely importable from client code.",
            },
          ],
        },
      ],
    },
  },
  prettier, // must stay last: turns off rules that conflict with Prettier formatting
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
