import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
    // cds-plugin-ui5 would start a livereload server on a fixed port in every parallel test worker.
    env: { CDS_PLUGIN_UI5_ACTIVE: 'false' },
  },
});
