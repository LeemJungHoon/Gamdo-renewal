import React, { useState } from "react";
import Image from "next/image";
import { FaCalendarAlt, FaRegBookmark, FaBookmark } from "react-icons/fa";
import { getPlatformImages } from "@/app/components/Platform";
import { useBookmark } from "../hooks/useBookmark";
import MovieHeaderCalendar from "./MovieHeaderCalendar";
import axios from "@/utils/axios";
import { useToast } from "@/app/hooks/useToast";
import Toast from "@/app/components/Toast";

interface MovieHeaderProps {
  ottProviders?: string[];
  movieId?: string;
}

const MovieHeader = ({ ottProviders = [], movieId }: MovieHeaderProps) => {
  const { isBookmarked, isLoading, toggleBookmark } = useBookmark({ movieId });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [savedDate, setSavedDate] = useState<Date | undefined>(undefined);
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();

  const handleCalendarToggle = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  const handleDateSelect = async (date: Date) => {
    if (!movieId) {
      showError("영화 정보를 찾을 수 없습니다.");
      return;
    }

    // 현재 저장된 날짜를 백업 (에러 시 되돌리기 위해)
    const currentSavedDate = savedDate;

    // 이미 선택된 날짜를 다시 클릭했는지 확인 (선택 해제)
    const isSameDate =
      savedDate &&
      savedDate.getFullYear() === date.getFullYear() &&
      savedDate.getMonth() === date.getMonth() &&
      savedDate.getDate() === date.getDate();

    if (isSameDate) {
      // 선택 해제 처리
      showInfo("영화 저장이 취소되었습니다.");
      return;
    }

    try {
      // 날짜를 YYYY-MM-DD 형식으로 변환
      const formattedDate = date.toISOString().split("T")[0];
      const response = await axios.post("/saves", {
        movieId,
        selectedDate: formattedDate,
      });

      if (response.data.success) {
        showSuccess("영화가 캘린더에 저장되었습니다!");
      } else {
        // 에러 발생 시 이전 상태로 되돌리기
        setSavedDate(currentSavedDate);
        showError(response.data.message || "저장에 실패했습니다.");
      }
    } catch (error: unknown) {
      // 에러 발생 시 이전 상태로 되돌리기
      setSavedDate(currentSavedDate);

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        if (axiosError.response?.data?.message) {
          showError(axiosError.response.data.message);
        } else {
          showError("영화 저장 중 오류가 발생했습니다.");
        }
      } else {
        showError("영화 저장 중 오류가 발생했습니다.");
      }
    }
  };

  // OTT 제공자 이미지 경로 배열 가져오기
  const platformImages = getPlatformImages(ottProviders);

  // 중복 제거
  const uniquePlatformImages = Array.from(new Set(platformImages));

  return (
    <>
      <div
        className="flex gap-3 min-w-[600px] flex-1 h-16 rounded-xl items-center px-4 py-2 justify-center"
        style={{ backgroundColor: "rgb(22, 18, 20)" }}
      >
        {uniquePlatformImages.length > 0 ? (
          uniquePlatformImages.map((imagePath, index) => (
            <Image
              key={index}
              src={imagePath}
              alt={`platform-${index}`}
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl"
            />
          ))
        ) : (
          // 플랫폼 정보가 없을 때 기본 이미지들 표시
          <>
            <Image
              src="/assets/images/netflix.png"
              alt="netflix"
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl"
            />
            <Image
              src="/assets/images/disney-plus.svg"
              alt="disney+"
              width={56}
              height={40}
              className="w-14 h-14 rounded-xl"
            />
          </>
        )}
      </div>
      <div
        className="flex gap-2 h-16 items-center px-4 py-2 justify-center rounded-xl relative"
        style={{ backgroundColor: "rgb(22, 18, 20)" }}
      >
        <button
          className="bg-[#31343c] rounded-lg p-2 hover:bg-[#444857] cursor-pointer"
          onClick={handleCalendarToggle}
        >
          <FaCalendarAlt size={24} color="#fff" />
        </button>
        <button
          className="bg-[#31343c] rounded-lg p-2 hover:bg-[#444857] cursor-pointer disabled:opacity-50"
          onClick={toggleBookmark}
          disabled={isLoading}
        >
          {isBookmarked ? (
            <FaBookmark size={24} color="#56EBE1" />
          ) : (
            <FaRegBookmark size={24} color="#fff" />
          )}
        </button>

        <MovieHeaderCalendar
          isOpen={isCalendarOpen}
          onDateSelect={handleDateSelect}
          movieId={movieId}
          savedDate={savedDate}
          onSavedDateChange={setSavedDate}
        />
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={3000}
      />
    </>
  );
};

export default MovieHeader;
