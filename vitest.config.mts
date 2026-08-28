import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Modules encoding a domain rule or a security boundary, held to a stricter gate. */
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
        // Font imports, metadata and the html/body shell. No branch to cover,
        // and the e2e suite is what proves it renders.
        'src/app/**/layout.tsx',
        'src/lib/mocks/**',
        // next-intl's per-request config. It only runs inside a Server Component
        // render, and the decision it makes (which catalogue a locale gets) is
        // what the e2e suite asserts by loading /en and reading English back.
        'src/i18n/**',
      ],
      // Measuring without a floor lets coverage decay unnoticed. The global
      // numbers sit just under what the suite currently reaches, so ordinary
      // work has room while a real drop fails the build. The flow validator,
      // the submission validator, the reducer, the locale resolver and the CSP
      // builder are where a silent regression would actually be dangerous, so
      // they are held to full cover.
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 98,
        lines: 98,
        '**/src/lib/schema/flow.ts': DOMAIN_THRESHOLDS,
        '**/src/lib/domain/validateSubmission.ts': DOMAIN_THRESHOLDS,
        '**/src/features/flow/reducer.ts': DOMAIN_THRESHOLDS,
        '**/src/lib/domain/localizeFlow.ts': DOMAIN_THRESHOLDS,
        '**/src/lib/security/csp.ts': DOMAIN_THRESHOLDS,
      },
    },
  },
});
