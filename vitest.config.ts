import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    // the slow suite's files run one at a time: G3, G12, the round battles and the runs play on worker pools of their
    // own, and G11's timings need the machine to themselves (R2a/T122, R2b/T127). Each slow test sets its own timeout
    // from its measured runtime (docs/balance-backlog.md); these are the ceiling
    fileParallelism: !process.argv.some((a) => a.includes('tests/slow')),
  },
});
