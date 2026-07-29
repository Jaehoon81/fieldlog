// [파일 역할] Open-Meteo HTTP 요청과 TanStack Query 캐시를 한곳에서 연결합니다.
// [FLOW-03 / 관련 코드] 좌표를 Query·Axios·Zod로 연결해 검증된 WeatherSnapshot을 돌려줍니다.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios, { isAxiosError, isCancel } from "axios";

import { parseWeatherResponse } from "@/src/schemas/weather";
import type { WeatherSnapshot } from "@/src/types/weather";

// [이유] URL과 캐시 정책을 상수로 빼면 요청 절차와 조정 가능한 값을 구분해서 읽을 수 있습니다.
const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
// [문법] 숫자의 `_`는 가독성용 구분자입니다. 5 * 60 * 1000은 300000ms, 즉 5분입니다.
const WEATHER_STALE_TIME_MS = 5 * 60 * 1000;

// [문법] `type`은 런타임 객체를 만들지 않고 TypeScript 검사에만 쓰이는 객체 모양입니다.
type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

// [문법] 교차 타입 `A & B`는 A의 필드와 B의 필드를 모두 가져야 한다는 뜻입니다.
type FetchWeatherOptions = WeatherCoordinates & {
  // [라이브러리] AbortSignal은 Query가 취소될 때 진행 중인 Axios 요청도 중단시키는 표준 신호입니다.
  // `?`는 호출자가 이 속성을 생략할 수 있다는 선택적 속성 표시입니다.
  signal?: AbortSignal;
};

// [라이브러리] TanStack Query는 queryKey가 같은 요청을 같은 캐시 항목으로 취급합니다.
export const weatherKeys = {
  // [FLOW-03 / 관련 코드] 좌표를 키에 넣어 서로 다른 위치의 날씨가 한 캐시에 섞이지 않게 합니다.
  current: (coordinates: WeatherCoordinates | null) =>
    [
      "weather",
      "current",
      // [문법] `?.`는 null이면 속성 접근을 멈추고, `?? null`은 그 결과를 명시적인 null로 통일합니다.
      coordinates?.latitude ?? null,
      coordinates?.longitude ?? null,
      // [문법] `as const`는 일반 배열이 아닌 원소 값을 보존하는 읽기 전용 튜플로 추론시킵니다.
    ] as const,
};

// [FLOW-03 / 관련 코드] 실제 네트워크 I/O만 맡겨 Hook과 독립적으로 테스트할 수 있게 한 함수입니다.
export async function fetchWeather({
  latitude,
  longitude,
  signal,
}: FetchWeatherOptions): Promise<WeatherSnapshot> {
  // [문법] async 함수는 Promise를 반환하며, await는 이 함수 안에서 Promise 완료를 기다립니다.
  // [라이브러리] `<unknown>`은 외부 응답을 아직 신뢰하지 않는다는 타입 안전 경계입니다.
  // [FLOW-03 / 9단계] Axios가 좌표와 취소 신호를 포함한 Open-Meteo 요청을 보냅니다.
  const response = await axios.get<unknown>(WEATHER_ENDPOINT, {
    // params 객체는 Axios가 URL query string으로 직렬화합니다.
    params: {
      latitude,
      longitude,
      current: "temperature_2m,apparent_temperature,weather_code",
      temperature_unit: "celsius",
      timezone: "GMT",
    },
    // React Query의 취소 신호와 10초 제한을 HTTP 요청에 전달합니다.
    signal,
    timeout: 10_000,
  });

  // [FLOW-03 / 관련 코드] 외부 JSON은 Zod 스키마를 통과한 뒤에만 앱의 WeatherSnapshot이 됩니다.
  return parseWeatherResponse(response.data);
}

// [이유] 재시도 규칙을 순수 함수로 분리하면 네트워크 없이 오류 분기만 단위 테스트할 수 있습니다.
export function shouldRetryWeatherRequest(
  failureCount: number,
  error: Error,
): boolean {
  // 두 번째 실패부터 또는 Axios가 만든 오류가 아니면 재시도하지 않습니다.
  if (failureCount >= 1 || !isAxiosError(error)) {
    return false;
  }

  // 사용자가 화면을 떠나 취소된 요청은 장애가 아니므로 다시 요청하지 않습니다.
  if (isCancel(error) || error.code === "ERR_CANCELED") {
    return false;
  }

  // 서버 응답이 있다면 일시적 서버 오류(HTTP 5xx)만 한 번 재시도합니다.
  if (error.response) {
    return error.response.status >= 500;
  }

  // Boolean(value)는 값의 존재 여부를 true/false로 바꿉니다. 응답 없는 네트워크 실패만 재시도합니다.
  return Boolean(error.request);
}

// [FLOW-03 / 관련 코드] 화면은 Axios 세부사항 대신 이 Hook에 좌표만 전달합니다.
export function useWeatherQuery(
  coordinates: WeatherCoordinates | null,
): UseQueryResult<WeatherSnapshot, Error> {
  // [라이브러리] useQuery는 로딩·성공 데이터·오류·취소·재시도를 하나의 상태 객체로 관리합니다.
  return useQuery({
    queryKey: weatherKeys.current(coordinates),
    // 좌표가 없으면 queryFn 자체를 실행하지 않아 잘못된 API 요청을 막습니다.
    enabled: coordinates !== null,
    // [문법] 매개변수 객체에서 signal만 구조 분해하고, 함수는 현재 coordinates를 클로저로 기억합니다.
    queryFn: ({ signal }) => {
      // [주의] enabled가 보통 이 실행을 막지만, 타입 좁히기와 방어를 위해 null 분기를 둡니다.
      if (coordinates === null) {
        throw new Error("날씨를 조회할 좌표가 없습니다.");
      }

      // `{ ...coordinates, signal }`은 좌표 필드를 펼치고 signal을 추가한 새 객체입니다.
      // [FLOW-03 / 8단계] Query가 좌표와 AbortSignal을 실제 요청 함수에 전달합니다.
      return fetchWeather({ ...coordinates, signal });
    },
    // 같은 좌표의 성공 데이터는 5분 동안 신선한 값으로 취급합니다.
    staleTime: WEATHER_STALE_TIME_MS,
    retry: shouldRetryWeatherRequest,
  });
}
