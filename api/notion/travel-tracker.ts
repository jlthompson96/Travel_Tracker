/**
 * api/notion/travel-tracker.ts
 *
 * Example serverless handler (Vercel/Next.js route-handler style) that the
 * frontend's PROXY_URL points to. Holds the Notion token server-side and
 * proxies the live data source query — swap for an Express route if you're
 * not on a serverless host. Requires the `@notionhq/client` package and a
 * NOTION_TOKEN environment variable with access to the Travel Tracker page.
 */
import { Client } from '@notionhq/client';

const TRAVEL_TRACKER_DATA_SOURCE_ID = '1b1d8fd9-c723-4201-b1fc-5968d59e658a';

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

    return Response.json(response);
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
