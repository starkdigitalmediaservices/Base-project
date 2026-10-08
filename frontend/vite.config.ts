import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load every VITE_* variable from .env files so the dev proxy target is configurable.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    process.env.VITE_API_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000';

  // Same-origin API calls locally: the browser talks to Vite, Vite forwards /api to FastAPI.
  const apiProxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      // `npm run preview` serves the production build with the same API proxy.
      proxy: apiProxy,
    },
    build: {
      sourcemap: true,
      target: 'es2022',
    },
  };
});
