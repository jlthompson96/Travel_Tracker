import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function notionProxyPlugin(env: Record<string, string>) {
  return {
    name: 'notion-proxy',
    configureServer(server) {
      if (env.NOTION_TOKEN) {
        process.env.NOTION_TOKEN = env.NOTION_TOKEN;
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '/';
        if (pathname !== '/api/notion/travel-tracker') {
          return next();
        }

        try {
          const mod = await server.ssrLoadModule('/api/notion/travel-tracker.ts');
          const response = await mod.GET();
          const body = await response.text();
          res.statusCode = response.status;
          res.setHeader('content-type', response.headers.get('content-type') ?? 'application/json');
          res.setHeader('cache-control', 'no-store');
          res.end(body);
        } catch (error) {
          console.error('Failed to proxy Notion request', error);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              results: [],
              fallback: true,
              message: error instanceof Error ? error.message : 'Proxy error',
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react(), notionProxyPlugin(env)],
  };
});
