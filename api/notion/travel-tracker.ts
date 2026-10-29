/**
 * api/notion/travel-tracker.ts
 *
 * Serverless handler holding the Notion token server-side and proxying the live
 * data source query. Vercel deploys this as a function; vite.config.ts's
 * notionProxyPlugin serves the same module in dev, so the frontend's single
 * PROXY_URL ("/api/notion/travel-tracker") works in both.
 *
 * Requires a NOTION_TOKEN environment variable with access to the Travel
 * Tracker page. Without one it returns an empty fallback rather than failing,
 * so the app still boots uncredentialed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
// Extension is explicit because Vercel compiles this function with node16-style
// module resolution, which rejects extensionless relative imports. `.js` is the
// spelling TS wants there and resolves to the .ts source in every other mode.
import { localPhotoName } from '../../src/utils/photoNaming.js';

const TRAVEL_TRACKER_DATA_SOURCE_ID = '1b1d8fd9-c723-4201-b1fc-5968d59e658a';

/**
 * Repoints Notion's expiring signed photo URLs at the build-time mirror in
 * public/photos/ (see scripts/fetch-notion-data.mjs). Live URLs would work
 * fine while online — they're minutes old by the time they reach the browser —
 * but they're different on every query and dead after an hour, so nothing can
 * cache them and offline support is impossible without this.
 *
 * A photo the mirror failed to download 404s here instead of rendering; that
 * degrades to PhotoImage's labelled placeholder, and the mirror logs a warning
 * at build time.
 */
interface PhotoBearingPage {
  properties?: {
    Photos?: {
      files?: { type: string; file?: { url: string; expiry_time?: string } }[];
    };
  };
}

function rewritePhotoUrlsToMirror(data: { results?: unknown[] }): void {
  const photoDir = path.join(process.cwd(), 'public', 'photos');
  const distPhotoDir = path.join(process.cwd(), 'dist', 'photos');

  for (const page of data.results ?? []) {
    const files = (page as PhotoBearingPage).properties?.Photos?.files ?? [];
    for (const file of files) {
      if (file.type !== 'file' || !file.file?.url) continue;
      const localName = localPhotoName(file.file.url);
      if (!localName) continue;

      let existsLocally = false;
      try {
        existsLocally =
          fs.existsSync(path.join(photoDir, localName)) ||
          fs.existsSync(path.join(distPhotoDir, localName));
      } catch {
        // Leave as false on filesystem check failure
      }

      // Only rewrite to local path if the mirrored file actually exists on disk.
      // If it hasn't been mirrored, KEEP the original signed Notion URL so the photo still loads!
      if (existsLocally) {
        file.file.url = `/photos/${localName}`;
        delete file.file.expiry_time;
      }
    }
  }
}

export async function GET() {
  if (!process.env.NOTION_TOKEN) {
    return Response.json({
      results: [],
      fallback: true,
      message: 'No NOTION_TOKEN configured; returning empty fallback data.',
    });
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  try {
    const response = await notion.dataSources.query({
      data_source_id: TRAVEL_TRACKER_DATA_SOURCE_ID,
      page_size: 100,
    });

    rewritePhotoUrlsToMirror(response);

    return Response.json(response, {
      // Trips change rarely and the mirror only refreshes on deploy, so let the
      // CDN absorb repeat loads while still revalidating quickly.
      headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Notion proxy error', error);
    return Response.json(
      {
        results: [],
        fallback: true,
        message: error instanceof Error ? error.message : 'Failed to query Notion',
      },
      { status: 502 },
    );
  }
}
