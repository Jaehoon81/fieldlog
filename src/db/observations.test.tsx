import type { SQLiteDatabase } from "expo-sqlite";

import {
  createObservation,
  mapObservationRow,
} from "@/src/db/observations";
import type { CreateObservationInput } from "@/src/types/observation";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: jest.fn(),
}));

const input: CreateObservationInput = {
  title: "  O'Brien 센서  ",
  note: "메모",
  category: "experiment",
  captureContext: {
    proximity: {
      status: "near",
      distanceCm: 0,
      maxRangeCm: 5,
      observedAt: 1_753_000_000_000,
    },
    location: {
      latitude: 37.5,
      longitude: 127,
      accuracyM: 12,
      observedAt: 1_753_000_001_000,
    },
    weather: {
      temperatureC: 24,
      apparentTemperatureC: 25,
      weatherCode: 2,
      observedAt: 1_753_000_002_000,
    },
    platform: "android",
    capturedAt: 1_753_000_003_000,
  },
};

describe("observation repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("SQLite row를 nullable snapshot이 포함된 domain model로 변환한다", () => {
    expect(
      mapObservationRow({
        id: 3,
        title: "센서 확인",
        note: "",
        category: "environment",
        proximity_state: "unavailable",
        distance_cm: null,
        max_range_cm: null,
        platform: "ios",
        proximity_observed_at: null,
        latitude: null,
        longitude: null,
        location_accuracy_m: null,
        location_observed_at: null,
        temperature_c: null,
        apparent_temperature_c: null,
        weather_code: null,
        weather_observed_at: null,
        captured_at: "2026-07-20T03:00:00.000Z",
      }),
    ).toEqual({
      id: 3,
      title: "센서 확인",
      note: "",
      category: "environment",
      proximity: {
        status: "unavailable",
        distanceCm: null,
        maxRangeCm: null,
        observedAt: null,
      },
      location: null,
      weather: null,
      platform: "ios",
      capturedAt: Date.parse("2026-07-20T03:00:00.000Z"),
    });
  });

  it("사용자 값과 snapshot을 SQL parameter로 바인딩한다", async () => {
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 7 });
    const db = { runAsync } as unknown as SQLiteDatabase;

    await expect(createObservation(db, input)).resolves.toBe(7);

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, parameters] = runAsync.mock.calls[0];
    expect(sql).toContain("$title");
    expect(sql).not.toContain("O'Brien 센서");
    expect(parameters).toMatchObject({
      $title: "O'Brien 센서",
      $note: "메모",
      $category: "experiment",
      $proximityState: "near",
      $distanceCm: 0,
      $latitude: 37.5,
      $temperatureC: 24,
      $capturedAt: new Date(input.captureContext.capturedAt).toISOString(),
    });
  });

});
