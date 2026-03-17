"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Movie } from "@/api/tmdb";
import { generateMovieUrl } from "@/lib/slug";
import Head from "next/head";

interface GenrePageProps {
  params: Promise<{
    slug: string;
  }>;
}

// TMDB genre ids (from processed batch data)
const getGenreId = (slug: string): number | null => {
  const map: Record<string, number> = {
    "action": 28,
    "action-adventure": 28,
    "adventure": 12,
    "animation": 16,
    "comedy": 35,
    "crime": 80,
    "documentary": 99,
    "drama": 18,
    "family": 10751,
    "fantasy": 14,
    "history": 36,
    "horror": 27,
    "music": 10402,
    "mystery": 9648,
    "romance": 10749,
    "science-fiction": 878,
    "sci-fi": 878,
    "thriller": 53,
    "war": 10752,
    "western": 37,
  };
  return map[slug] ?? null;
};

const getGenreKeywords = (slug: string): string[] => {
  const keywordMap: {[key: string]: string[]} = {
    'action': [
      'action movies free online', 'best action movies 2024', 'action movies HD streaming',
      'watch action movies online free', 'action thriller movies', 'Hollywood action movies',
      'action movies with subtitles', 'latest action movies', 'action movies download free',
      // Competitor keywords
      '123movies action', 'fmovies action movies', 'putlocker action films', 'solarmovie action',
      'yesmovies action', 'gomovies action', 'xmovies8 action', 'primewire action movies'
    ],
    'comedy': [
      'comedy movies free streaming', 'funny movies online free', 'comedy movies HD',
      'best comedy movies 2024', 'watch comedy movies online', 'romantic comedy movies',
      'comedy movies with subtitles', 'latest comedy movies', 'free comedy movies download',
      // Competitor keywords
      '123movies comedy', 'fmovies comedy movies', 'putlocker comedy films', 'solarmovie comedy',
      'yesmovies comedy', 'gomovies comedy', 'xmovies8 comedy', 'primewire comedy movies'
    ],
    'horror': [
      'horror movies free online', 'scary movies streaming free', 'horror movies HD',
      'best horror movies 2024', 'watch horror movies online', 'thriller horror movies',
      'horror movies with subtitles', 'latest horror movies', 'free horror movies download',
      // Competitor keywords
      '123movies horror', 'fmovies horror movies', 'putlocker horror films', 'solarmovie horror',
      'yesmovies horror', 'gomovies horror', 'xmovies8 horror', 'primewire horror movies'
    ],
    'drama': [
      'drama movies free streaming', 'emotional movies online free', 'drama movies HD',
      'best drama movies 2024', 'watch drama movies online', 'romantic drama movies',
      'drama movies with subtitles', 'latest drama movies', 'free drama movies download',
      // Competitor keywords
      '123movies drama', 'fmovies drama movies', 'putlocker drama films', 'solarmovie drama',
      'yesmovies drama', 'gomovies drama', 'xmovies8 drama', 'primewire drama movies'
    ],
    'romance': [
      'romance movies free online', 'romantic movies streaming free', 'romance movies HD',
      'best romance movies 2024', 'watch romance movies online', 'romantic comedy movies',
      'romance movies with subtitles', 'latest romance movies', 'free romance movies download',
      // Competitor keywords
      '123movies romance', 'fmovies romance movies', 'putlocker romance films', 'solarmovie romance',
      'yesmovies romance', 'gomovies romance', 'xmovies8 romance', 'primewire romance movies'
    ],
    'sci-fi': [
      'sci fi movies free online', 'science fiction movies streaming', 'sci fi movies HD',
      'best sci fi movies 2024', 'watch sci fi movies online', 'space movies online free',
      'sci fi movies with subtitles', 'latest sci fi movies', 'free sci fi movies download',
      // Competitor keywords
      '123movies sci fi', 'fmovies sci fi movies', 'putlocker sci fi films', 'solarmovie sci fi',
      'yesmovies sci fi', 'gomovies sci fi', 'xmovies8 sci fi', 'primewire sci fi movies'
    ]
  };
  
  return keywordMap[slug] || [
    `${slug} movies free online`, `best ${slug} movies 2024`, `${slug} movies HD streaming`,
    `watch ${slug} movies online free`, `latest ${slug} movies`, `${slug} movies with subtitles`,
    // Competitor keywords
    `123movies ${slug}`, `fmovies ${slug} movies`, `putlocker ${slug} films`, `solarmovie ${slug}`,
    `yesmovies ${slug}`, `gomovies ${slug}`, `xmovies8 ${slug}`, `primewire ${slug} movies`
  ];
};

export default function GenrePage({ params }: GenrePageProps) {
  const [slug, setSlug] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [genreId, setGenreId] = useState<number | null>(null);

  useEffect(() => {
    loadGenreMovies();
  }, []);

  const loadGenreMovies = async () => {
    try {
      const { slug: slugParam } = await params;
      setSlug(slugParam);

      const gid = getGenreId(slugParam);
      setGenreId(gid);
      if (!gid) {
        setMovies([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/movies/genre?genreId=${gid}&page=1&limit=21`);
      const data = await response.json();
      if (response.ok) {
        setMovies(data.movies || []);
        setCurrentPage(1);
        setHasMore(!!data.pagination?.hasNextPage);
      } else {
        setMovies([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading genre movies:', error);
    }
    setLoading(false);
  };

  const loadMoreMovies = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      if (!genreId) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      const nextPage = currentPage + 1;
      const response = await fetch(`/api/movies/genre?genreId=${genreId}&page=${nextPage}&limit=21`);
      const data = await response.json();
      if (response.ok) {
        const newMovies = data.movies || [];
        setMovies(prev => [...prev, ...newMovies]);
        setCurrentPage(nextPage);
        setHasMore(!!data.pagination?.hasNextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more movies:', error);
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  // Convert slug to readable name
  const genreName = slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return (
    <>
      <Head>
        <title>{genreName} Movies - Watch Free Online | 123Movies</title>
        <meta name="description" content={`Watch the best ${genreName.toLowerCase()} movies online for free. Discover top-rated ${genreName.toLowerCase()} films with HD quality streaming.`} />
        <meta name="keywords" content={getGenreKeywords(slug).join(', ')} />
        <meta property="og:title" content={`${genreName} Movies - Watch Free Online`} />
        <meta property="og:description" content={`Discover the best ${genreName.toLowerCase()} movies online for free. HD quality streaming available.`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${genreName} Movies - Watch Free Online`} />
        <meta name="twitter:description" content={`Discover the best ${genreName.toLowerCase()} movies online for free.`} />
      </Head>
      
      <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-white mb-8">{genreName} Movies</h1>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {movies.map((movie, index) => (
                <Link
                  key={`${movie.imdb_id}-${index}`}
                  href={generateMovieUrl(movie.title, movie.imdb_id)}
                  className="group relative"
                >
                  <div className="relative aspect-[2/3] bg-gray-800 rounded overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
                    <Image
                      src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder.svg'}
                      alt={`${movie.title} movie poster`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    <div className="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-xs font-bold px-1 py-0.5 rounded">
                      HD
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 hover:scale-110 transition-all duration-200">
                        <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-white text-xs mt-1 line-clamp-1 group-hover:text-green-400 transition-colors">
                    {movie.title}
                  </h3>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMoreMovies}
                  disabled={loadingMore}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  {loadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Load More Movies'
                  )}
                </button>
              </div>
            )}

            {!hasMore && movies.length > 0 && (
              <div className="text-center mt-8">
                <p className="text-gray-400">No more movies to load</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}