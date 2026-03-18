import { NextResponse } from 'next/server';
import { getBaseUrlForBuild } from '@/lib/domain';

const DOMAIN = getBaseUrlForBuild();
const ITEMS_PER_SITEMAP = 50000; // 50k per sitemap

export async function GET() {
  try {
    // Use the same latest movies source as movie sitemaps
    const { VID_SRC_LATEST_MOVIES } = await import('@/data/vidsrcLatestMovies');

    const totalMovies = VID_SRC_LATEST_MOVIES.length;
    const numberOfMovieSitemaps = Math.ceil(totalMovies / ITEMS_PER_SITEMAP);

    const lastmod = new Date().toISOString();

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: numberOfMovieSitemaps }, (_, i) => `  <sitemap>
    <loc>${DOMAIN}/api/sitemap-movies/${i + 1}</loc>
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
    console.error('Error generating movie sitemap index:', error);
    return new NextResponse('Error generating movie sitemap index', { status: 500 });
  }
}

