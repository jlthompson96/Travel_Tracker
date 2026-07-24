/**
 * scripts/fetch-notion-data.mjs
 *
 * Build-time snapshot fetch. GitHub Pages can't run api/notion/travel-tracker.ts
 * (it's a serverless-function-shaped handler) or hold NOTION_TOKEN as a browser
 * secret, so instead of hitting Notion live at runtime, this runs once during
 * `npm run build`, queries the same data source, and writes the raw response
 * to public/data/travel-tracker.json. The frontend then fetches that static
 * file in production (see src/services/notionAdapter.ts) exactly like it would
 * fetch the live proxy in dev — same JSON shape, so nothing else changes.
 *
 * Without NOTION_TOKEN set, it writes the same empty fallback the dev proxy
 * returns, so `npm run build` still succeeds locally without credentials.
 */
import { Client } from '@notionhq/client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// CI sets NOTION_TOKEN directly; locally, pick it up from .env like the Vite
// dev server does, so `npm run build` embeds real data without extra steps.
try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  // no .env file — fine, e.g. in CI
}

const TRAVEL_TRACKER_DATA_SOURCE_ID = '1b1d8fd9-c723-4201-b1fc-5968d59e658a';
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'data', 'travel-tracker.json');

async function main() {
  let data;

  if (!process.env.NOTION_TOKEN) {
    console.warn('[fetch-notion-data] No NOTION_TOKEN set; writing empty fallback data.');
    data = {
      results: [],
      fallback: true,
      message: 'No NOTION_TOKEN configured; returning empty fallback data.',
    };
  } else {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    try {
      data = await notion.dataSources.query({
        data_source_id: TRAVEL_TRACKER_DATA_SOURCE_ID,
        page_size: 100,
      });
      console.log(`[fetch-notion-data] Fetched ${data.results.length} trip(s) from Notion.`);
    } catch (error) {
      console.error('[fetch-notion-data] Failed to query Notion:', error);
      data = {
        results: [],
        fallback: true,
        message: error instanceof Error ? error.message : 'Failed to query Notion',
      };
    }
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(data), 'utf-8');
  console.log(`[fetch-notion-data] Wrote ${OUTPUT_PATH}`);
}

main();
