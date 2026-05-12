import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 5000,
    include: ['__tests__/**/*.test.ts'],
    singleFork: !!process.env.CI,
    coverage: {
      include: ['src/**/*.ts'],
      reportsDirectory: 'coverage',
    },
  },
})
