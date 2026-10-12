import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
