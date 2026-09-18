"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const redirectedRef = useRef(false);

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
    if (!isInitialized) return;

    const isAuthRequired = isAuthRequiredPage(pathname);
    const isAuthForbidden = isAuthForbiddenPage(pathname);

    if (isAuthRequired && !user) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/auth/signin");
      }
      return;
    }

    if (isAuthForbidden && user) {
      router.replace("/");
      return;
    }

    redirectedRef.current = false;
  }, [user, pathname, router, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  const isAuthRequired = isAuthRequiredPage(pathname);
  const isAuthForbidden = isAuthForbiddenPage(pathname);

  if (isAuthRequired && !user) {
    return null;
  }

  if (isAuthForbidden && user) {
    return null;
  }

  return <>{children}</>;
}
