import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'latest';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Path to batch result files
    const scriptsDir = path.join(process.cwd(), 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      return NextResponse.json({
        movies: [],
        message: 'Movie data not available yet'
      });
    }

    // Get all batch result files
    const batchFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.startsWith('batch-') && file.endsWith('-results.json'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        const bNum = parseInt(b.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        return aNum - bNum; // Sort in ascending order to process chronologically
      });

    // Collect all movies with year data
    const allMovies: any[] = [];

    for (const batchFile of batchFiles) {
      try {
        const batchPath = path.join(scriptsDir, batchFile);
        const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
        
        batchData.forEach((movie: any) => {
          if (movie.year && movie.poster) {
            allMovies.push({
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

    // Sort movies latest-first:
    // - year desc
    // - release_date desc (fallback to year)
    // - rating desc
    allMovies.sort((a, b) => {
      const ay = a.year || 0;
      const by = b.year || 0;
      if (by !== ay) return by - ay;

      const ad = a.release_date ? Date.parse(a.release_date) : Date.parse(`${ay}-01-01`);
      const bd = b.release_date ? Date.parse(b.release_date) : Date.parse(`${by}-01-01`);
      if (bd !== ad) return bd - ad;

      return (b.vote_average || 0) - (a.vote_average || 0);
    });

    // Get latest movies based on category
    let selectedMovies: any[] = [];

    switch (category) {
      case 'suggestions':
        // Latest movies with good ratings (most recent first)
        selectedMovies = allMovies
          .filter(movie => movie.vote_average && movie.vote_average > 6)
          .slice(0, limit);
        break;
        
      case 'latest':
        // Most recent movies by year
        const latestYear = Math.max(...allMovies.map(m => m.year));
        selectedMovies = allMovies
          .filter(movie => movie.year === latestYear)
          .slice(0, limit);
        break;
        
      case 'trending':
        // Movies from latest 3 years, sorted by rating
        const maxYear = Math.max(...allMovies.map(m => m.year));
        selectedMovies = allMovies
          .filter(movie => movie.year >= maxYear - 2)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
          .slice(0, limit);
        break;
        
      case 'top_rated':
        // Highest rated movies overall
        selectedMovies = allMovies
          .filter(movie => movie.vote_average && movie.vote_average > 0)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
          .slice(0, limit);
        break;
        
              case 'action':
                // Latest movies with good ratings (action-like)
                const actionMaxYear = Math.max(...allMovies.map(m => m.year));
                selectedMovies = allMovies
                  .filter(movie => movie.year >= actionMaxYear - 1 && movie.vote_average && movie.vote_average > 5)
                  .slice(0, limit);
                break;
                
              case 'tv_shows':
                // TV Shows: Filter for TV series content
                const tvMaxYear = Math.max(...allMovies.map(m => m.year));
                selectedMovies = allMovies
                  .filter(movie => {
                    const isRecent = movie.year >= tvMaxYear - 3;
                    const hasGoodRating = movie.vote_average && movie.vote_average > 5.0;
                    const titleIndicatesTV = movie.title && (
                      movie.title.toLowerCase().includes('series') ||
                      movie.title.toLowerCase().includes('season') ||
                      movie.title.toLowerCase().includes('episode') ||
                      movie.title.toLowerCase().includes('tv') ||
                      movie.title.toLowerCase().includes('show') ||
                      movie.title.toLowerCase().includes('drama') ||
                      movie.title.toLowerCase().includes('comedy') ||
                      movie.title.toLowerCase().includes('sitcom')
                    );
                    return isRecent && hasGoodRating && titleIndicatesTV;
                  })
                  .slice(0, limit);
                break;
                
              default:
        // Default to latest movies
        const defaultYear = Math.max(...allMovies.map(m => m.year));
        selectedMovies = allMovies
          .filter(movie => movie.year === defaultYear)
          .slice(0, limit);
    }

    // If we don't have enough movies for the specific category, fill with latest movies
    if (selectedMovies.length < limit) {
      const additionalMovies = allMovies
        .filter(movie => !selectedMovies.some(selected => selected.imdb_id === movie.imdb_id))
        .slice(0, limit - selectedMovies.length);
      selectedMovies = [...selectedMovies, ...additionalMovies];
    }

    return NextResponse.json({
      movies: selectedMovies.slice(0, limit),
      category: category,
      totalAvailable: allMovies.length,
      latestYear: allMovies.length > 0 ? Math.max(...allMovies.map(m => m.year)) : null
    });

  } catch (error) {
    console.error('Error fetching latest movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest movies' },
      { status: 500 }
    );
  }
}
