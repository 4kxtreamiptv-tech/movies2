import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Path to batch result files
    const scriptsDir = path.join(process.cwd(), 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      return NextResponse.json({
        sections: {},
        message: 'Movie data not available yet'
      });
    }

    // Get all batch result files
    const batchFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.startsWith('batch-') && file.endsWith('-results.json'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        const bNum = parseInt(b.match(/batch-(\d+)-results\.json/)?.[1] || '0');
        return aNum - bNum;
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

    const latestYear = Math.max(...allMovies.map(m => m.year));
    const usedMovieIds = new Set<string>();

    // Helper function to get unique movies
    const getUniqueMovies = (filterFn: (movie: any) => boolean, count: number) => {
      const filtered = allMovies.filter(movie => 
        filterFn(movie) && !usedMovieIds.has(movie.imdb_id)
      );
      const selected = filtered.slice(0, count);
      selected.forEach(movie => usedMovieIds.add(movie.imdb_id));
      return selected;
    };

    // Define sections with unique movies (70 per section for 7 lines)
    const sections = {
      suggestions: getUniqueMovies(
        movie => movie.year >= latestYear - 1, // Latest movies for suggestions
        70
      ),
      
      trending: getUniqueMovies(
        movie => {
          // Trending: Latest popular movies from recent years
          const isRecent = movie.year >= latestYear - 2; // Last 2 years only
          const hasGoodRating = movie.vote_average && movie.vote_average > 5.5;
          return isRecent && hasGoodRating;
        },
        70
      ),
      
      top_rated: getUniqueMovies(
        movie => {
          // Top Rated: Latest movies with high ratings (prioritize recent years)
          const isRecent = movie.year >= latestYear - 3; // Last 3 years
          const hasHighRating = movie.vote_average && movie.vote_average > 6.5;
          return isRecent && hasHighRating;
        },
        70
      ),
      
      top_imdb: getUniqueMovies(
        movie => {
          // Top IMDB: Latest highly rated movies (prioritize recent years)
          const isRecent = movie.year >= latestYear - 5; // Last 5 years
          const hasVeryHighRating = movie.vote_average && movie.vote_average > 7.5;
          return isRecent && hasVeryHighRating;
        },
        70
      ),
      
      action: getUniqueMovies(
        movie => {
          // Action Movies: Latest action movies with good ratings
          const isRecent = movie.year >= latestYear - 2; // Last 2 years
          const hasActionRating = movie.vote_average && movie.vote_average > 5.0;
          const titleIndicatesAction = movie.title && (
            movie.title.toLowerCase().includes('action') ||
            movie.title.toLowerCase().includes('fight') ||
            movie.title.toLowerCase().includes('war') ||
            movie.title.toLowerCase().includes('battle') ||
            movie.title.toLowerCase().includes('adventure') ||
            movie.title.toLowerCase().includes('gun') ||
            movie.title.toLowerCase().includes('kill')
          );
          return isRecent && hasActionRating && titleIndicatesAction;
        },
        70
      ),
      
      tv_shows: [] // Coming Soon - No TV shows available yet
    };

    // If any section is empty, fill with latest movies
    Object.keys(sections).forEach(key => {
      const sectionKey = key as keyof typeof sections;
      const sectionMovies = sections[sectionKey];
      if (sectionMovies.length < 70) {
        const additionalMovies = allMovies
          .filter(movie => 
            !usedMovieIds.has(movie.imdb_id) && 
            !sectionMovies.some(selected => selected.imdb_id === movie.imdb_id)
          )
          .slice(0, 70 - sectionMovies.length);
        
        additionalMovies.forEach(movie => usedMovieIds.add(movie.imdb_id));
        (sections as any)[sectionKey] = [...sectionMovies, ...additionalMovies];
      }
    });

    return NextResponse.json({
      sections: {
        suggestions: sections.suggestions,
        trending: sections.trending,
        top_rated: sections.top_rated,
        top_imdb: sections.top_imdb,
        action: sections.action,
        tv_shows: sections.tv_shows
      },
      totalAvailable: allMovies.length,
      latestYear: latestYear,
      uniqueMoviesUsed: usedMovieIds.size
    });

  } catch (error) {
    console.error('Error fetching sections movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections movies' },
      { status: 500 }
    );
  }
}
