import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrlForBuild } from '@/lib/domain';
import { TV_SERIES_IDS } from '@/data/tvSeriesIds';

const DOMAIN = getBaseUrlForBuild();
const SERIES_PER_SITEMAP = 50000; // 50k per sitemap batch

const TMDB_API_KEY = 'b31d2e5f33b74ffa7b3b483ff353f760';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper function to create series slug (same pattern as series pages)
function createSeriesSlug(name: string, tmdbId: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}-${tmdbId}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sitemapNumber = parseInt(id, 10);
    
    if (isNaN(sitemapNumber) || sitemapNumber < 1) {
      return new NextResponse('Invalid sitemap number', { status: 400 });
    }

    const totalSeries = TV_SERIES_IDS.length;
    const startIndex = (sitemapNumber - 1) * SERIES_PER_SITEMAP;
    const endIndex = Math.min(startIndex + SERIES_PER_SITEMAP, totalSeries);

    if (startIndex >= totalSeries) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }

    const seriesIdsChunk = TV_SERIES_IDS.slice(startIndex, endIndex);
    console.log(`Generating series sitemap ${sitemapNumber}: Series ${startIndex}-${endIndex} (${seriesIdsChunk.length} series)`);

    const lastmod = new Date().toISOString();

    // Resolve TMDB ID + name for each IMDB series via TMDB Find API
    const urlEntriesArray = await Promise.all(
      seriesIdsChunk.map(async (imdbId) => {
        try {
          const findRes = await fetch(
            `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
          );
          if (!findRes.ok) return null;
          const findData = await findRes.json();
          const tvResult = (findData.tv_results && findData.tv_results[0]) || null;
          if (!tvResult) return null;

          const name = tvResult.name || `TV Series ${imdbId}`;
          const tmdbId = tvResult.id;
          const slug = createSeriesSlug(name, tmdbId);
          return `  <url>
    <loc>${DOMAIN}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        } catch (err) {
          console.error(`Error processing series ${imdbId}:`, err);
          return null;
        }
      })
    );

    const urlEntries = urlEntriesArray.filter(Boolean).join('\n');
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
    
  } catch (error) {
    console.error('Error generating series sitemap:', error);
    return new NextResponse('Error generating series sitemap', { status: 500 });
  }
}

