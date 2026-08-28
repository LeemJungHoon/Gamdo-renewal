import { NextRequest, NextResponse } from "next/server";
import { SearchMultiUseCase } from "@/backend/application/search/usecases/SearchMultiUseCase";
import { SearchRepositoryImpl } from "@/backend/infrastructure/repositories/movies/SearchRepositoryImpl";
import { TmdbImageUtils } from "@/utils/tmdb/TmdbApi";

const searchMultiUseCase = new SearchMultiUseCase(new SearchRepositoryImpl());

interface BatchSearchBody {
  titles?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchSearchBody = await request.json();
    const titles = Array.isArray(body.titles)
      ? body.titles.filter((title) => typeof title === "string" && title.trim())
      : [];

    if (titles.length === 0) {
      return NextResponse.json(
        { error: "영화 제목이 필요합니다." },
        { status: 400 },
      );
    }

    const settledResults = await Promise.allSettled(
      titles.map(async (title) => {
        const searchResult = await searchMultiUseCase.execute(title, 1);
        const movie = searchResult.results.find(
          (item) => item.media_type === "movie" && item.poster_path,
        );

        if (!movie || movie.media_type !== "movie" || !movie.poster_path) {
          return null;
        }

        return {
          movieId: movie.id,
          title: movie.title || title,
          posterUrl: TmdbImageUtils.getPosterUrl(movie.poster_path, "w342"),
        };
      }),
    );

    const results = settledResults.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB 일괄 검색 에러:", error);
    return NextResponse.json(
      { error: "영화 정보를 일괄 조회할 수 없습니다." },
      { status: 500 },
    );
  }
}
