/**
 * [파일 역할]
 * 근접 센서, 위치, 날씨와 저장된 기록을 연결하는 공용 domain type 모음이다.
 * Native module → hook → screen → Zustand → SQLite repository → 화면의 모든
 * 계층이 이 shape를 공유하므로 property 이름과 nullable 범위가 데이터 흐름의
 * 계약이 된다.
 */

// [문법] `import type`은 실행 시 필요한 값이 아니라 compile-time type만 가져온다.
import type { WeatherSnapshot } from "@/src/types/weather";

// [문법] 다른 파일의 type을 다시 export해 consumer가 한 경로에서 가져올 수 있다.
export type { TemperatureUnit } from "@/src/types/weather";

/**
 * [FLOW-02 / 관련 코드] 화면에서만 사용하는 근접 센서 상태다.
 * `idle`과 `pending`은 아직 저장할 sensor snapshot이 확정되지 않은 UI 상태라
 * `ProximitySnapshot`과 SQLite에는 포함되지 않는다.
 */
export type ProximityUiStatus =
  | "idle"
  | "pending"
  | "near"
  | "far"
  | "unavailable";

/**
 * [FLOW-02 / 관련 코드]
 * Kotlin/Swift가 `onProximityChange`로 JavaScript에 보내는 event payload다.
 * Event가 발생했다는 것은 `near` 또는 `far`가 확정됐다는 뜻이므로
 * `unavailable`은 이 union에 들어가지 않는다.
 */
export type ProximityEvent = {
  status: "near" | "far";
  // iOS API는 실제 거리를 주지 않으므로 Android와 공통 shape에서 null을 허용한다.
  distanceCm: number | null;
  maxRangeCm: number | null;
  // [문법] Native의 epoch millisecond를 JavaScript number로 받는다.
  observedAt: number;
};

/**
 * [FLOW-04 / 관련 코드]
 * 기록 만들기 순간에 고정하는 sensor 값이다. Event와 달리 미지원 기기도
 * 기록할 수 있어 `unavailable`과 nullable 관측 시각을 포함한다.
 */
export type ProximitySnapshot = {
  status: "near" | "far" | "unavailable";
  distanceCm: number | null;
  maxRangeCm: number | null;
  observedAt: number | null;
};

// Expo Location 결과 중 FieldLog가 실제 저장하는 최소 property만 남긴다.
export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  // 기기가 accuracy를 제공하지 않을 수 있으므로 null을 허용한다.
  accuracyM: number | null;
  observedAt: number;
};

// [문법] 저장·Zod·SQLite CHECK constraint가 공유하는 category literal union이다.
export type ObservationCategory = "experiment" | "environment" | "other";

// [문법] 이 앱은 web을 제외하므로 저장 가능한 platform도 두 값으로 제한한다.
export type ObservationPlatform = "android" | "ios";

/**
 * [FLOW-04 / 관련 코드]
 * 현재 상태 화면이 수집한 값을 한 시점의 봉투처럼 묶어 새 기록 화면으로
 * 전달한다. Zustand memory에만 머물고 `persist` 대상에는 포함되지 않는다.
 */
export type CaptureContext = {
  proximity: ProximitySnapshot;
  // 위치 권한 거부나 조회 실패가 기록 생성을 막지 않으므로 전체가 null 가능하다.
  location: LocationSnapshot | null;
  // 위치는 성공했지만 날씨 API만 실패한 경우도 있어 별도로 null 가능하다.
  weather: WeatherSnapshot | null;
  platform: ObservationPlatform;
  // 개별 센서 관측 시각과 별개인 "기록 만들기 버튼을 누른 시각"이다.
  capturedAt: number;
};

/**
 * [FLOW-05 / 관련 코드]
 * SQLite row를 `mapObservationRow`가 변환한 뒤 화면이 소비하는 domain model이다.
 * `CaptureContext`에 사용자 입력과 database가 발급한 `id`가 더해진 형태다.
 */
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

/**
 * [FLOW-04 / 관련 코드]
 * 새 기록 form이 repository에 전달하는 command shape다.
 * UI 입력 세 필드와 이전 화면에서 고정한 snapshot을 명시적으로 합친다.
 */
export type CreateObservationInput = {
  title: string;
  note: string;
  category: ObservationCategory;
  captureContext: CaptureContext;
};
