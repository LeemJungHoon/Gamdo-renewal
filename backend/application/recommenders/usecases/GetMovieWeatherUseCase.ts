import { WeatherRepository } from "../../../domain/repositories/recommenders/weather";
import {
  WeatherRequest,
  WeatherResponse,
  ParsedWeatherResponse,
  WeatherData,
  WeatherItem,
  ParsedWeatherInfo,
} from "../../../domain/entities/recommenders/weather";
import {
  GetMovieWeatherRequestDto,
  GetMovieWeatherResponseDto,
  WeatherApiResponseDto,
} from "../dtos/GetMovieWeatherDto";

/**
 * 영화 추천용 날씨 정보 UseCase
 * 기상청 API를 사용하여 현재 날씨 정보를 가져오고 파싱합니다
 */
export class GetMovieWeatherUseCase {
  private weatherRepository: WeatherRepository;

  constructor(weatherRepository: WeatherRepository) {
    this.weatherRepository = weatherRepository;
  }

  /**
   * 파싱된 날씨 정보 요청 처리 (메인 메서드)
   * @param request 날씨 정보 요청 DTO
   * @returns 파싱된 날씨 정보 응답 DTO
   */
  async execute(
    request: GetMovieWeatherRequestDto,
  ): Promise<GetMovieWeatherResponseDto> {
    try {
      // 원시 날씨 데이터 조회
      const rawWeatherResponse = await this.getCurrentWeather(
        request.nx,
        request.ny,
      );

      if (!rawWeatherResponse.success || !rawWeatherResponse.data) {
        return {
          success: false,
          error: rawWeatherResponse.error || "날씨 정보를 가져올 수 없습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      // 날씨 데이터 파싱
      const parsedResponse = this.parseWeatherData(rawWeatherResponse.data);

      if (!parsedResponse.success || !parsedResponse.data) {
        return {
          success: false,
          error: parsedResponse.error || "날씨 정보 파싱에 실패했습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: parsedResponse.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "날씨 정보 처리 중 오류가 발생했습니다.";

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * API 응답 형태로 변환 (프론트엔드용)
   * @param request 날씨 정보 요청 DTO
   * @returns 날씨 API 응답 DTO
   */
  async getWeatherApiResponse(
    request: GetMovieWeatherRequestDto,
  ): Promise<WeatherApiResponseDto> {
    const result = await this.execute(request);

    return {
      success: result.success,
      weatherInfo: result.data,
      error: result.error,
      timestamp: result.timestamp,
      message: result.success ? "파싱된 날씨 정보입니다" : undefined,
    };
  }

  /**
   * 현재 날씨 정보를 조회합니다 (내부용 - 원시 데이터)
   * @param nx X좌표
   * @param ny Y좌표
   * @returns 날씨 데이터 조회 결과
   */
  private async getCurrentWeather(
    nx: number,
    ny: number,
  ): Promise<WeatherResponse> {
    try {
      // 현재 날짜와 시간 계산
      const weatherRequest = this.createWeatherRequest(nx, ny);

      // 리포지토리를 통해 날씨 데이터 조회
      const result =
        await this.weatherRepository.getWeatherData(weatherRequest);

      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "날씨 정보 조회 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 현재 날짜와 시간을 기준으로 날씨 조회 요청을 생성합니다
   * @param nx X좌표
   * @param ny Y좌표
   * @returns 날씨 조회 요청 객체
   */
  private createWeatherRequest(nx: number, ny: number): WeatherRequest {
    const now = new Date();

    // 현재 시간에서 1시간 전 시간 계산 (기상청 API 지연 고려)
    const targetTime = new Date(now.getTime() - 60 * 60 * 1000);

    // 기상청 API 날짜 형식으로 변환 (YYYYMMDD)
    const year = targetTime.getFullYear();
    const month = String(targetTime.getMonth() + 1).padStart(2, "0");
    const day = String(targetTime.getDate()).padStart(2, "0");
    const baseDate = `${year}${month}${day}`;

    // 정시 기준으로 가장 가까운 시간 계산 (기상청 API는 정시 데이터만 제공)
    const baseTime = this.calculateBaseTime(targetTime);

    return {
      baseDate,
      baseTime,
      nx,
      ny,
    };
  }

  /**
   * 정시 기준으로 가장 가까운 시간을 계산합니다
   * @param targetTime 목표 시간
   * @returns 정시 기준 시간 (HHMM 형식)
   */
  private calculateBaseTime(targetTime: Date): string {
    const hour = targetTime.getHours();

    // 기상청 실황 API는 정시 데이터만 제공하므로 정시로 맞춤
    const baseHour = hour;
    const baseMinute = 0;

    // 시간과 분 형식 맞추기 (HHMM)
    const baseTime = `${baseHour.toString().padStart(2, "0")}${baseMinute
      .toString()
      .padStart(2, "0")}`;

    return baseTime;
  }

  /**
   * 원시 날씨 데이터를 파싱합니다
   * @param weatherData 원시 날씨 데이터
   * @returns 파싱된 날씨 정보
   */
  private parseWeatherData(weatherData: WeatherData): ParsedWeatherResponse {
    try {
      if (!weatherData.response?.body?.items?.item) {
        return {
          success: false,
          error: "날씨 데이터 구조가 올바르지 않습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      const items = weatherData.response.body.items.item;

      // 첫 번째 아이템이 없으면 오류
      if (!items || items.length === 0) {
        return {
          success: false,
          error: "날씨 데이터가 비어있습니다.",
          timestamp: new Date().toISOString(),
        };
      }

      // 카테고리별 날씨 데이터 분류
      const weatherMap = this.categorizeWeatherData(items);
      const firstItem = items[0];

      // 파싱된 날씨 정보 생성
      const parsedWeatherInfo = this.createParsedWeatherInfo(
        weatherMap,
        firstItem,
      );

      return {
        success: true,
        data: parsedWeatherInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "날씨 데이터 파싱 중 오류가 발생했습니다.";

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 날씨 데이터를 카테고리별로 분류합니다
   * @param items 날씨 데이터 항목 배열
   * @returns 카테고리별 날씨 데이터 맵
   */
  private categorizeWeatherData(items: WeatherItem[]): Map<string, string> {
    const weatherMap = new Map<string, string>();

    items.forEach((item) => {
      // 기상청 실황 API는 obsrValue를 사용 (예보 API는 fcstValue 사용)
      const value = item.obsrValue || item.fcstValue;

      if (item.category && value) {
        weatherMap.set(item.category, value);
      }
    });

    return weatherMap;
  }

  /**
   * 분류된 날씨 데이터로 파싱된 날씨 정보를 생성합니다
   * @param weatherMap 카테고리별 날씨 데이터
   * @param firstItem 첫 번째 날씨 데이터 항목 (메타정보용)
   * @returns 파싱된 날씨 정보
   */
  private createParsedWeatherInfo(
    weatherMap: Map<string, string>,
    firstItem: WeatherItem,
  ): ParsedWeatherInfo {
    // 하늘 상태 파싱 (SKY) - 실황 API에서는 제공되지 않을 수 있음
    const skyCondition = this.parseSkyCondition(weatherMap.get("SKY"));

    // 강수 형태 파싱 (PTY)
    const precipitationType = this.parsePrecipitationType(
      weatherMap.get("PTY"),
    );

    // 실황 API에서는 SKY가 없으므로 강수 형태를 기반으로 날씨 설명 생성
    const weatherDescription = this.generateWeatherDescriptionFromObservation(
      skyCondition,
      precipitationType,
      weatherMap,
    );

    // 온도 정보 파싱 (T1H - 기온)
    const currentTemp = this.parseTemperature(weatherMap.get("T1H"));

    // 실황 API에서는 최고/최저온도 정보가 없음
    const maxTemp = null;
    const minTemp = null;

    // 기타 정보 파싱
    const humidity = this.parseHumidity(weatherMap.get("REH")); // 습도
    const precipitation = this.parsePrecipitation(weatherMap.get("RN1")); // 1시간 강수량
    const windSpeed = this.parseWindSpeed(weatherMap.get("WSD")); // 풍속 (실황에서 제공됨)

    // 체감온도 계산
    const feelsLikeTemp = this.calculateFeelsLikeTemp(
      currentTemp,
      humidity,
      windSpeed,
    );

    const parsedInfo = {
      skyCondition,
      precipitationType,
      weatherDescription,
      currentTemp,
      maxTemp,
      minTemp,
      feelsLikeTemp,
      humidity,
      precipitation,
      windSpeed,
      forecastTime: `${firstItem.baseDate} ${firstItem.baseTime}`,
      location: {
        nx: firstItem.nx,
        ny: firstItem.ny,
      },
    };

    return parsedInfo;
  }

  /**
   * 실황 데이터를 기반으로 날씨 설명을 생성합니다
   * @param skyCondition 하늘 상태
   * @param precipitationType 강수 형태
   * @param weatherMap 전체 날씨 데이터
   * @returns 통합된 날씨 설명
   */
  private generateWeatherDescriptionFromObservation(
    skyCondition: string,
    precipitationType: string,
    weatherMap: Map<string, string>,
  ): string {
    // 강수량 체크 (RN1 - 1시간 강수량)
    const rainAmount = weatherMap.get("RN1");
    const precipitationValue =
      rainAmount && rainAmount !== "0" && rainAmount !== "강수없음"
        ? parseFloat(rainAmount)
        : 0;

    // 습도 체크 (REH - 습도)
    const humidityStr = weatherMap.get("REH");
    const humidity = humidityStr ? parseFloat(humidityStr) : 0;

    // 강수량이 0초과면 "비옴"
    if (precipitationValue > 0) {
      return " 비";
    }

    // 습도가 80% 이상이면 "흐림"
    if (humidity >= 80) {
      return " 흐림";
    }

    // 그 외의 경우 "맑음"
    return " 맑음";
  }

  /**
   * 하늘 상태 코드를 문자열로 변환합니다
   * @param skyCode 하늘 상태 코드
   * @returns 하늘 상태 문자열
   */
  private parseSkyCondition(skyCode: string | undefined): string {
    if (!skyCode) return "정보 없음";

    const skyConditions: { [key: string]: string } = {
      "1": "맑음",
      "3": "구름많음",
      "4": "흐림",
    };

    return skyConditions[skyCode] || "정보 없음";
  }

  /**
   * 강수 형태 코드를 문자열로 변환합니다
   * @param ptyCode 강수 형태 코드
   * @returns 강수 형태 문자열
   */
  private parsePrecipitationType(ptyCode: string | undefined): string {
    if (!ptyCode || ptyCode === "0") return "없음";

    const precipitationTypes: { [key: string]: string } = {
      "1": "비",
      "2": "비/눈",
      "3": "눈",
      "4": "소나기",
    };

    return precipitationTypes[ptyCode] || "정보 없음";
  }

  /**
   * 1시간 강수량을 파싱합니다
   * @param precipitationStr 강수량 문자열
   * @returns 파싱된 강수량 문자열
   */
  private parsePrecipitation(precipitationStr: string | undefined): string {
    if (!precipitationStr) return "0mm";

    // "강수없음" 또는 "0" 처리
    if (
      precipitationStr === "강수없음" ||
      precipitationStr === "0" ||
      precipitationStr === "0.0"
    ) {
      return "0mm";
    }

    // 숫자 형태로 변환 후 mm 단위 추가
    const precipitation = parseFloat(precipitationStr);
    return isNaN(precipitation) ? "정보 없음" : `${precipitation}mm`;
  }

  /**
   * 날씨 설명을 생성합니다
   * @param skyCondition 하늘 상태
   * @param precipitationType 강수 형태
   * @returns 통합된 날씨 설명
   */
  private generateWeatherDescription(
    skyCondition: string,
    precipitationType: string,
  ): string {
    if (precipitationType !== "없음") {
      return precipitationType;
    }

    return skyCondition;
  }

  /**
   * 온도 문자열을 숫자로 변환합니다
   * @param tempStr 온도 문자열
   * @returns 온도 숫자 또는 null
   */
  private parseTemperature(tempStr: string | undefined): number | null {
    if (!tempStr) return null;

    const temp = parseFloat(tempStr);
    return isNaN(temp) ? null : temp;
  }

  /**
   * 습도 문자열을 숫자로 변환합니다
   * @param humidityStr 습도 문자열
   * @returns 습도 숫자 또는 null
   */
  private parseHumidity(humidityStr: string | undefined): number | null {
    if (!humidityStr) return null;

    const humidity = parseFloat(humidityStr);
    return isNaN(humidity) ? null : humidity;
  }

  /**
   * 풍속 문자열을 숫자로 변환합니다
   * @param windSpeedStr 풍속 문자열
   * @returns 풍속 숫자 또는 null
   */
  private parseWindSpeed(windSpeedStr: string | undefined): number | null {
    if (!windSpeedStr) return null;

    const windSpeed = parseFloat(windSpeedStr);
    return isNaN(windSpeed) ? null : windSpeed;
  }

  /**
   * 체감온도를 계산합니다
   * @param temp 기온
   * @param humidity 습도
   * @param windSpeed 풍속
   * @returns 체감온도 또는 null
   */
  private calculateFeelsLikeTemp(
    temp: number | null,
    humidity: number | null,
    windSpeed: number | null,
  ): number | null {
    if (temp === null) return null;

    // 풍속이 없거나 매우 낮으면 기온 그대로 반환
    if (!windSpeed || windSpeed < 1) {
      return temp;
    }

    // 간단한 체감온도 계산 (Wind Chill Formula 간소화)
    const windChillFactor = Math.pow(windSpeed, 0.16);
    const feelsLike = temp - windChillFactor * (temp - 35);

    return Math.round(feelsLike * 10) / 10; // 소수점 첫째 자리까지
  }
}
