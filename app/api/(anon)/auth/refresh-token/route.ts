import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  createAccessToken,
} from "@/backend/common/auth/jwt";
import { setAccessTokenCookie } from "@/backend/common/auth/cookies";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "리프레시 토큰 없음" }, { status: 403 });
  }

  try {
    const payload = verifyRefreshToken(refreshToken) as {
      userId: string;
      exp?: number;
      iat?: number;
    };

    // 새 액세스 토큰 발급
    const newAccessToken = createAccessToken({ userId: payload.userId });

    // 새 액세스 토큰을 쿠키에 설정 (httpOnly로 보안 유지)
    const response = NextResponse.json({ success: true }, { status: 200 });
    setAccessTokenCookie(response, newAccessToken);

    return response;
  } catch (error) {
    // JWT 에러 타입별 상세 분석
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        // 토큰 만료
      } else if (error.name === "JsonWebTokenError") {
        // JWT 형식 오류
      } else if (error.name === "NotBeforeError") {
        // 토큰이 유효하지 않음
      }
    }

    return NextResponse.json(
      { error: "리프레시 토큰 만료 또는 변조" },
      { status: 403 },
    );
  }
}
