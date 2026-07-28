// [파일 역할] 신뢰할 수 없는 Open-Meteo JSON을 내부 WeatherSnapshot으로 바꾸는 경계를 검증합니다.
// [검증 경계] 실제 HTTP 요청은 하지 않고 response parsing과 거부 규칙만 확인합니다.
import { parseWeatherResponse } from "@/src/schemas/weather";

describe("parseWeatherResponse", () => {
  it("Open-Meteo GMT 응답을 내부 snapshot으로 변환한다", () => {
    // snake_case 응답과 분 단위 GMT 문자열이 camelCase와 epoch millisecond로 변환되는지 전체 비교합니다.
    expect(
      parseWeatherResponse({
        current: {
          time: "2026-07-20T03:15",
          temperature_2m: 24.5,
          apparent_temperature: 25.1,
          weather_code: 2,
        },
      }),
    ).toEqual({
      temperatureC: 24.5,
      apparentTemperatureC: 25.1,
      weatherCode: 2,
      observedAt: Date.parse("2026-07-20T03:15Z"),
    });
  });

  // 잘못된 날짜, 숫자 대신 문자열, 정수가 아닌 code를 각각 같은 schema 경계에서 거부해야 합니다.
  it.each([
    ["잘못된 시각", "not-a-date", 20, 20, 0],
    ["문자열 기온", "2026-07-20T03:15", "20", 20, 0],
    ["실수가 아닌 날씨 코드", "2026-07-20T03:15", 20, 20, 1.5],
  ])("%s을 거부한다", (_, time, temperature, apparent, code) => {
    // toThrow는 parse 함수가 invalid external data를 조용히 통과시키지 않는지 확인합니다.
    expect(() =>
      parseWeatherResponse({
        current: {
          time,
          temperature_2m: temperature,
          apparent_temperature: apparent,
          weather_code: code,
        },
      }),
    ).toThrow();
  });
});
