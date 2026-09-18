import axios from "axios";
import { AUTH_REQUIRED_API_PATHS } from "@/app/constants";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 인증이 필요한 api 주소인지 확인 (HTTP 메서드별로 구분)
function isAuthRequired(url: string, method: string = "GET") {
  // 모든 HTTP 메서드에서 인증이 필요한 경로
  const isAuthRequiredForAll = AUTH_REQUIRED_API_PATHS.all.some((path) =>
    url.startsWith(path.replace("/api", "")),
  );

  // POST, PUT, DELETE에서만 인증이 필요한 경로 (GET은 인증 불필요)
  const isAuthRequiredForWrite = AUTH_REQUIRED_API_PATHS.write.some((path) =>
    url.startsWith(path.replace("/api", "")),
  );

  const isGetRequest = method.toUpperCase() === "GET";

  return isAuthRequiredForAll || (isAuthRequiredForWrite && !isGetRequest);
}

// 전역 상태 초기화를 위한 함수 (클라이언트 사이드에서만 실행)
async function handleAuthFailure() {
  if (typeof window !== "undefined") {
    try {
      await instance.post("/auth/logout");
    } catch {
      // 로그아웃 API 호출 실패
    }

    localStorage.removeItem("user-storage");

    try {
      const { useUserStore } = await import("@/app/stores/userStore");
      useUserStore.getState().logout();
    } catch {
      // Zustand 상태 초기화 실패
    }
  }
}

let hasShownLoginRequiredPrompt = false;

function showLoginRequiredPrompt() {
  if (typeof window === "undefined" || hasShownLoginRequiredPrompt) {
    return false;
  }

  hasShownLoginRequiredPrompt = true;

  const shouldRedirect = window.confirm("로그인 후 이용해주세요.");

  if (shouldRedirect) {
    window.location.href = "/auth/signin";
  }

  return shouldRedirect;
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 인증이 필요한 경로에만 인터셉터 동작
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      isAuthRequired(originalRequest.url, originalRequest.method)
    ) {
      originalRequest._retry = true;
      try {
        await instance.post("/auth/refresh-token");

        return instance(originalRequest);
      } catch (refreshError) {
        await handleAuthFailure();
        return Promise.reject(refreshError);
      }
    }

    if (
      error.response &&
      error.response.status === 403 &&
      (isAuthRequired(originalRequest.url, originalRequest.method) ||
        originalRequest.url?.includes("/auth/refresh-token"))
    ) {
      const shouldRedirect = showLoginRequiredPrompt();

      if (shouldRedirect) {
        await handleAuthFailure();
      }

      return Promise.reject(
        Object.assign(new Error("LOGIN_REQUIRED"), {
          response: error.response,
          config: originalRequest,
          __loginRequired: true,
        }),
      );
    }

    return Promise.reject(error);
  },
);

export default instance;
