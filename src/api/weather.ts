import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios, { isAxiosError, isCancel } from "axios";

import { parseWeatherResponse } from "@/src/schemas/weather";
import type { WeatherSnapshot } from "@/src/types/weather";

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const WEATHER_STALE_TIME_MS = 5 * 60 * 1000;

type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

type FetchWeatherOptions = WeatherCoordinates & {
  signal?: AbortSignal;
};

export const weatherKeys = {
  current: (coordinates: WeatherCoordinates | null) =>
    [
      "weather",
      "current",
      coordinates?.latitude ?? null,
      coordinates?.longitude ?? null,
    ] as const,
};

export async function fetchWeather({
  latitude,
  longitude,
  signal,
}: FetchWeatherOptions): Promise<WeatherSnapshot> {
  const response = await axios.get<unknown>(WEATHER_ENDPOINT, {
    params: {
      latitude,
      longitude,
      current: "temperature_2m,apparent_temperature,weather_code",
      temperature_unit: "celsius",
      timezone: "GMT",
    },
    signal,
    timeout: 10_000,
  });

  return parseWeatherResponse(response.data);
}

export function shouldRetryWeatherRequest(
  failureCount: number,
  error: Error,
): boolean {
  if (failureCount >= 1 || !isAxiosError(error)) {
    return false;
  }

  if (isCancel(error) || error.code === "ERR_CANCELED") {
    return false;
  }

  if (error.response) {
    return error.response.status >= 500;
  }

  return Boolean(error.request);
}

export function useWeatherQuery(
  coordinates: WeatherCoordinates | null,
): UseQueryResult<WeatherSnapshot, Error> {
  return useQuery({
    queryKey: weatherKeys.current(coordinates),
    enabled: coordinates !== null,
    queryFn: ({ signal }) => {
      if (coordinates === null) {
        throw new Error("날씨를 조회할 좌표가 없습니다.");
      }

      return fetchWeather({ ...coordinates, signal });
    },
    staleTime: WEATHER_STALE_TIME_MS,
    retry: shouldRetryWeatherRequest,
  });
}
