import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:5000';
  const createApiProxy = () => ({
    target: apiProxyTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin');
        proxyReq.setHeader('x-dev-proxy', 'vite-local');
      });
    }
  });

  return {
    plugins: [react()],
    resolve: {
      alias: {
        viem: path.resolve(__dirname, 'node_modules/viem/index.ts'),
        'viem/chains': path.resolve(__dirname, 'node_modules/viem/chains/index.ts')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': createApiProxy()
      }
    }
  };
});
