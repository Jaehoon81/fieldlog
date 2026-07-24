export type TemperatureUnit = "celsius" | "fahrenheit";

export type WeatherSnapshot = {
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  observedAt: number;
};

export function convertTemperature(
  temperatureC: number,
  unit: TemperatureUnit,
): number {
  return unit === "celsius" ? temperatureC : (temperatureC * 9) / 5 + 32;
}
