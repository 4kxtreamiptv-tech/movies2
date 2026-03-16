"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getTVImageUrl } from "@/api/tmdb-tv";
import Head from "next/head";

interface SeriesWithEpisodeCount {
  imdb_id: string;
  tmdb_id?: number;
  name: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  vote_average?: number;
  number_of_seasons?: number;
  seasons?: any[];
  episodeCount: number;
}

// Helper function to create series slug
function createSeriesSlug(name: string, id: string | number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}-${id}`;
}

export default function SeriesListPage() {
  const [allSeries, setAllSeries] = useState<SeriesWithEpisodeCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 7;
  
  // Fetch series from MongoDB API with pagination
  const fetchSeries = async (skip: number = 0) => {
    try {
      if (skip === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await fetch(`/api/tv-series-db?limit=${ITEMS_PER_PAGE}&skip=${skip}&sortBy=first_air_date&sortOrder=desc`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const seriesWithCount = result.data.map((series: any) => ({
          imdb_id: series.imdb_id,
          tmdb_id: series.tmdb_id,
          name: series.name || `TV Series ${series.imdb_id}`,
          overview: series.overview,
          poster_path: series.poster_path,
          backdrop_path: series.backdrop_path,
          first_air_date: series.first_air_date,
          vote_average: series.vote_average || 0,
          number_of_seasons: series.number_of_seasons || series.seasons?.length || 0,
          episodeCount: series.seasons?.reduce((sum: number, season: any) => sum + season.episodes.length, 0) || 0
        }));
        
        if (skip === 0) {
          setAllSeries(seriesWithCount);
        } else {
          setAllSeries(prev => [...prev, ...seriesWithCount]);
        }
        
        setTotalCount(result.total || 0);
        setHasMore((skip + ITEMS_PER_PAGE) < (result.total || 0));
      }
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Load initial series
  useEffect(() => {
    fetchSeries(0);
    document.title = 'TV Series - Watch TV Shows Online';
  }, []);
  
  // Load more handler
  const handleLoadMore = () => {
    fetchSeries(allSeries.length);
  };

  return (
    <>
      <Head>
        <title>TV Series - Watch Free TV Shows Online | 123Movies</title>
        <meta name="description" content="Watch free TV series and shows online. Stream thousands of TV shows, seasons, and episodes in HD quality. No registration required. Latest TV series available." />
        <meta name="keywords" content="TV series, watch TV shows online free, TV series streaming, free TV shows, latest TV series, TV episodes online, watch series free, TV show collection, stream TV series, fmovies, putlocker, moviesflix, watch free TV shows online free, free TV series streaming, best free TV show sites, TV streaming websites, free TV shows no registration, HD TV series streaming free, latest TV shows free online, new TV series streaming, TV series download free, watch TV shows HD free, streaming TV series online, free TV show websites, TV streaming platform, watch latest TV series free, free TV series site, TV streaming service, online TV shows free, watch TV series online HD, free TV series streaming sites, TV series streaming free, watch free HD TV shows, online TV series streaming free, free TV shows streaming, TV series streaming website, watch TV shows free online free, free TV series streaming platform, HD TV shows online free, streaming free TV shows, TV series streaming sites free, watch TV series online free HD, free TV series streaming website, TV series streaming free online, watch TV shows free streaming, free TV shows online streaming, TV series streaming sites HD, watch free TV shows online HD, free TV series streaming service, online TV series streaming sites, free TV shows streaming sites, TV series streaming platform free, watch TV shows free online streaming, free HD TV series streaming, TV series streaming websites free, watch free TV shows streaming, free TV series streaming sites HD, online TV shows streaming free, TV series streaming free sites, watch TV shows online streaming free, free TV series streaming websites, TV series streaming sites online, watch free TV shows online streaming, free TV shows streaming website, TV series streaming platform online, watch TV shows streaming free, free TV series streaming sites online, online TV series streaming free sites, TV series streaming free website, watch TV shows free online sites, free TV series streaming platform HD, TV series streaming sites free HD, watch free TV shows streaming HD, free TV series streaming website HD, online TV series streaming free HD, TV series streaming free sites HD, watch TV shows online streaming free HD, free TV series streaming websites HD, TV series streaming sites online HD, watch free TV shows online streaming HD, free TV shows streaming website HD, TV series streaming platform online HD, watch TV shows streaming free HD, free TV series streaming sites online HD, online TV series streaming free sites HD, TV series streaming free website HD, watch TV shows free online sites HD, free TV series streaming platform online HD, TV series streaming sites free online HD, watch free TV shows streaming online HD, free TV series streaming website online HD, online TV series streaming free online HD, TV series streaming free sites online HD, watch TV shows online streaming free online HD, free TV series streaming websites online HD, TV series streaming sites online online HD, watch free TV shows online streaming online HD, free TV shows streaming website online HD, TV series streaming platform online online HD, watch TV shows streaming free online HD, free TV series streaming sites online online HD, online TV series streaming free sites online HD, TV series streaming free website online HD, watch TV shows free online sites online HD, free TV series streaming platform online online HD" />
        <meta property="og:title" content="TV Series - Watch Free TV Shows Online" />
        <meta property="og:description" content="Watch free TV series and shows online. Stream thousands of TV shows, seasons, and episodes in HD quality." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TV Series - Watch Free TV Shows Online" />
        <meta name="twitter:description" content="Watch free TV series and shows online. Stream thousands of TV shows, seasons, and episodes in HD quality." />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">TV Series</h1>
          <p className="text-gray-400">
            {loading ? 'Loading...' : `Browse ${totalCount.toLocaleString()} TV shows • Showing ${allSeries.length} series`}
          </p>
          <p className="text-purple-400 text-sm mt-1">📺 New releases first • Load 7 at a time for fast performance</p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-pulse">📺</div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading TV Series...</h2>
            <p className="text-gray-400">Please wait</p>
          </div>
        ) : allSeries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <h2 className="text-2xl font-bold text-white mb-2">No TV Series Available</h2>
            <p className="text-gray-400">Run migration script to import TV series data</p>
          </div>
        ) : (
          <>
            {/* Mobile: 2-column grid, desktop: denser grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allSeries.map((series, index) => (
                <Link
                  key={series.tmdb_id ?? series.imdb_id ?? `series-${index}`}
                  href={`/${createSeriesSlug(series.name, series.tmdb_id || series.imdb_id)}`}
                  className="group"
                >
                  <div className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-200">
                    {/* Poster */}
                    <div className="relative aspect-[2/3] bg-gray-700">
                      <Image
                        src={getTVImageUrl(series.poster_path, 'w500')}
                        alt={series.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {/* Episode Count Badge */}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                        {series.episodeCount} eps
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1 group-hover:text-purple-400 transition-colors">
                        {series.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{series.first_air_date?.split('-')[0] || 'N/A'}</span>
                        {series.vote_average && (
                          <span className="flex items-center">
                            ⭐ {series.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {series.number_of_seasons && (
                        <div className="text-xs text-purple-400 mt-1">
                          {series.number_of_seasons} {series.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg"
                >
                  {loadingMore ? 'Loading...' : `Load More (${totalCount - allSeries.length} remaining)`}
                </button>
                <p className="text-gray-400 text-sm mt-2">
                  Showing {allSeries.length} of {totalCount.toLocaleString()} series
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}


