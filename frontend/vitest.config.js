import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});
