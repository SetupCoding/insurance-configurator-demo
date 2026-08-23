import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Modules that encode a domain rule, and are held to a stricter gate. */
const DOMAIN_THRESHOLDS = { statements: 100, branches: 95, functions: 100, lines: 100 };

export default defineConfig({
  plugins: [react()],
  // Replaces vite-tsconfig-paths, which Vite now supersedes natively.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/app/**/layout.tsx',
        'src/lib/mocks/**',
      ],
      // Measuring without a floor lets coverage decay unnoticed. The global
      // numbers sit just under what the suite currently reaches, so ordinary
      // work has room while a real drop fails the build. The flow validator,
      // the submission validator and the reducer are where a silent regression
      // would actually be dangerous, so they are held to full cover.
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 98,
        lines: 98,
        '**/src/lib/schema/flow.ts': DOMAIN_THRESHOLDS,
        '**/src/lib/domain/validateSubmission.ts': DOMAIN_THRESHOLDS,
        '**/src/features/flow/reducer.ts': DOMAIN_THRESHOLDS,
      },
    },
  },
});
