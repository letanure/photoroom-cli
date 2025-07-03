import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    // Performance optimizations for small CLI app
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Use single process to avoid memory overhead
      }
    },
    // Disable UI and coverage by default for speed
    coverage: {
      enabled: false // Disable by default, use npm run test:coverage when needed
    },
    // Faster test discovery
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    // Reduce memory usage
    logHeapUsage: false,
    isolate: false // Share context between tests for speed
  }
});