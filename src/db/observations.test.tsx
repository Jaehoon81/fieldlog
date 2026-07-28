// [파일 역할] Observation repository의 DB row 변환과 안전한 named parameter 바인딩을 단위 검증합니다.
// [검증 경계] SQLiteDatabase는 가짜 객체이므로 SQL 문법의 실제 실행·migration·파일 저장까지 증명하지는 않습니다.
import type { SQLiteDatabase } from "expo-sqlite";

import {
  createObservation,
  mapObservationRow,
} from "@/src/db/observations";
import type { CreateObservationInput } from "@/src/types/observation";

// production module import 시 요구되는 Hook만 대체하고 이 test에서는 순수 함수와 가짜 db를 직접 호출합니다.
jest.mock("expo-sqlite", () => ({
  useSQLiteContext: jest.fn(),
}));

// 작은따옴표를 포함한 제목은 SQL 문자열 결합 여부를 발견하기 위한 의도적인 fixture입니다.
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
  // 각 test가 이전 mock 호출 횟수에 영향을 받지 않게 초기화합니다.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("SQLite row를 nullable snapshot이 포함된 domain model로 변환한다", () => {
    // snake_case와 ISO 시각을 camelCase/null/epoch millisecond 도메인 객체로 바꾼 전체 결과를 비교합니다.
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
    // runAsync의 완료값에 lastInsertRowId를 넣어 실제 SQLite 응답의 최소 모양을 흉내 냅니다.
    const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 7 });
    // [문법] 테스트용 부분 객체를 먼저 unknown으로 거쳐 SQLiteDatabase 계약으로 cast합니다.
    const db = { runAsync } as unknown as SQLiteDatabase;

    // Jest의 resolves matcher는 Promise가 reject되지 않고 정확히 7로 완료되는지 확인합니다.
    await expect(createObservation(db, input)).resolves.toBe(7);

    expect(runAsync).toHaveBeenCalledTimes(1);
    // mock.calls[첫 호출] 배열에서 SQL 문자열과 parameter 객체를 구조 분해합니다.
    const [sql, parameters] = runAsync.mock.calls[0];
    // SQL에는 placeholder가 있고 실제 사용자 문자열은 없어야 SQL injection/quote 문제를 피할 수 있습니다.
    expect(sql).toContain("$title");
    expect(sql).not.toContain("O'Brien 센서");
    // toMatchObject는 핵심 binding만 검사하고 나머지 정상 parameter가 더 있어도 허용합니다.
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
