import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    root: './src',
    coverage: {
      include: ['**/*.ts'],
      exclude: ['**/*.d.ts', 'index.ts'],
    },
  },
});
