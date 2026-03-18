import { NextResponse } from 'next/server';
import { getBaseUrlForBuild } from '@/lib/domain';
import { TV_SERIES_IDS } from '@/data/tvSeriesIds';

const DOMAIN = getBaseUrlForBuild();
const ITEMS_PER_SITEMAP = 50000; // 50k per sitemap

export async function GET() {
  try {
    const totalSeries = TV_SERIES_IDS.length;
    const numberOfSeriesSitemaps = Math.ceil(totalSeries / ITEMS_PER_SITEMAP);

    const lastmod = new Date().toISOString();

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: numberOfSeriesSitemaps }, (_, i) => `  <sitemap>
    <loc>${DOMAIN}/api/sitemap-series/${i + 1}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    return new Response(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Error generating series sitemap index:', error);
    return new NextResponse('Error generating series sitemap index', { status: 500 });
  }
}

