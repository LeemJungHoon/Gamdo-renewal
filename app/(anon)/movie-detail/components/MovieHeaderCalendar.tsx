"use client";

import { useEffect } from "react";
import axios from "@/utils/axios";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

interface MovieHeaderCalendarProps {
  isOpen: boolean;
  onDateSelect?: (date: Date) => void;
  movieId?: string;
  savedDate?: Date;
  onSavedDateChange?: (date: Date | undefined) => void;
}

export default function MovieHeaderCalendar({
  isOpen,
  onDateSelect,
  movieId,
  savedDate,
  onSavedDateChange,
}: MovieHeaderCalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  // 캘린더가 열릴 때 해당 영화의 저장된 날짜 가져오기
  useEffect(() => {
    if (isOpen && movieId) {
      fetchSavedDate(movieId);
    }
  }, [isOpen, movieId]);

  const fetchSavedDate = async (movieId: string) => {
    try {
      const response = await axios.get(`/movies/calenders?movieId=${movieId}`);

      // 저장된 날짜가 있으면 해당 날짜를 설정
      if (response.data && response.data.length > 0) {
        const savedDateObj = new Date(response.data[0].date);
        onSavedDateChange?.(savedDateObj);
      } else {
        onSavedDateChange?.(undefined);
      }
    } catch {
      onSavedDateChange?.(undefined);
    }
  };

  const handleDateChange = async (date: Date | undefined) => {
    if (date) {
      // UTC 시간으로 날짜 생성하여 타임존 문제 완전 해결
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-based
      const day = date.getDate();

      // UTC 시간으로 Date 객체 생성 (로컬 시간대 무시)
      const utcDate = new Date(Date.UTC(year, month, day));

      // 이미 선택된 날짜를 다시 클릭했는지 확인
      const isSameDate =
        savedDate &&
        savedDate.getFullYear() === utcDate.getFullYear() &&
        savedDate.getMonth() === utcDate.getMonth() &&
        savedDate.getDate() === utcDate.getDate();

      if (isSameDate) {
        // 이미 선택된 날짜를 클릭하면 선택 해제
        try {
          // 영화 삭제 API 호출
          await axios.delete("/saves", {
            data: { movieId: movieId },
          });

          onSavedDateChange?.(undefined);

          if (onDateSelect) {
            onDateSelect(utcDate);
          }
        } catch {
          // 에러 발생 시 선택 상태 유지
        }
      } else {
        // 새로운 날짜 선택
        onSavedDateChange?.(utcDate);
        if (onDateSelect) {
          onDateSelect(utcDate);
        }
      }
    } else {
      // 저장된 날짜가 있을 때만 삭제 API 호출
      if (savedDate && movieId) {
        try {
          // 영화 삭제 API 호출
          await axios.delete("/saves", {
            data: { movieId: movieId },
          });
        } catch {
          // 에러 처리
        }
      }

      onSavedDateChange?.(undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-0 z-1 mt-2">
      <DayPicker
        mode="single"
        selected={savedDate}
        onSelect={handleDateChange}
        modifiers={{
          saved: savedDate ? [savedDate] : [],
        }}
        modifiersStyles={{
          saved: {
            backgroundColor: "#56ebe1",
            color: "black",
            fontWeight: "bold",
            borderRadius: "2rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
        classNames={{
          selected: ``,
          root: `${defaultClassNames.root} shadow-lg bg-slate-500 rounded-lg p-5`,
          chevron: `${defaultClassNames.chevron} fill-cyan-300`,
          day: `${defaultClassNames.day} p-2`,
        }}
      />
    </div>
  );
}
