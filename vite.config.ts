/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import { GET } from './api/notion/travel-tracker';
import { PATCH } from './api/notion/trip';

const TRIPS_PATH = '/api/notion/travel-tracker';
const TRIP_PATH = '/api/notion/trip';

/**
 * Serves the Vercel function locally so "/api/notion/travel-tracker" is the same
 * URL in every environment (see src/services/notionAdapter.ts).
 *
 * It hooks preview as well as dev on purpose: `vite preview` is what
 * scripts/mobile-audit/run.mjs boots, and without the API there the audited app
 * has no trips to lay out — every overflow and contrast check would pass
 * vacuously against an empty page.
 *
 * The handler is imported statically rather than through ssrLoadModule so both
 * servers share one code path; the tradeoff is that editing the handler needs a
 * restart, same as any other config change.
 */
function notionProxyPlugin(env: Record<string, string>) {
  // loadEnv reads .env for us; mirror the vars the handlers expect onto process.env.
  for (const key of ['NOTION_TOKEN', 'TT_WRITE_SECRET']) {
    if (env[key]) process.env[key] = env[key];
  }

  /** Buffers a Node request body into the Request the handlers are written against. */
  const toWebRequest = async (req: Parameters<Connect.NextHandleFunction>[0]): Promise<Request> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
  };

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '/';
    const isTrips = pathname === TRIPS_PATH;
    const isTrip = pathname === TRIP_PATH && req.method === 'PATCH';
    if (!isTrips && !isTrip) return next();

    try {
      const response = isTrip ? await PATCH(await toWebRequest(req)) : await GET();
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
  };

  return {
    name: 'notion-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Vercel serves from the domain root. The old './' existed only so the
    // GitHub Pages project-subpath build could find its assets.
    base: '/',
    plugins: [react(), notionProxyPlugin(env)],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/**/*.test.ts'],
    },
  };
});
