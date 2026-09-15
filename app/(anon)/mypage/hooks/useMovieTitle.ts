import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axios";

// 영화 정보 타입 정의
interface MovieInfo {
  id: number;
  title: string;
  poster_path?: string;
  release_date?: string;
}

// API 응답 타입 정의
interface MovieResponse {
  movie: MovieInfo;
}

/**
 * 영화 ID로 영화 제목을 가져오는 커스텀 훅
 * @param movieId - 영화 ID
 * @returns 영화 제목, 로딩 상태, 에러 상태
 */
export const useMovieTitle = (movieId: string) => {
  const [title, setTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovieTitle = async () => {
      if (!movieId) {
        setTitle("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // movieId에서 숫자 부분만 추출 (예: "1269208-84" -> "1269208")
        const numericMovieId = movieId.split("-")[0];
        const response = await axiosInstance.get<MovieResponse>(
          `/movies?movieId=${numericMovieId}`,
        );

        const movieTitle = response.data.movie.title || `영화 ${movieId}`;
        setTitle(movieTitle);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "영화 제목을 가져오는 중 오류가 발생했습니다.",
        );
        // 에러 발생 시 기본값 설정
        setTitle(`영화 ${movieId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovieTitle();
  }, [movieId]);

  return { title, isLoading, error };
};
