/**
 * [파일 역할]
 * FieldLog SQLite database를 처음 열 때 필요한 schema를 원자적으로 준비한다.
 * `app/_layout.tsx`의 `SQLiteProvider.onInit`가 이 함수를 호출하므로 migration이
 * 끝나기 전에는 route가 표시되지 않는다.
 */

import type { SQLiteDatabase } from "expo-sqlite";

// SQLiteProvider와 migration이 같은 물리 database file 이름을 공유한다.
export const DATABASE_NAME = "fieldlog.db";

// `PRAGMA user_version`과 비교하는 현재 application schema version이다.
const DATABASE_VERSION = 1;

/**
 * [FLOW-01 / 3단계]
 * `async` 함수는 즉시 Promise를 반환하고 각 `await`에서 database 작업 완료를
 * 기다린다. 반환할 data는 없으므로 `Promise<void>`다.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  /**
   * [라이브러리]
   * `execAsync`는 여러 고정 SQL statement를 실행할 때 쓴다. 여기에는 사용자
   * 입력이 없으므로 binding이 필요 없다. WAL은 읽기와 쓰기 동시성을 개선한다.
   */
  await db.execAsync("PRAGMA journal_mode = WAL;");

  // [문법] Generic으로 조회 row의 property type을 SQLite API에 알려준다.
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  // [문법] `?.` 뒤 결과가 undefined면 `??`가 기본 version 0을 선택한다.
  const currentVersion = versionRow?.user_version ?? 0;

  // 더 새 schema를 오래된 app이 조용히 열어 data를 잘못 해석하지 않게 중단한다.
  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `지원하지 않는 데이터베이스 버전입니다: ${currentVersion}`,
    );
  }

  // 이미 최신이면 DDL을 반복하지 않는 idempotent 빠른 경로다.
  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  /**
   * [Data]
   * table, index와 version 표시는 하나의 exclusive transaction에서 처리한다.
   * 중간 statement가 실패하면 전부 rollback되어 "version만 최신"인 불완전
   * schema가 남지 않는다.
   */
  await db.withExclusiveTransactionAsync(async (transaction) => {
    // 새 database의 user_version 기본값은 0이다.
    if (currentVersion === 0) {
      /**
       * 아래 SQL은 사용자 data가 아닌 compile-time 상수다.
       * CHECK constraint는 TypeScript/Zod 밖에서도 category, sensor 상태와
       * platform invariant를 지키는 마지막 방어선이다.
       * `observations_captured_at_id_idx`는 목록의 고정 최신순 ORDER BY를
       * 지원하고, 마지막 PRAGMA는 모든 DDL 뒤에 schema version을 올린다.
       */
      await transaction.execAsync(`
        CREATE TABLE observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL CHECK (
            category IN ('experiment', 'environment', 'other')
          ),
          proximity_state TEXT NOT NULL CHECK (
            proximity_state IN ('near', 'far', 'unavailable')
          ),
          distance_cm REAL NULL,
          max_range_cm REAL NULL,
          platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
          proximity_observed_at TEXT NULL,
          latitude REAL NULL,
          longitude REAL NULL,
          location_accuracy_m REAL NULL,
          location_observed_at TEXT NULL,
          temperature_c REAL NULL,
          apparent_temperature_c REAL NULL,
          weather_code INTEGER NULL,
          weather_observed_at TEXT NULL,
          captured_at TEXT NOT NULL
        );

        CREATE INDEX observations_captured_at_id_idx
          ON observations (captured_at DESC, id DESC);

        PRAGMA user_version = 1;
      `);
    }
  });
}
