import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: {awaitWriteFinish:{stabilityThreshold:200,pollInterval:50}} },
  // Keep bundled fonts as local files, as required by the application's CSP.
  build: { target: 'es2023', assetsInlineLimit: 0 },
});
