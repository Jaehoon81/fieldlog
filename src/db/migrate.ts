import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_NAME = "fieldlog.db";

const DATABASE_VERSION = 1;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `지원하지 않는 데이터베이스 버전입니다: ${currentVersion}`,
    );
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (currentVersion === 0) {
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
