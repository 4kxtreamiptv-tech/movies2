"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getMoviesByImdbIds } from "@/api/tmdb";
// REMOVED: import { BULK_MOVIE_IDS } from "@/data/bulkMovieIds"; // 1.4MB - Now lazy loaded
// REMOVED: import { TV_SERIES_STATIC } from "@/data/tvSeriesStatic"; // 61MB - Now lazy loaded
import Navbar from "@/components/Navbar";
import TVNavbar from "@/components/TVNavbar";
import type { Movie } from "@/api/tmdb";
import { generateMovieUrl } from "@/lib/slug";
import { getTVImageUrl } from "@/api/tmdb-tv";
import SiteLogo from "@/components/SiteLogo";

// TV Search Modal Component
function TVSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSuggestions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/tv-series-search?q=${encodeURIComponent(searchTerm)}&limit=10`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error('Error searching TV series:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSuggestionClick = (series: any) => {
    const slug = series.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    window.location.href = `/${slug}-${series.tmdb_id || series.imdb_id}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🔍 Search TV Series</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
            ) : (
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            placeholder="Search TV series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-purple-400 font-semibold">💡 TV Series:</h4>
            {suggestions.map((series, index) => (
              <button
                key={`${series.imdb_id}-${index}`}
                onClick={() => handleSuggestionClick(series)}
                className="w-full flex items-center space-x-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <div className="relative w-12 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={series.poster_path ? getTVImageUrl(series.poster_path, 'w500') : '/placeholder.svg'}
                    alt={series.name}
                    width={48}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{series.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A'} • 
                    {series.number_of_seasons} seasons • 
                    ⭐ {series.vote_average?.toFixed(1) || 'N/A'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchTerm.length > 0 && suggestions.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-400">No TV series found for "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// TV Series Display Component - Lazy Loading for Categories
function TVSeriesDisplay({ activeCategory, categoryConfig }: { activeCategory: string, categoryConfig: any[] }) {
  const [displayCount, setDisplayCount] = useState(7); // Load only 7 initially
  const [categorySeries, setCategorySeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());
  
  // Load series data for specific category (lazy loading)
  useEffect(() => {
    // If category already loaded, don't reload
    if (loadedCategories.has(activeCategory)) {
      return;
    }
    
    setLoading(true);
    
    // Determine sort order and filters based on category
    let sortBy = 'first_air_date';
    let sortOrder = 'desc';
    let additionalFilters = '';
    
    if (activeCategory === 'Popular') {
      sortBy = 'vote_average';
      sortOrder = 'desc';
      additionalFilters = '&minRating=7.0'; // Only high-rated shows
    } else if (activeCategory === 'Featured') {
      sortBy = 'vote_average';
      sortOrder = 'desc';
      additionalFilters = '&minRating=8.0'; // Only top-rated shows
    } else if (activeCategory === 'Classic Shows') {
      sortBy = 'first_air_date';
      sortOrder = 'asc';
      additionalFilters = '&maxYear=2010'; // Shows before 2010
    } else if (activeCategory === 'Trending') {
      sortBy = 'first_air_date';
      sortOrder = 'desc';
      additionalFilters = '&minYear=2020'; // Recent shows
    } else if (activeCategory === 'New Releases') {
      sortBy = 'first_air_date';
      sortOrder = 'desc';
      additionalFilters = '&minYear=2023'; // Very recent shows
    }
    
    // Fetch only 14 series for category (fast loading)
    fetch(`/api/tv-series-db?limit=14&sortBy=${sortBy}&sortOrder=${sortOrder}${additionalFilters}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const seriesData = result.data.map((data: any) => ({
            imdbId: data.imdb_id,
          tmdbId: data.tmdb_id,
            name: data.name || `TV Series ${data.imdb_id}`,
          poster: data.poster_path,
          backdrop: data.backdrop_path,
          overview: data.overview,
          firstAirDate: data.first_air_date,
          voteAverage: data.vote_average || 0,
            episodeCount: data.seasons?.reduce((sum: number, season: any) => sum + season.episodes.length, 0) || 0,
          numberOfSeasons: data.number_of_seasons || data.seasons?.length || 0
        }));
      
          setCategorySeries(seriesData);
          setLoadedCategories(prev => new Set([...prev, activeCategory]));
        }
      setLoading(false);
      })
      .catch(error => {
      console.error('Error loading TV series data:', error);
      setLoading(false);
    });
  }, [activeCategory, loadedCategories]);
  
  // Reset display count when category changes
  useEffect(() => {
    setDisplayCount(7);
  }, [activeCategory]);
  
  // Get series for current category (from loaded data)
  const displaySeries = categorySeries.slice(0, displayCount);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4 animate-pulse">📺</div>
        <h2 className="text-2xl font-bold text-white mb-2">Loading TV Series...</h2>
        <p className="text-gray-400">Processing series data, please wait...</p>
        <div className="mt-4 w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-[#3fae2a] rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
      </div>
    );
  }

  if (categorySeries.length === 0 && !loading) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📺</div>
        <h2 className="text-2xl font-bold text-white mb-2">No TV Series Available</h2>
        <p className="text-gray-400">No TV series found in {activeCategory}.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: 2 columns (bigger posters like 123movies), Desktop: dense grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
        {displaySeries.map((series, index) => (
          <Link
            key={`tv-${String(series.tmdbId ?? series.imdbId ?? index)}-${index}`}
            href={`/${series.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${series.tmdbId || series.imdbId}`}
            className="group"
          >
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-200">
              {/* Poster */}
              <div className="relative aspect-[2/3] bg-gray-700">
                {series.poster ? (
                  <Image
                    src={getTVImageUrl(series.poster, 'w500')}
                    alt={series.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    unoptimized={true}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📺</div>
                      <div className="text-white text-sm font-semibold">TV Series</div>
                    </div>
                  </div>
                )}
                {/* TV Badge - same green as site */}
                <div className="absolute top-2 left-2 bg-[#3fae2a] bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                  TV
                </div>
                {/* Rating Badge */}
                {series.voteAverage > 0 && (
                  <div className="absolute top-2 right-2 bg-yellow-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                    ⭐ {series.voteAverage.toFixed(1)}
                  </div>
                )}
                {/* Episode Count Badge */}
                {series.episodeCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-[#3fae2a] bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                    {series.episodeCount} eps
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1 group-hover:text-purple-400 transition-colors">
                  {series.name}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {series.firstAirDate ? series.firstAirDate.split('-')[0] : 'N/A'}
                  </span>
                  <span className="flex items-center">
                    📺 Series
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Load More Button */}
      {displayCount < categorySeries.length && (
        <div className="text-center mt-6">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 7, categorySeries.length))}
              className="bg-[#3fae2a] hover:bg-[#35a024] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
            Load More ({categorySeries.length - displayCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<{[key: string]: Movie[]}>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Suggestions");
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [movieDisplayCount, setMovieDisplayCount] = useState(14); // Load 14 movies at a time
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [latestTvSeries, setLatestTvSeries] = useState<any[]>([]);
  const [popularTvSeries, setPopularTvSeries] = useState<any[]>([]);
  const [featuredTvSeries, setFeaturedTvSeries] = useState<any[]>([]);
  const [itemsPerRow, setItemsPerRow] = useState(12);
  const DISPLAY_COUNT = 12;
  const homeGridClass =
    "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-4";
  
  // Mode switching state - Default to MOVIES
  const [currentMode, setCurrentMode] = useState<'movies' | 'tv'>('movies');
  
  // TV Search Modal state
  const [isTVSearchOpen, setIsTVSearchOpen] = useState(false);
  
  // Load saved mode from localStorage on mount (ONLY if explicitly set)
  useEffect(() => {
    const savedMode = localStorage.getItem('homepageMode') as 'movies' | 'tv' | null;
    // Only switch to TV if savedMode is explicitly 'tv' AND user came from /home
    // Don't auto-load TV mode - let user switch manually
    if (savedMode === 'tv' && window.location.pathname === '/home') {
      setCurrentMode('tv');
      setActiveCategory('New Releases');
    } else {
      // Always default to movies mode
      setCurrentMode('movies');
      setActiveCategory('Suggestions');
      localStorage.setItem('homepageMode', 'movies');
    }
  }, []);

  const movieCategoryConfig = [
    { name: "Suggestions", startIndex: 0, count: 14 },
    { name: "Trending Now", startIndex: 200, count: 14 },
    { name: "Top Rated", startIndex: 300, count: 14 }
  ];

  const tvCategoryConfig = [
    { name: "New Releases", startIndex: 0, count: 14 },      // Latest series available (fast loading)
    { name: "Popular", startIndex: 100, count: 14 },         // Next batch
    { name: "Featured", startIndex: 200, count: 14 },        // Featured content
    { name: "Classic Shows", startIndex: 500, count: 14 },   // Older classics
    { name: "Trending", startIndex: 1000, count: 14 }        // Different range
  ];

  const categoryConfig = currentMode === 'movies' ? movieCategoryConfig : tvCategoryConfig;

  useEffect(() => {
    loadAllCategories();
    
    // Auto-refresh disabled for better performance
    // const interval = setInterval(loadAllCategories, 60000);
    // return () => clearInterval(interval);
  }, []);

  // Keep homepage sections to exactly 2 rows like reference site.
  // We approximate columns by viewport width.
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      // Bigger cards => fewer columns
      if (w >= 1280) return 10; // xl
      if (w >= 1024) return 8; // lg
      if (w >= 768) return 6; // md
      if (w >= 640) return 4; // sm
      return 2; // mobile
    };
    const apply = () => setItemsPerRow(compute());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // Load "Latest Movies" and "Latest TV-Series" sections like reference site
  useEffect(() => {
    (async () => {
      // 1) Try to match reference site's Suggestions + Latest Movies by their titles.
      // If this fails, we just fall back to our own data below.
      try {
        const refRes = await fetch(`/api/reference/home-mapped`);
        const refData = await refRes.json();
        if (refRes.ok) {
          const suggestionsIds = (refData.suggestionsImdbIds || []) as string[];
          const latestIds = (refData.latestMoviesImdbIds || []) as string[];

          // Map "Suggestions" titles -> our movies
          if (suggestionsIds.length) {
            const mappedSuggestions = await getMoviesByImdbIds(suggestionsIds);
            if (mappedSuggestions.length) {
              // If less than DISPLAY_COUNT, top-up from our own Suggestions API
              let finalSuggestions = mappedSuggestions.slice(0, DISPLAY_COUNT);
              if (finalSuggestions.length < DISPLAY_COUNT) {
                try {
                  const moreRes = await fetch(
                    `/api/movies/latest?category=suggestions&limit=${DISPLAY_COUNT}`
                  );
                  const moreData = await moreRes.json();
                  if (moreRes.ok && Array.isArray(moreData.movies)) {
                    for (const m of moreData.movies) {
                      if (
                        finalSuggestions.length >= DISPLAY_COUNT ||
                        finalSuggestions.some((x) => x.imdb_id === m.imdb_id)
                      ) {
                        continue;
                      }
                      finalSuggestions.push(m);
                    }
                  }
                } catch {
                  // ignore top-up errors
                }
              }
              setAllMovies(finalSuggestions);
              setCategories((prev) => ({ ...prev, Suggestions: finalSuggestions }));
            }
          }

          // Map "Latest Movies" titles -> our movies
          if (latestIds.length) {
            const mappedLatest = await getMoviesByImdbIds(latestIds);
            if (mappedLatest.length) {
              let finalLatest = mappedLatest.slice(0, DISPLAY_COUNT);
              if (finalLatest.length < DISPLAY_COUNT) {
                try {
                  const moreRes = await fetch(
                    `/api/movies/latest?category=latest&limit=${DISPLAY_COUNT}`
                  );
                  const moreData = await moreRes.json();
                  if (moreRes.ok && Array.isArray(moreData.movies)) {
                    for (const m of moreData.movies) {
                      if (
                        finalLatest.length >= DISPLAY_COUNT ||
                        finalLatest.some((x) => x.imdb_id === m.imdb_id)
                      ) {
                        continue;
                      }
                      finalLatest.push(m);
                    }
                  }
                } catch {
                  // ignore
                }
              }
              setLatestMovies(finalLatest);
            }
          }
        }
      } catch {}

      try {
        // Fetch more than we render (we render exactly 2 rows)
        const latestRes = await fetch(`/api/movies/latest?category=latest&limit=${DISPLAY_COUNT}`);
        const latestData = await latestRes.json();
        if (latestRes.ok && Array.isArray(latestData.movies)) {
          // Only overwrite if we didn't already map from reference
          setLatestMovies((prev) => (prev?.length ? prev : latestData.movies));
        }
      } catch {}

      try {
        const tvRes = await fetch(`/api/tv-series-db?limit=${DISPLAY_COUNT}&sortBy=first_air_date&sortOrder=desc`);
        const tvData = await tvRes.json();
        if (tvRes.ok && tvData?.success && Array.isArray(tvData.data)) {
          setLatestTvSeries(tvData.data);
        }
      } catch {}

      try {
        const tvRes = await fetch(`/api/tv-series-db?limit=${DISPLAY_COUNT}&sortBy=vote_average&sortOrder=desc&minRating=7.0`);
        const tvData = await tvRes.json();
        if (tvRes.ok && tvData?.success && Array.isArray(tvData.data)) {
          setPopularTvSeries(tvData.data);
        }
      } catch {}

      try {
        const tvRes = await fetch(`/api/tv-series-db?limit=${DISPLAY_COUNT}&sortBy=vote_average&sortOrder=desc&minRating=8.0`);
        const tvData = await tvRes.json();
        if (tvRes.ok && tvData?.success && Array.isArray(tvData.data)) {
          setFeaturedTvSeries(tvData.data);
        }
      } catch {}
    })();
  }, []);

  // Mode switching functions
  const switchToMovies = () => {
    setCurrentMode('movies');
    setActiveCategory('Suggestions');
    // Notify navbar component
    window.dispatchEvent(new CustomEvent('homepageModeChange', { detail: { mode: 'movies' } }));
    localStorage.setItem('homepageMode', 'movies');
  };

  const switchToTV = () => {
    setCurrentMode('tv');
    setActiveCategory('New Releases');
    // Notify navbar component
    window.dispatchEvent(new CustomEvent('homepageModeChange', { detail: { mode: 'tv' } }));
    localStorage.setItem('homepageMode', 'tv');
  };

  const loadAllCategories = async () => {
    setLoading(true);
    try {
      // Try to get all sections at once with unique movies (14 per category for fast loading)
      const response = await fetch(`/api/movies/sections?limit=14`);
      const data = await response.json();
      
      if (response.ok && data.sections) {
        // Map API categories to our category names
        const categoryMap: {[key: string]: string} = {
          "Suggestions": "suggestions",
          "Trending Now": "trending",
          "Top Rated": "top_rated",
          "TV Shows": "tv_shows"
        };
        
        const categoriesData: {[key: string]: Movie[]} = {};
        
        for (const category of categoryConfig) {
          const apiCategory = categoryMap[category.name];
          if (apiCategory && data.sections[apiCategory]) {
            categoriesData[category.name] = data.sections[apiCategory];
            console.log(`✅ ${category.name}: ${data.sections[apiCategory].length} unique movies loaded`);
          }
        }
        
        // Never overwrite Suggestions if it was already set (e.g. from reference mapping)
        setCategories((prev) => {
          const next = { ...prev, ...categoriesData };
          if (prev.Suggestions) {
            next.Suggestions = prev.Suggestions;
          }
          return next;
        });
        
        // Set initial movies to suggestions only if allMovies is still empty
        if (data.sections.suggestions) {
          setAllMovies((prev) => (prev && prev.length > 0 ? prev : data.sections.suggestions));
        }
      } else {
        console.log('⚠️ Sections API failed, using individual category loading');
        await loadCategoriesIndividually();
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      await loadCategoriesIndividually();
    }
    setLoading(false);
  };

  const loadCategoriesIndividually = async () => {
    try {
      const categoriesData: {[key: string]: Movie[]} = {};
      
      for (const category of categoryConfig) {
        // Map category names to API categories
        const apiCategoryMap: {[key: string]: string} = {
          "Suggestions": "suggestions",
          "Trending Now": "trending",
          "Top Rated": "top_rated",
          "TV Shows": "tv_shows"
        };
        
        const apiCategory = apiCategoryMap[category.name] || "latest";
        const response = await fetch(`/api/movies/latest?category=${apiCategory}&limit=${category.count}`);
        const data = await response.json();
        
        if (response.ok && data.movies && data.movies.length > 0) {
          console.log(`✅ ${category.name}: ${data.movies.length} movies loaded`);
          categoriesData[category.name] = data.movies;
        } else {
          console.log(`⚠️ ${category.name}: Using fallback - fetching slice from API (no client big file)`);
          const res = await fetch(`/api/movies/list?offset=${category.startIndex}&limit=${category.count}&order=desc`);
          const listData = await res.json();
          const movieIds = (listData.imdb_ids || []) as string[];
          const moviesData = movieIds.length ? await getMoviesByImdbIds(movieIds) : [];
          categoriesData[category.name] = moviesData;
        }
      }
      
      // Never overwrite Suggestions if it was already set (e.g. from reference mapping)
      setCategories((prev) => {
        const next = { ...prev, ...categoriesData };
        if (prev.Suggestions) {
          next.Suggestions = prev.Suggestions;
        }
        return next;
      });
      
      // Set initial movies to suggestions only if allMovies is still empty
      if (categoriesData["Suggestions"]) {
        setAllMovies((prev) =>
          prev && prev.length > 0 ? prev : categoriesData["Suggestions"]!
        );
      }
    } catch (error) {
      console.error('Error loading categories individually:', error);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    setActiveCategory(categoryName);
    setMovieDisplayCount(14); // Reset to 14 when category changes
    if (categoryName === "TV Shows") {
      // Show coming soon message for TV Shows
      setAllMovies([]);
    } else if (categories[categoryName]) {
      setAllMovies(categories[categoryName]);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">

      {/* Hero (reference-like card slider look) */}
      <div className="w-full pt-0">
        <div className="bg-white shadow rounded-b overflow-hidden w-full">
          <div className="relative h-[220px] md:h-[320px]">
            <Image
              src="https://image.tmdb.org/t/p/original/1XDDXPXGiI8id7MrUxK36ke7gkX.jpg"
              alt="Featured"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block w-full max-w-xl px-4 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                {currentMode === "movies" ? "Featured Movie" : "Featured TV"}
              </h2>
              <p className="text-sm text-gray-200 line-clamp-2 mb-3">
                {currentMode === "movies"
                  ? "Watch HD Movies Online Free"
                  : "Watch HD TV Series Online Free"}
              </p>
              {/* Movies / TV switch (bigger + centered like reference) */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={switchToMovies}
                  className={`px-6 py-3 rounded-md font-bold text-base transition-colors ${
                    currentMode === "movies"
                      ? "bg-[#79c142] text-white"
                      : "bg-white/90 text-gray-900 hover:bg-white"
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={switchToTV}
                  className={`px-6 py-3 rounded-md font-bold text-base transition-colors ${
                    currentMode === "tv"
                      ? "bg-[#79c142] text-white"
                      : "bg-white/90 text-gray-900 hover:bg-white"
                  }`}
                >
                  TV Series
                </button>
              </div>
              <Link
                href={currentMode === "movies" ? "/movies" : "/series"}
                className="inline-block bg-[#79c142] hover:bg-[#6bb23a] text-white px-5 py-2 rounded font-semibold"
              >
                Watch Now
              </Link>
            </div>

            {/* Mobile switch (bigger + centered) */}
            <div className="absolute bottom-4 left-4 right-4 md:hidden flex items-center justify-center">
              <div className="w-full max-w-[360px] flex items-center justify-center gap-4">
              <button
                onClick={switchToMovies}
                className={`flex-1 py-3 rounded-md font-bold text-base transition-colors ${
                  currentMode === "movies"
                    ? "bg-[#79c142] text-white"
                    : "bg-white/90 text-gray-900"
                }`}
              >
                Movies
              </button>
              <button
                onClick={switchToTV}
                className={`flex-1 py-3 rounded-md font-bold text-base transition-colors ${
                  currentMode === "tv"
                    ? "bg-[#79c142] text-white"
                    : "bg-white/90 text-gray-900"
                }`}
              >
                TV Series
              </button>
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div key={dot} className="w-2 h-2 bg-white/80 rounded-full opacity-70" />
              ))}
            </div>
          </div>
          <div className="px-4 py-3 text-sm text-gray-700">
            Like and Share our website to support us.
          </div>
        </div>
      </div>

      {/* Ads notice (reference info box) */}
      <div className="w-full mt-3 px-0">
        <div className="bg-[#d1ecf1] text-[#0c5460] text-center rounded-none px-4 py-3 shadow">
          Ads can be a pain, but they are our only way to maintain the server. Your patience is highly appreciated and we hope our service can be worth it.
        </div>
      </div>

      <div className="w-full px-0 py-6">
        {/* Sections like reference site */}
        <div className="space-y-6 px-3 sm:px-4">
          {currentMode === "movies" ? (
            <>
              {/* Suggestions */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Suggestions
                  </div>
                </div>
                {loading ? (
                  <div className={homeGridClass}>
                    {Array.from({ length: DISPLAY_COUNT }).map((_, i) => (
                      <div key={i} className="bg-white rounded shadow overflow-hidden">
                        <div className="aspect-[2/3] bg-gray-200 animate-pulse" />
                        <div className="h-8 bg-black/80" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={homeGridClass}>
                    {allMovies.slice(0, DISPLAY_COUNT).map((movie, index) => (
                      <Link
                        key={`${movie.imdb_id}-${index}`}
                        href={generateMovieUrl(movie.title, movie.imdb_id)}
                        className="group block"
                      >
                        <div className="bg-white rounded shadow overflow-hidden">
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "/placeholder.svg"}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              HD
                            </span>
                          </div>
                          <div className="bg-black px-2 py-2">
                            <div className="text-white text-xs font-semibold line-clamp-1">
                              {movie.title}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Latest Movies */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Latest Movies
                  </div>
                </div>
                <div className={homeGridClass}>
                  {(latestMovies || []).slice(0, DISPLAY_COUNT).map((movie: any, index: number) => (
                    <Link
                      key={`latest-m-${movie.imdb_id ?? index}-${index}`}
                      href={generateMovieUrl(movie.title, movie.imdb_id)}
                      className="group block"
                    >
                      <div className="bg-white rounded shadow overflow-hidden">
                        <div className="relative aspect-[2/3]">
                          <Image
                            src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "/placeholder.svg"}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                          <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            HD
                          </span>
                        </div>
                        <div className="bg-black px-2 py-2">
                          <div className="text-white text-xs font-semibold line-clamp-1">
                            {movie.title}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Latest TV-Series (also visible on Movies home like reference) */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Latest TV-Series
                  </div>
                </div>
                <div className={homeGridClass}>
                  {latestTvSeries.slice(0, DISPLAY_COUNT).map((series: any, index: number) => {
                    const name = series.name || `TV Series ${series.imdb_id || series.tmdb_id || index}`;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    const href = `/${slug}-${series.tmdb_id || series.tmdbId || series.imdb_id || series.imdbId || ""}`;
                    const eps =
                      series?.seasons?.reduce?.((sum: number, s: any) => sum + (s?.episodes?.length || 0), 0) ||
                      series?.episodeCount ||
                      0;
                    return (
                      <Link key={`tv-latest-movies-${series.tmdb_id ?? series.imdb_id ?? index}-${index}`} href={href} className="group block">
                        <div className="bg-white rounded shadow overflow-hidden">
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={series.poster_path ? getTVImageUrl(series.poster_path, "w500") : "/placeholder.svg"}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              TV
                            </span>
                            {eps > 0 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Eps {eps}
                              </span>
                            )}
                          </div>
                          <div className="bg-black px-2 py-2">
                            <div className="text-white text-xs font-semibold line-clamp-1">
                              {name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Latest TV-Series */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Latest TV-Series
                  </div>
                </div>
                <div className={homeGridClass}>
                  {latestTvSeries.slice(0, DISPLAY_COUNT).map((series: any, index: number) => {
                    const name = series.name || `TV Series ${series.imdb_id || series.tmdb_id || index}`;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    const href = `/${slug}-${series.tmdb_id || series.tmdbId || series.imdb_id || series.imdbId || ""}`;
                    const eps =
                      series?.seasons?.reduce?.((sum: number, s: any) => sum + (s?.episodes?.length || 0), 0) ||
                      series?.episodeCount ||
                      0;
                    return (
                      <Link key={`tv-latest-${series.tmdb_id ?? series.imdb_id ?? index}-${index}`} href={href} className="group block">
                        <div className="bg-white rounded shadow overflow-hidden">
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={series.poster_path ? getTVImageUrl(series.poster_path, "w500") : "/placeholder.svg"}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              TV
                            </span>
                            {eps > 0 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Eps {eps}
                              </span>
                            )}
                          </div>
                          <div className="bg-black px-2 py-2">
                            <div className="text-white text-xs font-semibold line-clamp-1">
                              {name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Popular TV-Series */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Popular TV-Series
                  </div>
                </div>
                <div className={homeGridClass}>
                  {popularTvSeries.slice(0, DISPLAY_COUNT).map((series: any, index: number) => {
                    const name = series.name || `TV Series ${series.imdb_id || series.tmdb_id || index}`;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    const href = `/${slug}-${series.tmdb_id || series.tmdbId || series.imdb_id || series.imdbId || ""}`;
                    const eps =
                      series?.seasons?.reduce?.((sum: number, s: any) => sum + (s?.episodes?.length || 0), 0) ||
                      series?.episodeCount ||
                      0;
                    return (
                      <Link key={`tv-popular-${series.tmdb_id ?? series.imdb_id ?? index}-${index}`} href={href} className="group block">
                        <div className="bg-white rounded shadow overflow-hidden">
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={series.poster_path ? getTVImageUrl(series.poster_path, "w500") : "/placeholder.svg"}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              TV
                            </span>
                            {eps > 0 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Eps {eps}
                              </span>
                            )}
                          </div>
                          <div className="bg-black px-2 py-2">
                            <div className="text-white text-xs font-semibold line-clamp-1">
                              {name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Featured TV-Series */}
              <section>
                <div className="mb-3">
                  <div className="inline-flex items-center bg-[#79c142] text-white text-base md:text-lg font-bold px-4 py-2 rounded">
                    Featured TV-Series
                  </div>
                </div>
                <div className={homeGridClass}>
                  {featuredTvSeries.slice(0, DISPLAY_COUNT).map((series: any, index: number) => {
                    const name = series.name || `TV Series ${series.imdb_id || series.tmdb_id || index}`;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    const href = `/${slug}-${series.tmdb_id || series.tmdbId || series.imdb_id || series.imdbId || ""}`;
                    const eps =
                      series?.seasons?.reduce?.((sum: number, s: any) => sum + (s?.episodes?.length || 0), 0) ||
                      series?.episodeCount ||
                      0;
                    return (
                      <Link key={`tv-featured-${series.tmdb_id ?? series.imdb_id ?? index}-${index}`} href={href} className="group block">
                        <div className="bg-white rounded shadow overflow-hidden">
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={series.poster_path ? getTVImageUrl(series.poster_path, "w500") : "/placeholder.svg"}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <span className="absolute top-2 right-2 bg-[#79c142] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              TV
                            </span>
                            {eps > 0 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Eps {eps}
                              </span>
                            )}
                          </div>
                          <div className="bg-black px-2 py-2">
                            <div className="text-white text-xs font-semibold line-clamp-1">
                              {name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

      </div>

      {/* Footer - 123moviesfree: green logo + same colors */}
      <footer className="bg-[#0d0d0d] border-t border-[#2b2b2b] text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <SiteLogo href="/" size="footer" tagline="" />
                <div className="w-6 h-6 bg-[#3fae2a] rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Watch your favorite movies and TV shows online for free. 
                High quality streaming with no registration required.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Home</Link></li>
                <li><Link href="/movies" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">All Movies</Link></li>
                <li><Link href="/series-static" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">TV Series</Link></li>
                <li><Link href="/genres" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Genres</Link></li>
                <li><Link href="/country" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Countries</Link></li>
                <li>
                  <button 
                    onClick={() => setIsTVSearchOpen(true)}
                    className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm"
                  >
                    Search TV Series
                  </button>
                </li>
              </ul>
            </div>

            {/* Popular Genres */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Popular Genres</h3>
              <ul className="space-y-2">
                <li><Link href="/genre/action" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Action</Link></li>
                <li><Link href="/genre/comedy" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Comedy</Link></li>
                <li><Link href="/genre/drama" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Drama</Link></li>
                <li><Link href="/genre/horror" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Horror</Link></li>
                <li><Link href="/genre/romance" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">Romance</Link></li>
                <li><Link href="/tv-genre/action" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">TV Action</Link></li>
                <li><Link href="/tv-genre/drama" className="text-gray-400 hover:text-[#3fae2a] transition-colors text-sm">TV Drama</Link></li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#2b2b2b] mt-8 pt-8">
            <div className="text-center">
              <div className="text-gray-500 text-sm">
                Made with ❤️ for movie lovers
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* TV Search Modal */}
      <TVSearchModal 
        isOpen={isTVSearchOpen} 
        onClose={() => setIsTVSearchOpen(false)} 
      />
    </div>
  );
}
