import { defineConfig } from 'vite';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        configure(proxy) {
          proxy.on('error', (_error, _request, response) => {
            if (!response.headersSent) {
              response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
            }
            response.end(JSON.stringify({ error: 'Сервер API недоступен. Запустите npm.cmd run server в отдельном терминале.' }));
          });
        },
      },
    },
  },
});
