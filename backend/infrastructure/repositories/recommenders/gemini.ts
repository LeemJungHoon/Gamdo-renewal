import { GeminiRepository } from "../../../domain/repositories/recommenders/gemini";
import {
  GeminiRequest,
  GeminiResponse,
  GeminiApiRequest,
} from "../../../domain/entities/recommenders/gemini";
import { GeminiApi } from "../../../../utils/supabase/gemini/GeminiApi";

// Gemini 레포지토리 구현체
export class GeminiRepositoryImpl implements GeminiRepository {
  private geminiApi: GeminiApi;

  constructor() {
    this.geminiApi = new GeminiApi();
  }

  /**
   * Gemini 모델에 프롬프트를 전송하고 응답을 받아옵니다
   * @param request Gemini 생성 요청 파라미터
   * @returns Gemini 생성 결과
   */
  async generateText(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      // API 설정 확인
      if (!this.geminiApi.isConfigured()) {
        return {
          success: false,
          error: "Gemini API 설정이 올바르지 않습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      // 도메인 요청을 Gemini API 요청으로 변환
      const geminiRequest: GeminiApiRequest = {
        contents: [
          {
            parts: [
              {
                text: request.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature:
            request.temperature ?? (request.structuredOutput ? 0.2 : 0.7),
          maxOutputTokens:
            request.max_tokens ?? (request.structuredOutput ? 1024 : 1000),
          ...(request.structuredOutput
            ? {
                responseMimeType: "application/json" as const,
                responseSchema: {
                  type: "OBJECT" as const,
                  properties: {
                    movies: {
                      type: "ARRAY" as const,
                      minItems: 10,
                      maxItems: 10,
                      items: {
                        type: "OBJECT" as const,
                        properties: {
                          koreanTitle: { type: "STRING" as const },
                          englishTitle: { type: "STRING" as const },
                        },
                        required: ["koreanTitle", "englishTitle"],
                      },
                    },
                  },
                  required: ["movies"],
                },
                thinkingConfig: { thinkingLevel: "MINIMAL" as const },
              }
            : {}),
        },
      };

      // Gemini API 호출
      const geminiStartedAt = performance.now();
      let geminiResponse = await this.geminiApi.generateContent(geminiRequest);

      this.logTokenUsage(geminiResponse, performance.now() - geminiStartedAt);

      if (
        geminiResponse.candidates?.[0]?.finishReason === "MAX_TOKENS" &&
        request.structuredOutput &&
        (request.max_tokens ?? 1024) < 1024
      ) {
        geminiRequest.generationConfig!.maxOutputTokens = 1024;
        const retryStartedAt = performance.now();
        geminiResponse = await this.geminiApi.generateContent(geminiRequest);
        this.logTokenUsage(geminiResponse, performance.now() - retryStartedAt);
      }

      // 응답 유효성 검사
      if (
        !geminiResponse.candidates ||
        geminiResponse.candidates.length === 0
      ) {
        return {
          success: false,
          error: "Gemini 모델로부터 응답을 받을 수 없습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      const candidate = geminiResponse.candidates[0];

      // finishReason 확인 - thinking 모드에서 MAX_TOKENS로 잘릴 수 있음
      if (candidate.finishReason === "MAX_TOKENS") {
        console.error("Gemini MAX_TOKENS 제한으로 추천 생성 실패", {
          finishReason: candidate.finishReason,
          ...this.getTokenUsage(geminiResponse),
        });
        return {
          success: false,
          error: "Gemini 응답이 MAX_TOKENS 제한으로 잘렸습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      // Gemini 2.5 thinking 모드 대응: parts가 없는 경우 처리
      let generatedText = "";

      if (
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        // 일반적인 응답 구조
        generatedText = candidate.content.parts[0].text;
      } else if (candidate.text) {
        // 일부 Gemini 버전에서 직접 text 필드 사용
        generatedText = candidate.text;
      } else {
        return {
          success: false,
          error: "Gemini 모델 응답에서 텍스트를 찾을 수 없습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      // 응답 데이터 추출
      const tokensUsed = geminiResponse.usageMetadata?.totalTokenCount ?? 0;

      return {
        success: true,
        data: {
          text: generatedText,
          tokens_used: tokensUsed,
          model: "gemini-3.6-flash",
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gemini 생성 중 오류가 발생했습니다.",
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getTokenUsage(response: {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      totalTokenCount?: number;
    };
    candidates?: { finishReason?: string }[];
  }) {
    return {
      promptTokenCount: response.usageMetadata?.promptTokenCount ?? 0,
      candidatesTokenCount: response.usageMetadata?.candidatesTokenCount ?? 0,
      thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount ?? 0,
      totalTokenCount: response.usageMetadata?.totalTokenCount ?? 0,
    };
  }

  private logTokenUsage(
    response: {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
        totalTokenCount?: number;
      };
      candidates?: { finishReason?: string }[];
    },
    durationMs: number,
  ) {
    console.info("Gemini 토큰 사용량", {
      durationMs: Math.round(durationMs),
      finishReason: response.candidates?.[0]?.finishReason ?? "UNKNOWN",
      ...this.getTokenUsage(response),
    });
  }
}
