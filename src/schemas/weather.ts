import { z } from "zod";

import type { WeatherSnapshot } from "@/src/types/weather";

const openMeteoUtcTimeSchema = z.string().refine(
  (value) => {
    const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? value
      : `${value}Z`;

    return !Number.isNaN(Date.parse(normalizedValue));
  },
  { message: "Open-Meteo 응답 시각이 올바르지 않습니다." },
);

export const openMeteoResponseSchema = z.object({
  current: z.object({
    time: openMeteoUtcTimeSchema,
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
    weather_code: z.number().int(),
  }),
});

function parseOpenMeteoUtcTime(value: string): number {
  const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? value
    : `${value}Z`;

  return Date.parse(normalizedValue);
}

export function parseWeatherResponse(input: unknown): WeatherSnapshot {
  const response = openMeteoResponseSchema.parse(input);

  return {
    temperatureC: response.current.temperature_2m,
    apparentTemperatureC: response.current.apparent_temperature,
    weatherCode: response.current.weather_code,
    observedAt: parseOpenMeteoUtcTime(response.current.time),
  };
}
