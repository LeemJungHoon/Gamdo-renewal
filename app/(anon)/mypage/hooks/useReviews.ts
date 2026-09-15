import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axios";

// 리뷰 데이터 타입 정의
export interface Review {
  id: number;
  userId: string;
  movieId: string;
  content: string;
  createdAt: string;
}

// API 응답 타입 정의
interface ReviewsResponse {
  reviews: Review[];
}

/**
 * 사용자의 리뷰 데이터를 가져오는 커스텀 훅
 * @returns 리뷰 데이터, 로딩 상태, 에러 상태
 */
export const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 사용자 인증 정보 먼저 가져오기
        const authResponse = await axiosInstance.get("/saves/user-auth");

        if (!authResponse.data.success) {
          throw new Error("사용자 인증에 실패했습니다.");
        }

        const userId = authResponse.data.data.userId;

        // 해당 사용자의 리뷰 데이터 가져오기
        const reviewsResponse = await axiosInstance.get<ReviewsResponse>(
          `/reviews?userId=${userId}`,
        );

        setReviews(reviewsResponse.data.reviews);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "리뷰 데이터를 가져오는 중 오류가 발생했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return { reviews, isLoading, error };
};
