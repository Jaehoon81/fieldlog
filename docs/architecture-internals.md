# FieldLog 내부 구조와 동작

이 문서는 FieldLog의 실제 source를 따라가는 운영용 architecture 지도다. 범위, 현재 완료 상태와 검증 기록은 [구현 계획](./implementation-plan.md)을 기준으로 판단하고, 학습 목적의 단계별 설명은 [학습서](./learning-guide.md)를 사용한다.

## Source 책임

| 경로 | 책임 |
| --- | --- |
| `app/` | Expo Router layout, tab, screen, navigation과 screen 단위 흐름 |
| `src/api/` | 외부 날씨 API 호출과 query 연결 |
| `src/db/` | SQLite migration, 기록 query·mutation과 cache 무효화 |
| `src/hooks/` | 근접 센서 monitoring과 같은 재사용 가능한 runtime 동작 |
| `src/query-client.ts` | app-wide TanStack Query cache와 기본 retry·refetch 정책 |
| `src/store/` | Zustand application state와 영속 설정 |
| `src/schemas/` | form 입력과 외부 API 응답의 Zod runtime 검증 계약 |
| `src/types/` | 공용 domain type과 native event type |
| `src/components/` | 여러 screen에서 사용하는 표시 component |
| `modules/proximity-sensor/` | TypeScript bridge와 직접 관리하는 Android·iOS native source |
| `app-tests/`, `src/**/*.test.*` | screen, hook, schema, store와 database test |

## 시작과 routing

1. `app/_layout.tsx`가 초기화 error boundary와 Suspense fallback을 구성한다.
2. `SQLiteProvider`가 FieldLog database를 열고 `migrateDatabase`를 실행한다.
3. `HydratedRoutes`가 Zustand에 저장된 설정의 hydration 완료를 기다린다.
4. hydration 이후 `QueryClientProvider`와 root Expo Router stack을 표시한다.
5. `app/(tabs)/_layout.tsx`가 현재 상태, 기록과 설정 tab을 구성한다.
6. `app/observations/new.tsx`와 `app/observations/[id].tsx`는 tab bar 바깥의 stack route다.

초기화 순서를 바꿀 때는 migration 실패 화면, Suspense fallback, Zustand hydration과 Query client가 screen보다 먼저 준비되는지 함께 확인한다.

## Snapshot 생성과 저장 흐름

1. 현재 상태 screen이 근접 센서, 위치와 날씨의 현재 runtime state를 관리한다.
2. 기록 만들기를 시작하면 해당 시점의 값을 Zustand `captureContext`에 고정하고 `/observations/new`로 이동한다.
3. 새 기록 screen은 React Hook Form과 Zod로 사용자가 편집하는 값을 검증한다.
4. `createObservation`이 편집 값과 고정된 snapshot을 bound parameter로 SQLite에 저장한다.
5. mutation 성공 후 observation query를 무효화하고 `captureContext`를 비운 뒤 기록 tab으로 이동한다.
6. 기록 목록과 상세 screen은 SQLite를 원본으로 사용하는 TanStack Query를 통해 데이터를 읽는다.

## State 책임과 영속성

| 상태 | 담당 | 영속성 |
| --- | --- | --- |
| 저장된 기록 | SQLite `observations` table | 영속 |
| 기록 목록·상세 cache | TanStack Query | runtime cache |
| 온도 단위 | Zustand와 `expo-sqlite/kv-store` | 영속 |
| 저장 전 snapshot | Zustand `captureContext` | memory only |
| 실시간 근접·위치·날씨 상태 | 현재 상태 screen과 관련 hook | memory only |

상태의 담당 위치를 바꿀 때는 hydration, query cache 무효화, navigation cleanup과 app 재실행 후 동작을 함께 확인한다.

## ProximitySensor native 경계

- `modules/proximity-sensor/src/ProximitySensorModule.ts`는 `requireNativeModule`로 local native module을 불러온다.
- 공개 계약은 `isAvailableAsync()`와 `onProximityChange` event다.
- Android 구현은 `SensorManager`와 proximity sensor를 사용한다.
- iOS 구현은 `UIDevice`의 proximity monitoring을 사용하며 distance와 maximum range는 `null`을 반환한다.
- native listener는 module observation 상태와 app foreground·background lifecycle에 반응한다.
- `src/hooks/use-proximity.ts`는 JavaScript subscription, availability 상태, 오래된 비동기 작업 차단과 unmount cleanup을 담당한다.
- screen focus와 native app lifecycle은 서로 다른 경계다. monitoring 동작을 변경할 때 두 경계를 모두 유지한다.

## Generated native project 경계

- root `/android`, root `/ios`와 `.expo/`는 generated 또는 inspection output이며 Git에서 제외된다.
- `modules/proximity-sensor/android/`와 `modules/proximity-sensor/ios/`는 직접 관리하는 source이므로 generated output으로 취급하지 않는다.
- Expo 설정은 `app.json`, native 동작은 local module source를 기준으로 변경한다.
- native, dependency, plugin 또는 app config를 변경하면 새 development build가 필요하다.
- JS/TS만 변경했다면 호환되는 development client가 이미 설치된 경우 Metro로 확인할 수 있다.

## 검증 경계

- Jest는 local proximity module을 mock한다.
- unit·screen test는 JavaScript 계약과 동작을 검증하지만 native compile이나 실물 sensor 동작을 증명하지 않는다.
- Expo config 검사는 생성될 설정을 검증하지만 기기 설치를 증명하지 않는다.
- Android·iOS build는 native compile과 packaging을 검증한다.
- 실기기 시나리오는 permission, lifecycle, persistence, navigation과 실제 sensor 동작을 검증한다.
- 계획서와 handoff에서는 통과, 실패, 스킵, blocker와 미검증을 서로 구분한다.
