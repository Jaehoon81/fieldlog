/**
 * [파일 역할]
 * 날씨와 온도 표시에서 여러 계층이 함께 쓰는 TypeScript 계약을 정의한다.
 * Open-Meteo 응답은 `src/schemas/weather.ts`에서 `WeatherSnapshot`으로
 * 정규화되고, 화면은 `convertTemperature`로 표시 단위만 바꾼다.
 *
 * [주의]
 * database와 `WeatherSnapshot`의 원본 온도는 항상 섭씨다. 화씨 선택은
 * 저장값을 바꾸는 설정이 아니라 화면에 표시하는 계산 규칙이다.
 */

// [문법] 문자열 literal union은 임의의 string이 아니라 두 값만 허용한다.
export type TemperatureUnit = "celsius" | "fahrenheit";

// [문법] `type`의 각 property는 날씨 snapshot이 반드시 가져야 하는 shape다.
export type WeatherSnapshot = {
  // Open-Meteo에서 받은 원본 섭씨 기온이다.
  temperatureC: number;
  // 체감 온도 역시 섭씨로 보관한다.
  apparentTemperatureC: number;
  // WMO weather code이며 화면에서는 현재 숫자 그대로 표시한다.
  weatherCode: number;
  // [문법] JavaScript timestamp는 1970-01-01부터 지난 millisecond 수다.
  observedAt: number;
};

/**
 * [FLOW-06 / 5단계]
 * 저장된 섭씨 값을 사용자가 선택한 단위로 바꿔 화면에 돌려준다.
 *
 * [문법]
 * `: number`는 반환 type annotation이다. 삼항 연산자
 * `조건 ? 참일 때 : 거짓일 때`로 두 계산 중 하나를 선택한다.
 */
export function convertTemperature(
  temperatureC: number,
  unit: TemperatureUnit,
): number {
  // 섭씨면 원본을 유지하고, 화씨면 F = C × 9/5 + 32 공식을 적용한다.
  return unit === "celsius" ? temperatureC : (temperatureC * 9) / 5 + 32;
}
