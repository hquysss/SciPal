import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps `jsx: preserve` for Next.js; tests need JSX compiled.
  oxc: { jsx: { runtime: 'automatic' } },
  // Mirrors the `@/*` path in tsconfig.json.
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
  },
});
