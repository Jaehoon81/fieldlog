// [파일 역할] SQLite 행과 앱의 Observation 객체를 변환하고 CRUD 및 React Query Hook을 제공합니다.
// [FLOW-04 / 5~7단계] 새 기록 저장, [FLOW-05] 목록·상세 조회와 삭제가 모두 이 파일을 통과합니다.
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

// [문법] DB의 snake_case 열 이름과 타입을 그대로 표현한 이 파일 내부 전용 타입입니다.
// 앱의 camelCase Observation과 분리해 저장 형식과 화면 형식 사이의 변환 지점을 명확히 합니다.
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

// [이유] 목록과 상세 SELECT가 같은 열 집합을 쓰도록 공통 문자열로 묶어 누락 위험을 줄입니다.
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

// [라이브러리] TanStack Query의 key는 SQLite 조회 결과 캐시를 식별하는 주소입니다.
export const observationKeys = {
  // `as const`는 일반 string[] 대신 원소 값이 보존된 읽기 전용 튜플을 만듭니다.
  all: ["observations"] as const,
  list: () => ["observations", "list"] as const,
  // 상세 key에는 id를 넣어 서로 다른 기록의 캐시를 분리합니다.
  detail: (id: number) => ["observations", "detail", id] as const,
};

// [이유] 앱에서는 계산하기 쉬운 epoch millisecond(number), DB에서는 읽기 쉬운 ISO 문자열을 사용합니다.
function toIsoString(epochMilliseconds: number): string {
  return new Date(epochMilliseconds).toISOString();
}

function toEpochMilliseconds(isoString: string): number {
  return new Date(isoString).getTime();
}

// [FLOW-05 / 2단계] SQLite가 돌려준 한 행을 화면이 사용하는 Observation으로 복원합니다.
export function mapObservationRow(row: ObservationRow): Observation {
  // 위치 묶음의 필수 열이 모두 있을 때만 LocationSnapshot 객체를 만듭니다.
  const hasLocation =
    row.latitude !== null &&
    row.longitude !== null &&
    row.location_observed_at !== null;
  // 날씨도 네 필수 열이 모두 있어야 유효한 WeatherSnapshot으로 취급합니다.
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
      // [문법] 삼항 연산자로 DB NULL은 null로 두고 ISO 문자열만 숫자 시각으로 바꿉니다.
      observedAt:
        row.proximity_observed_at === null
          ? null
          : toEpochMilliseconds(row.proximity_observed_at),
    },
    // 조건이 참이면 객체, 거짓이면 null을 넣는 조건부 표현식입니다.
    location: hasLocation
      ? {
          // [주의] `!`는 non-null assertion입니다. hasLocation 검사가 끝났음을 TypeScript에 알립니다.
          latitude: row.latitude!,
          longitude: row.longitude!,
          accuracyM: row.location_accuracy_m,
          observedAt: toEpochMilliseconds(row.location_observed_at!),
        }
      : null,
    weather: hasWeather
      ? {
          // hasWeather가 null 아님을 검사한 필드에만 `!`를 사용합니다.
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

// [FLOW-05 / 1단계] 기록 탭이 요청하면 캡처 시각이 최신인 행부터 모두 읽습니다.
export async function listObservations(
  db: SQLiteDatabase,
): Promise<Observation[]> {
  // [라이브러리] getAllAsync<T>의 T는 반환되는 각 행의 TypeScript 모양을 지정합니다.
  const rows = await db.getAllAsync<ObservationRow>(`
    SELECT ${OBSERVATION_COLUMNS}
    FROM observations
    ORDER BY captured_at DESC, id DESC
  `);

  // map은 원본 rows를 바꾸지 않고 각 행을 Observation으로 변환한 새 배열을 만듭니다.
  return rows.map(mapObservationRow);
}

// [FLOW-05 / 4단계] 상세 route의 숫자 id에 해당하는 행 하나만 조회합니다.
export async function getObservation(
  db: SQLiteDatabase,
  id: number,
): Promise<Observation | null> {
  // [보안/이유] `$id` 바인딩을 사용해 값을 SQL 문자열에 직접 이어 붙이지 않습니다.
  const row = await db.getFirstAsync<ObservationRow>(
    `
      SELECT ${OBSERVATION_COLUMNS}
      FROM observations
      WHERE id = $id
    `,
    { $id: id },
  );

  // 행이 없으면 null, 있으면 앱 객체를 반환합니다.
  return row === null ? null : mapObservationRow(row);
}

// [FLOW-04 / 5단계] 작성 폼과 홈에서 캡처한 문맥을 하나의 DB 행으로 저장합니다.
export async function createObservation(
  db: SQLiteDatabase,
  input: CreateObservationInput,
): Promise<number> {
  // [문법] 구조 분해로 input.captureContext를 같은 이름의 지역 변수로 꺼냅니다.
  const { captureContext } = input;
  // [검증 경계] 저장 직전에 Zod를 다시 실행해 모든 호출자가 같은 폼 규칙을 따르게 합니다.
  const formValues = observationFormSchema.parse({
    title: input.title,
    note: input.note,
    category: input.category,
  });
  // [문법] Record<K, V>는 모든 key가 string이고 값은 SQLiteBindValue인 객체 타입입니다.
  const parameters: Record<string, SQLiteBindValue> = {
    $title: formValues.title,
    $note: formValues.note,
    $category: formValues.category,
    $proximityState: captureContext.proximity.status,
    $distanceCm: captureContext.proximity.distanceCm,
    $maxRangeCm: captureContext.proximity.maxRangeCm,
    $platform: captureContext.platform,
    // 선택 시각은 null을 보존하고 실제 값만 ISO 문자열로 바꿉니다.
    $proximityObservedAt:
      captureContext.proximity.observedAt === null
        ? null
        : toIsoString(captureContext.proximity.observedAt),
    // `?.` 뒤 결과가 undefined이면 `?? null`로 SQLite NULL 값에 통일합니다.
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

  // [라이브러리] runAsync는 INSERT처럼 행 목록이 필요 없는 SQL을 비동기로 실행합니다.
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

  // [FLOW-04 / 6단계] SQLite가 만든 id를 반환하면 작성 화면이 그 상세 route로 이동합니다.
  return result.lastInsertRowId;
}

// [FLOW-05 / 6단계] 삭제 확인을 받은 id 한 건을 parameter binding으로 삭제합니다.
export async function deleteObservation(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM observations WHERE id = $id", { $id: id });
}

// [FLOW-05 / 1단계] React 컴포넌트가 사용하는 목록 조회 Hook입니다.
export function useObservationsQuery(): UseQueryResult<Observation[], Error> {
  // [라이브러리] SQLiteProvider가 연 DB를 React Context에서 꺼냅니다.
  const db = useSQLiteContext();

  return useQuery({
    queryKey: observationKeys.list(),
    // 화살표 함수는 현재 db를 클로저로 기억하고 Query가 필요할 때 조회합니다.
    queryFn: () => listObservations(db),
    // 로컬 SQL 오류는 반복으로 해결되지 않으므로 자동 재시도하지 않습니다.
    retry: false,
  });
}

// [FLOW-05 / 4단계] 상세 화면이 사용하는 단건 조회 Hook입니다.
export function useObservationQuery(
  id: number,
): UseQueryResult<Observation | null, Error> {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: observationKeys.detail(id),
    queryFn: () => getObservation(db, id),
    // route 문자열이 정상적인 양의 정수 id로 변환된 경우에만 SQL을 실행합니다.
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
}

// [FLOW-04 / 5~7단계] 저장 함수와 저장 후 캐시 갱신을 묶은 Mutation Hook입니다.
export function useCreateObservationMutation(): UseMutationResult<
  // 제네릭 순서: 성공값, 오류, mutate 호출 시 받는 입력입니다.
  number,
  Error,
  CreateObservationInput
> {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => createObservation(db, input),
    retry: false,
    // 성공하면 observations 아래 캐시를 stale로 만들어 다음 화면에서 최신 DB 값을 읽게 합니다.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: observationKeys.all });
    },
  });
}

// [FLOW-05 / 6~7단계] 삭제와 관련 캐시 정리를 묶은 Mutation Hook입니다.
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
    // 첫 매개변수 `_`는 사용하지 않는 성공값(void), id는 mutation에 전달했던 변수입니다.
    onSuccess: async (_, id) => {
      // 목록 등 observations 계열 캐시는 다시 조회하도록 무효화합니다.
      await queryClient.invalidateQueries({ queryKey: observationKeys.all });
      // 이미 삭제된 한 id의 상세 캐시는 정확히 그 항목만 즉시 제거합니다.
      queryClient.removeQueries({
        queryKey: observationKeys.detail(id),
        exact: true,
      });
    },
  });
}
