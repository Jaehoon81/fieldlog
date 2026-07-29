/**
 * [파일 역할]
 * 외부 Open-Meteo payload를 신뢰 가능한 FieldLog `WeatherSnapshot`으로 바꾸는
 * runtime 경계다. Axios response의 `data`는 `unknown`으로 받아 이 schema를
 * 통과한 값만 앱 내부로 들인다.
 */

import { z } from "zod";

import type { WeatherSnapshot } from "@/src/types/weather";

/**
 * Open-Meteo를 `timezone=GMT`로 호출해도 `current.time`에 `Z`가 생략될 수 있다.
 * 이 schema는 timezone suffix를 보정한 값이 실제로 parse 가능한 시각인지
 * 확인한다.
 */
const openMeteoUtcTimeSchema = z.string().refine(
  (value) => {
    // [문법] 정규식은 `Z` 또는 `+09:00` 같은 UTC offset으로 끝나는지 검사한다.
    const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? value
      // [문법] template literal로 suffix가 없는 시각에 `Z`를 붙인다.
      : `${value}Z`;

    // `Date.parse` 실패는 NaN이므로 그 반대만 유효한 값으로 인정한다.
    return !Number.isNaN(Date.parse(normalizedValue));
  },
  { message: "Open-Meteo 응답 시각이 올바르지 않습니다." },
);

// [FLOW-03 / 관련 코드] 외부 snake_case wire shape를 정확히 검증한다.
export const openMeteoResponseSchema = z.object({
  current: z.object({
    time: openMeteoUtcTimeSchema,
    // `finite()`는 Infinity와 NaN까지 거부한다.
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
    // 날씨 code는 소수가 아닌 integer여야 한다.
    weather_code: z.number().int(),
  }),
});

// 검증 때와 같은 UTC 정규화 규칙으로 문자열을 epoch millisecond로 변환한다.
function parseOpenMeteoUtcTime(value: string): number {
  const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? value
    : `${value}Z`;

  return Date.parse(normalizedValue);
}

/**
 * [FLOW-03 / 10단계]
 * `input: unknown`은 caller가 어떤 값도 넘길 수 있지만, 함수 내부에서는 Zod
 * parse 전까지 property에 접근할 수 없게 한다. parse 실패는 예외가 되어
 * TanStack Query의 error 상태로 전달된다.
 */
export function parseWeatherResponse(input: unknown): WeatherSnapshot {
  const response = openMeteoResponseSchema.parse(input);

  // 외부 snake_case 이름을 앱 전체가 쓰는 camelCase domain 이름으로 바꾼다.
  return {
    temperatureC: response.current.temperature_2m,
    apparentTemperatureC: response.current.apparent_temperature,
    weatherCode: response.current.weather_code,
    observedAt: parseOpenMeteoUtcTime(response.current.time),
  };
}
