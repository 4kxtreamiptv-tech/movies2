import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genreIdRaw = searchParams.get("genreId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const genreId = genreIdRaw ? parseInt(genreIdRaw, 10) : NaN;
    if (Number.isNaN(genreId)) {
      return NextResponse.json(
        { error: "genreId parameter is required" },
        { status: 400 }
      );
    }

    const scriptsDir = path.join(process.cwd(), "scripts");
    if (!fs.existsSync(scriptsDir)) {
      return NextResponse.json({
        movies: [],
        pagination: { page: 1, limit, total: 0, pages: 0, hasNextPage: false },
        message: "Movie data not available yet",
      });
    }

    const batchFiles = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.startsWith("batch-") && file.endsWith("-results.json"))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/batch-(\\d+)-results\\.json/)?.[1] || "0", 10);
        const bNum = parseInt(b.match(/batch-(\\d+)-results\\.json/)?.[1] || "0", 10);
        return aNum - bNum;
      });

    const matches: any[] = [];
    for (const batchFile of batchFiles) {
      try {
        const batchPath = path.join(scriptsDir, batchFile);
        const batchData = JSON.parse(fs.readFileSync(batchPath, "utf8"));
        for (const movie of batchData) {
          const genres = Array.isArray(movie.genres) ? movie.genres : [];
          if (!genres.includes(genreId)) continue;
          matches.push({
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
            genres,
          });
        }
      } catch (error) {
        console.error(`Error reading batch file ${batchFile}:`, error);
      }
    }

    // Latest first (year desc, then release_date desc, then rating)
    matches.sort((a, b) => {
      const ay = a.year || 0;
      const by = b.year || 0;
      if (by !== ay) return by - ay;
      const ad = a.release_date ? Date.parse(a.release_date) : Date.parse(`${ay}-01-01`);
      const bd = b.release_date ? Date.parse(b.release_date) : Date.parse(`${by}-01-01`);
      if (bd !== ad) return bd - ad;
      const ar = a.vote_average || 0;
      const br = b.vote_average || 0;
      return br - ar;
    });

    const total = matches.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = matches.slice(startIndex, endIndex);

    return NextResponse.json({
      movies: paginated,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
      genreId,
    });
  } catch (error) {
    console.error("Error fetching movies by genre:", error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
