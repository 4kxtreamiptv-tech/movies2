import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    // Path to batch result files
    const scriptsDir = path.join(process.cwd(), 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      return NextResponse.json({
        movies: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          pages: 0
        },
        message: 'Movie data not available yet'
      });
    }

    // Get all batch result files
    const batchFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.startsWith('batch-') && file.endsWith('-results.json'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        const bNum = parseInt(b.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        return aNum - bNum; // Sort in ascending order
      });

    // Collect movies for the specified year
    const moviesForYear: any[] = [];
    const targetYear = parseInt(year);

    for (const batchFile of batchFiles) {
      try {
        const batchPath = path.join(scriptsDir, batchFile);
        const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
        
        batchData.forEach((movie: any) => {
          if (movie.year === targetYear) {
            moviesForYear.push({
              ...movie,
              // Ensure we have all required fields
              id: movie.imdbId || movie.id,
              imdb_id: movie.imdbId,
              title: movie.title,
              year: movie.year,
              poster_path: movie.poster,
              backdrop_path: movie.backdrop,
              overview: movie.overview,
              vote_average: movie.rating,
              release_date: movie.release_date,
              runtime: movie.runtime,
              original_language: movie.language,
              genres: movie.genres || []
            });
          }
        });
      } catch (error) {
        console.error(`Error reading batch file ${batchFile}:`, error);
      }
    }

    // Sort by latest first within the year:
    // - release_date desc (fallback to year)
    // - then rating desc
    // - then title asc
    moviesForYear.sort((a, b) => {
      const ad = a.release_date ? Date.parse(a.release_date) : Date.parse(`${a.year}-01-01`);
      const bd = b.release_date ? Date.parse(b.release_date) : Date.parse(`${b.year}-01-01`);
      if (bd !== ad) return bd - ad;
      const ar = a.vote_average || 0;
      const br = b.vote_average || 0;
      if (br !== ar) return br - ar;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    // Pagination
    const total = moviesForYear.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMovies = moviesForYear.slice(startIndex, endIndex);

    return NextResponse.json({
      movies: paginatedMovies,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      year: targetYear,
      totalMoviesForYear: total
    });

  } catch (error) {
    console.error('Error fetching movies by year:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}