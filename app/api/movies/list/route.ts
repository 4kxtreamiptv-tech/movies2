import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns a slice of movie IDs from the saved VidSrc list (server-only).
 * Client never loads the full 88k list — only this API reads it.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
    const order = (searchParams.get('order') || 'desc').toLowerCase(); // desc = latest-first

    const { VID_SRC_LATEST_MOVIES } = await import('@/data/vidsrcLatestMovies');
    const list =
      order === 'asc' ? VID_SRC_LATEST_MOVIES : [...VID_SRC_LATEST_MOVIES].reverse();
    const slice = list.slice(offset, offset + limit);
    const imdb_ids = slice
      .map((m) => m.imdb_id)
      .filter((id): id is string => !!id && id.trim() !== '');

    return NextResponse.json({
      imdb_ids,
      total: VID_SRC_LATEST_MOVIES.length,
      offset,
      limit: imdb_ids.length,
      order,
    });
  } catch (error) {
    console.error('Error in /api/movies/list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie list', imdb_ids: [] },
      { status: 500 }
    );
  }
}
