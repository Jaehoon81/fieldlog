import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  useSQLiteContext,
  type SQLiteBindValue,
  type SQLiteDatabase,
} from "expo-sqlite";

import { observationFormSchema } from "@/src/schemas/observation";
import type {
  CreateObservationInput,
  Observation,
  ObservationCategory,
  ObservationPlatform,
  ProximitySnapshot,
} from "@/src/types/observation";

type ObservationRow = {
  id: number;
  title: string;
  note: string;
  category: ObservationCategory;
  proximity_state: ProximitySnapshot["status"];
  distance_cm: number | null;
  max_range_cm: number | null;
  platform: ObservationPlatform;
  proximity_observed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_observed_at: string | null;
  temperature_c: number | null;
  apparent_temperature_c: number | null;
  weather_code: number | null;
  weather_observed_at: string | null;
  captured_at: string;
};

const OBSERVATION_COLUMNS = `
  id,
  title,
  note,
  category,
  proximity_state,
  distance_cm,
  max_range_cm,
  platform,
  proximity_observed_at,
  latitude,
  longitude,
  location_accuracy_m,
  location_observed_at,
  temperature_c,
  apparent_temperature_c,
  weather_code,
  weather_observed_at,
  captured_at
`;

export const observationKeys = {
  all: ["observations"] as const,
  list: () => ["observations", "list"] as const,
  detail: (id: number) => ["observations", "detail", id] as const,
};

function toIsoString(epochMilliseconds: number): string {
  return new Date(epochMilliseconds).toISOString();
}

function toEpochMilliseconds(isoString: string): number {
  return new Date(isoString).getTime();
}

export function mapObservationRow(row: ObservationRow): Observation {
  const hasLocation =
    row.latitude !== null &&
    row.longitude !== null &&
    row.location_observed_at !== null;
  const hasWeather =
    row.temperature_c !== null &&
    row.apparent_temperature_c !== null &&
    row.weather_code !== null &&
    row.weather_observed_at !== null;

  return {
    id: row.id,
    title: row.title,
    note: row.note,
    category: row.category,
    proximity: {
      status: row.proximity_state,
      distanceCm: row.distance_cm,
      maxRangeCm: row.max_range_cm,
      observedAt:
        row.proximity_observed_at === null
          ? null
          : toEpochMilliseconds(row.proximity_observed_at),
    },
    location: hasLocation
      ? {
          latitude: row.latitude!,
          longitude: row.longitude!,
          accuracyM: row.location_accuracy_m,
          observedAt: toEpochMilliseconds(row.location_observed_at!),
        }
      : null,
    weather: hasWeather
      ? {
          temperatureC: row.temperature_c!,
          apparentTemperatureC: row.apparent_temperature_c!,
          weatherCode: row.weather_code!,
          observedAt: toEpochMilliseconds(row.weather_observed_at!),
        }
      : null,
    platform: row.platform,
    capturedAt: toEpochMilliseconds(row.captured_at),
  };
}

export async function listObservations(
  db: SQLiteDatabase,
): Promise<Observation[]> {
  const rows = await db.getAllAsync<ObservationRow>(`
    SELECT ${OBSERVATION_COLUMNS}
    FROM observations
    ORDER BY captured_at DESC, id DESC
  `);

  return rows.map(mapObservationRow);
}

export async function getObservation(
  db: SQLiteDatabase,
  id: number,
): Promise<Observation | null> {
  const row = await db.getFirstAsync<ObservationRow>(
    `
      SELECT ${OBSERVATION_COLUMNS}
      FROM observations
      WHERE id = $id
    `,
    { $id: id },
  );

  return row === null ? null : mapObservationRow(row);
}

export async function createObservation(
  db: SQLiteDatabase,
  input: CreateObservationInput,
): Promise<number> {
  const { captureContext } = input;
  const formValues = observationFormSchema.parse({
    title: input.title,
    note: input.note,
    category: input.category,
  });
  const parameters: Record<string, SQLiteBindValue> = {
    $title: formValues.title,
    $note: formValues.note,
    $category: formValues.category,
    $proximityState: captureContext.proximity.status,
    $distanceCm: captureContext.proximity.distanceCm,
    $maxRangeCm: captureContext.proximity.maxRangeCm,
    $platform: captureContext.platform,
    $proximityObservedAt:
      captureContext.proximity.observedAt === null
        ? null
        : toIsoString(captureContext.proximity.observedAt),
    $latitude: captureContext.location?.latitude ?? null,
    $longitude: captureContext.location?.longitude ?? null,
    $locationAccuracyM: captureContext.location?.accuracyM ?? null,
    $locationObservedAt: captureContext.location
      ? toIsoString(captureContext.location.observedAt)
      : null,
    $temperatureC: captureContext.weather?.temperatureC ?? null,
    $apparentTemperatureC:
      captureContext.weather?.apparentTemperatureC ?? null,
    $weatherCode: captureContext.weather?.weatherCode ?? null,
    $weatherObservedAt: captureContext.weather
      ? toIsoString(captureContext.weather.observedAt)
      : null,
    $capturedAt: toIsoString(captureContext.capturedAt),
  };

  const result = await db.runAsync(
    `
      INSERT INTO observations (
        title,
        note,
        category,
        proximity_state,
        distance_cm,
        max_range_cm,
        platform,
        proximity_observed_at,
        latitude,
        longitude,
        location_accuracy_m,
        location_observed_at,
        temperature_c,
        apparent_temperature_c,
        weather_code,
        weather_observed_at,
        captured_at
      )
      VALUES (
        $title,
        $note,
        $category,
        $proximityState,
        $distanceCm,
        $maxRangeCm,
        $platform,
        $proximityObservedAt,
        $latitude,
        $longitude,
        $locationAccuracyM,
        $locationObservedAt,
        $temperatureC,
        $apparentTemperatureC,
        $weatherCode,
        $weatherObservedAt,
        $capturedAt
      )
    `,
    parameters,
  );

  return result.lastInsertRowId;
}

export async function deleteObservation(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM observations WHERE id = $id", { $id: id });
}

export function useObservationsQuery(): UseQueryResult<Observation[], Error> {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: observationKeys.list(),
    queryFn: () => listObservations(db),
    retry: false,
  });
}

export function useObservationQuery(
  id: number,
): UseQueryResult<Observation | null, Error> {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: observationKeys.detail(id),
    queryFn: () => getObservation(db, id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
}

export function useCreateObservationMutation(): UseMutationResult<
  number,
  Error,
  CreateObservationInput
> {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => createObservation(db, input),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: observationKeys.all });
    },
  });
}

export function useDeleteObservationMutation(): UseMutationResult<
  void,
  Error,
  number
> {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteObservation(db, id),
    retry: false,
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: observationKeys.all });
      queryClient.removeQueries({
        queryKey: observationKeys.detail(id),
        exact: true,
      });
    },
  });
}
