import type { WeatherSnapshot } from "@/src/types/weather";

export type { TemperatureUnit } from "@/src/types/weather";

export type ProximityUiStatus =
  | "idle"
  | "pending"
  | "near"
  | "far"
  | "unavailable";

export type ProximityEvent = {
  status: "near" | "far";
  distanceCm: number | null;
  maxRangeCm: number | null;
  observedAt: number;
};

export type ProximitySnapshot = {
  status: "near" | "far" | "unavailable";
  distanceCm: number | null;
  maxRangeCm: number | null;
  observedAt: number | null;
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  observedAt: number;
};

export type ObservationCategory = "experiment" | "environment" | "other";

export type ObservationPlatform = "android" | "ios";

export type CaptureContext = {
  proximity: ProximitySnapshot;
  location: LocationSnapshot | null;
  weather: WeatherSnapshot | null;
  platform: ObservationPlatform;
  capturedAt: number;
};

export type Observation = {
  id: number;
  title: string;
  note: string;
  category: ObservationCategory;
  proximity: ProximitySnapshot;
  location: LocationSnapshot | null;
  weather: WeatherSnapshot | null;
  platform: ObservationPlatform;
  capturedAt: number;
};

export type CreateObservationInput = {
  title: string;
  note: string;
  category: ObservationCategory;
  captureContext: CaptureContext;
};
