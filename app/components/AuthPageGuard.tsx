"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserStore } from "../stores/userStore";
import { isAuthForbiddenPage, isAuthRequiredPage } from "@/utils/authUtils";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthPageGuard({ children }: AuthGuardProps) {
  const { user, login } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  //localStorage에서 사용자 정보 복원
  useEffect(() => {
    const initializeUser = () => {
      if (typeof window !== "undefined") {
        const storage = localStorage.getItem("user-storage");

        if (storage) {
          try {
            const parsed = JSON.parse(storage);
            const storedUser = parsed?.state?.user;

            if (storedUser) {
              login(storedUser);
            }
          } catch {
            // 유저 정보 복원 중 오류 발생
          }
        }

        setIsInitialized(true);
      }
    };

    initializeUser();
  }, [login]);

  // 초기화 완료 후 인증 체크
  useEffect(() => {
    // 초기화가 완료되지 않았으면 대기
    if (!isInitialized) return;

    const isAuthRequired = isAuthRequiredPage(pathname);
    const isAuthForbidden = isAuthForbiddenPage(pathname);

    // 조건별 상세 로그
    if (isAuthRequired && !user) {
      router.push("/auth/signin");
    } else if (isAuthForbidden && user) {
      router.push("/");
    }
  }, [user, pathname, router, isInitialized]);

  // TODO: 데이터 초기화 중일 때 로딩 ui 고려해야됨
  // if (!isInitialized) {
  //   return (
  //     <div className="min-h-screen bg-[#1] flex items-center justify-center">
  //       <div className="text-white">로딩 중...</div>
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
