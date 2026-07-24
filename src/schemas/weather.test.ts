import { parseWeatherResponse } from "@/src/schemas/weather";

describe("parseWeatherResponse", () => {
  it("Open-Meteo GMT 응답을 내부 snapshot으로 변환한다", () => {
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

  it.each([
    ["잘못된 시각", "not-a-date", 20, 20, 0],
    ["문자열 기온", "2026-07-20T03:15", "20", 20, 0],
    ["실수가 아닌 날씨 코드", "2026-07-20T03:15", 20, 20, 1.5],
  ])("%s을 거부한다", (_, time, temperature, apparent, code) => {
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
