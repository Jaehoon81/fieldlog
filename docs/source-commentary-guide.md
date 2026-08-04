# FieldLog 소스 주석 읽기 안내서

이 문서는 FieldLog의 **소스 안에 추가된 한국어 학습 주석을 읽는 순서**와
JSON처럼 문법상 주석을 넣을 수 없는 설정 파일의 의미를 설명한다.

앱의 기능 범위와 검증 결과는 [구현 계획](./implementation-plan.md),
구조와 운영상 경계는 [내부 구조 문서](./architecture-internals.md),
대화형 학습의 현재 위치는
[학습 진행표](./2026-07-23-step-7-learning-progress.md)를 기준으로 판단한다.
이 문서는 기존 대화형 학습의 완료 상태를 바꾸지 않는다.

## 1. 주석 표식

소스에서는 다음 표식을 공통으로 사용한다.

| 표식 | 읽는 방법 |
| --- | --- |
| `[파일 역할]` | 이 파일이 담당하는 책임, 입력과 출력, 주요 caller와 consumer |
| `[문법]` | TypeScript, React, JSX, Kotlin, Swift, Gradle 또는 Ruby 문법 |
| `[라이브러리]` | Expo, React Native와 외부 library가 이 코드에서 수행하는 실제 역할 |
| `[이유]` | 현재 구현 형태를 선택한 이유와 더 단순해 보이는 다른 방식의 문제 |
| `[FLOW-번호]` | 해당 FLOW 전체를 처음부터 끝까지 요약하는 유일한 주석 |
| `[FLOW-번호 / N단계]` | 여러 파일을 잇는 FLOW에서 정확히 한 실행 지점을 가리키는 유일한 단계 주석 |
| `[FLOW-번호 / N-A단계]` | 같은 원인에서 갈라지는 platform 구현, 병렬 consumer, 결과 branch 또는 cleanup 경로를 A/B/C로 나눈 유일한 하위 단계 주석 |
| `[FLOW-번호 / 관련 코드]` | 해당 FLOW의 정식 단계는 아니지만 이해에 필요한 type, helper, 공용 UI, 방어 경로나 추가 call site |
| `[주의]` | nullable 값, lifecycle, 비동기 경합, cache 또는 platform 차이 |
| `[검증 경계]` | 해당 코드나 test가 증명하는 것과 증명하지 않는 것 |

주석은 identifier를 번역하지 않는다. 예를 들어 `captureContext`,
`useQuery`, `isAvailableAsync`는 source와 문서에서 같은 이름으로 읽는다.

각 `[FLOW-번호]`, `[FLOW-번호 / N단계]`와 `[FLOW-번호 / N-A단계]`는
source 전체에서 정확히 한 번만 사용한다. 하위 단계는 같은 시점의
platform별 구현, 병렬 consumer, 결과 branch 또는 서로 다른 cleanup 진입점을
구분할 때만 사용한다.
단계에는 하나의 숫자 또는 하나의 숫자-문자 조합만 쓰며 `1~3단계`,
`1, 3단계`, `1·3단계`, `6-A/B단계`처럼 범위나 여러 단계를 한 표식에
합치지 않는다.
`[FLOW-번호 / 관련 코드]`는 같은 FLOW 안에서 여러 번 사용할 수 있지만,
각 표식에는 정확히 하나의 FLOW 번호만 쓴다. 하나의 코드가 여러 FLOW를
지원하면 번호를 한 표식에 합치지 않고 FLOW별 주석을 각각 둔다.
이 표식에서 실제 identifier를 따라가면 가장 가까운 canonical 단계로
이동할 수 있어야 한다. FLOW와 무관한 일반 설명은 plain `[관련 코드]` 대신
`[문법]`, `[라이브러리]`, `[이유]`, `[주의]`처럼 설명 성격에 맞는 표식을 쓴다.

## 2. 먼저 따라갈 여섯 가지 흐름

### FLOW-01: 앱 시작과 route 표시

1. [`RootLayout`](../app/_layout.tsx)이 error boundary와 `Suspense`를 준비한다.
2. `SQLiteProvider`가 `fieldlog.db`를 열고 `onInit`으로
   `migrateDatabase`를 호출한다.
3. [`migrateDatabase`](../src/db/migrate.ts)가 schema version을 확인하고
   필요한 migration transaction을 완료한다.
4. Zustand store가 만들어질 때 `persist`가 SQLite key-value storage의
   설정 복원을 시작한다.
5. 복원이 끝나면 `onRehydrateStorage`가 `hasHydrated`를 `true`로 바꾼다.
6. `HydratedRoutes`가 `hasHydrated`를 확인하고 두 초기화 경계가 모두
   준비될 때까지 route 표시를 보류한다.
7. gate를 통과하면 `QueryClientProvider`와 Expo Router `Stack`을 표시한다.
8. [`TabLayout`](<../app/(tabs)/_layout.tsx>)이 현재 상태, 기록, 설정 route를
   하단 tab으로 구성한다.

`app/_layout.tsx`를 불러올 때 먼저 `app-store.ts`와 `query-client.ts`의
top-level export가 실행되어 store와 `queryClient`가 각각 한 번 준비된다.
여기서 파일이 “평가된다”는 말은 import한 파일의 top-level 코드를 처음부터
실행해 export 값을 만든다는 뜻이다. 이후 `RootLayout`과 자식 화면은 이미
만들어진 값을 사용한다.

따라서 6단계의 selector는 복원을 시작하는 호출이 아니라 4~5단계의 완료
결과인 `hasHydrated`를 읽고 계속 구독하는 지점이다. 7단계의
`QueryClientProvider`도 그때 `createQueryClient`를 처음 호출하는 것이 아니라
import 시점에 만들어진 `queryClient`를 prop으로 전달받는다.

2~3단계의 main database 준비와 4~5단계의 Zustand 설정 복원은 완료 시점이
겹칠 수 있는 별도 준비 경로다. 숫자는 source 탐색 순서이며 두 경로는
`HydratedRoutes`의 6단계에서 합류한다.

### FLOW-02: 근접 센서 monitoring

1. [`CurrentStatusScreen`](<../app/(tabs)/index.tsx>)이 focus될 때 지원 여부를
   확인해 달라고 `useProximity`에 요청한다.
2. hook이 TypeScript bridge의 `isAvailableAsync`를 호출하고 지원 여부를
   화면 상태에 반영한다.
3. 사용자가 현재 상태 화면의 모니터링 시작 버튼을 누른다.
4. 화면 handler가 Android에서는 즉시, iOS에서는 안내 확인 뒤 hook의
   `startMonitoring`을 호출한다.
5. hook이 실제 구독을 만들기 직전에 지원 여부를 다시 확인한다.
6. 지원되는 경우 hook이 첫 `onProximityChange` listener를 추가한다.
7. 첫 JS listener에 대응하는 platform별 observing hook이 실행된다.
   - `7-A`: Android `OnStartObserving(PROXIMITY_EVENT_NAME)`이
     `startMonitoringIfNeeded`를 호출한다.
   - `7-B`: iOS `OnStartObserving(proximityEventName)`이
     `startMonitoringIfNeeded`를 호출한다.
8. 활성 platform이 실제 native monitoring을 시작한다.
   - `8-A`: Android module이 `SensorManager`에 `SensorEventListener`를
     등록한다.
   - `8-B`: iOS module이 `NotificationCenter` observer와 `UIDevice`
     monitoring을 시작한다.
9. 활성 platform이 공통 `ProximityEvent`를 JavaScript로 보낸다.
   - `9-A`: Android
     [`SensorEventListener`](../modules/proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ProximitySensorModule.kt)
     callback이 sensor 값을 event로 보낸다.
   - `9-B`: iOS
     [`NotificationCenter`](../modules/proximity-sensor/ios/ProximitySensorModule.swift)
     callback 또는 시작 직후 현재 상태 전송이 event를 보낸다.
10. hook의 listener callback이 활성 platform에서 온 event를 받는다.
11. 함수형 state update가 event를 hook의 UI state에 반영한다.
12. React가 현재 상태 화면을 다시 render해 상태, 거리와 마지막 감지 시각을
    표시한다.
13. 사용자가 모니터링 중지 버튼을 누른다.
14. JS subscription을 해제하는 진입 경로를 구분한다.
    - `14-A`: 수동 중지 또는 화면 blur가 공용 `stopMonitoring`을 호출한다.
    - `14-B`: hook owner가 unmount되면 hook의 effect cleanup이 남은 비동기
      응답을 무효화하고 잔여 subscription을 직접 정리한다.
15. 마지막 JS listener 제거에 대응하는 platform별 observing hook이 실행된다.
    - `15-A`: Android `OnStopObserving(PROXIMITY_EVENT_NAME)`이
      `stopMonitoring`을 호출한다.
    - `15-B`: iOS `OnStopObserving(proximityEventName)`이
      `stopMonitoring`을 호출한다.
16. 활성 platform이 실제 native resource를 해제한다.
    - `16-A`: Android module이 등록된 `SensorEventListener`를 해제한다.
    - `16-B`: iOS module이 observer와 `UIDevice` monitoring을 해제한다.

시작 경로는 6단계 뒤 Android의 7-A→8-A→9-A와 iOS의
7-B→8-B→9-B로 갈라졌다가 공통 10→11→12단계로 합류한다. 13단계는
수동 중지에서만 거치며, 화면 blur는 13단계 없이 14-A로 들어간다.
수동 중지가 unmount를 일으키는 것은 아니다. 화면이 unmount될 때는
14-A의 focus cleanup과 14-B의 hook cleanup이 남은 subscription을 정리하며,
마지막 listener가 제거된 platform에서 15-A→16-A 또는 15-B→16-B로 이어진다.
listener 등록 뒤 availability 응답을 기다리던 이전 start가 늦게 끝나는 경우에는
그 start가 만든 subscription과 현재 ref의 identity를 먼저 비교한다. 이미 새
start의 subscription으로 교체됐다면 이전 cleanup은 현재 listener를 제거하지
않고 끝나므로, 실제 현재 listener가 제거될 때만 15→16단계로 이어진다.

### FLOW-03: 위치와 날씨 조회

1. 사용자가 현재 상태 화면의 위치 및 날씨 조회 버튼을 누른다.
2. 화면이 이전 위치·오류를 지우고 새 요청의 loading 상태를 시작한다.
3. `hasServicesEnabledAsync`로 위치 service가 켜져 있는지 확인한다.
4. 현재 foreground permission을 읽는다.
5. 권한이 없고 다시 요청할 수 있으면 system prompt를 열고 사용자의 선택
   결과가 돌아올 때까지 기다린다.
6. 권한이 있으면 `getCurrentPositionAsync`로 현재 위치를 한 번 요청한다.
7. Expo Location 결과에서 필요한 값만 `LocationSnapshot`으로 바꿔 저장한다.
8. 좌표 반영 뒤 시작되는 두 consumer를 구분한다.
   - `8-A`: [`useWeatherQuery`](../src/api/weather.ts)의 `enabled` 조건이
     충족되어 날씨 query가 시작된다.
   - `8-B`: 현재 상태 화면이 위치의 loading, 원인별 오류, 성공과 미요청
     상태를 표시한다.
9. TanStack Query의 `queryFn`이 `AbortSignal`과 좌표를 `fetchWeather`에
   전달한다.
10. Axios가 Open-Meteo에 실제 HTTP 요청을 보낸다.
11. [`parseWeatherResponse`](../src/schemas/weather.ts)가 외부 `unknown`
    payload를 검증하고 `WeatherSnapshot`으로 변환한다.
12. TanStack Query가 결과를 cache와 `pending`·`error`·`data` 상태에
    반영하고 consumer를 다시 render한다.
13. 화면이 날씨 loading, 오류·재시도와 성공 상태를 위치와 별도로 표시한다.
14. 사용자가 날씨 다시 시도를 누르면 현재 좌표를 유지한 채
    `weatherQuery.refetch()`로 9단계부터 날씨 경로만 반복한다.

7단계 뒤 위치 표시는 8-B로 바로 이어지고 날씨 조회는 8-A→9→10→11→12→13으로
진행한다. 위치가 성공해도 날씨가 실패할 수 있으므로 두 UI 상태는 합치지 않는다.

### FLOW-04: 현재 값을 기록으로 저장

1. 사용자가 현재 상태 화면에서 기록 만들기 버튼을 누른다.
2. `createObservation`이 근접 센서 결과를 기록용 `ProximitySnapshot`으로
   복사·정규화한다.
3. Zustand `setCaptureContext`가 근접 센서, 위치, 날씨, platform과 캡처 시각을
   하나의 `CaptureContext`로 memory에 저장한다.
4. Expo Router가
   [`/observations/new`](../app/observations/new.tsx) route를 연다.
5. 새 기록 화면이 store의 `CaptureContext`를 읽고 form 또는 방어 화면을
   선택한다.
6. 사용자가 제목·메모를 입력하고 category를 선택해 form state를 갱신한다.
7. 사용자가 저장 버튼을 눌러 제출 절차를 시작한다.
8. React Hook Form의 `handleSubmit`이 Zod resolver로 제출값을 검증한다.
   검증 실패는 field 오류를 표시하고 멈추며, 성공한 값만 다음 단계로 간다.
9. 검증된 form 값과 `CaptureContext`를 합쳐 mutation에 전달한다.
10. mutation pending 동안 저장 문구를 spinner로 바꾸고 취소·저장 동작을
    잠근다.
11. `useCreateObservationMutation`이
    [`createObservation`](../src/db/observations.ts)을 호출한다.
12. repository가 값을 다시 검증하고 named parameter로 binding해 INSERT한다.
13. mutation 결과 경로를 구분한다.
    - `13-A`: 실패하면 입력값과 snapshot을 유지한 오류 UI를 표시하며,
      사용자는 7단계부터 다시 시도할 수 있다.
    - `13-B`: 성공 callback이 observation query를 invalidate한다.
14. 일회용 `CaptureContext`를 지우는 경로를 구분한다.
    - `14-A`: 저장 성공 뒤 작성 화면이 context를 지운다.
    - `14-B`: 사용자가 취소하면 context를 먼저 지운다.
    - `14-C`: 화면 blur 또는 unmount의 focus cleanup이 다른 이탈 경로의
      잔여 context를 지운다.
15. 작성 route를 떠나는 명시적 navigation 경로를 구분한다.
    - `15-A`: 저장 성공 뒤 작성 route를 history에서 제거하고 기록 tab으로
      이동한다.
    - `15-B`: 취소 처리를 마치고 이전 route로 돌아간다.

사용자 취소는 6단계 이후 언제든 14-B→15-B로 갈 수 있다. 저장 성공은
13-B→14-A→15-A로 이어지고, route가 실제로 focus를 잃으면 14-C가 안전망으로
동작한다.

### FLOW-05: 기록 조회, 상세 이동과 삭제

1. 사용자가 기록 tab을 열면
   [`RecordsScreen`](<../app/(tabs)/records.tsx>) route가 render된다.
2. 기록 화면이 SQLite 기반 list query를 요청한다.
3. list query hook이 `listObservations` repository를 호출한다.
4. repository가 최신순 SELECT 결과를 `mapObservationRow`로 변환한다.
5. 기록 화면이 query 결과에 따라 pending, error, empty 또는 data 목록을
   표시한다.
6. 사용자가 목록 row를 누른다.
7. row callback이 선택한 id를 `/observations/[id]` 동적 route에 전달한다.
8. [`ObservationDetailScreen`](<../app/observations/[id].tsx>)이 URL parameter를
   양의 정수로 검증한다.
9. 상세 화면이 유효한 id로 detail query를 요청한다.
10. detail query hook이 `getObservation` repository를 호출한다.
11. repository가 해당 id의 row를 조회하고 domain model로 변환한다.
12. 상세 화면이 invalid, pending, error, not-found 또는 success UI를 표시한다.
13. 사용자가 기록 삭제 버튼을 누른다.
14. 화면이 삭제 여부를 선택할 native `Alert`를 연다.
15. 사용자의 선택을 구분한다.
    - `15-A`: 취소하면 mutation 없이 `Alert`만 닫힌다.
    - `15-B`: 삭제를 확인하면 화면이 id를 delete mutation에 전달한다.
16. mutation pending 동안 삭제 문구를 spinner로 바꾸고 중복 실행을 막는다.
17. delete mutation이 `deleteObservation` repository를 호출한다.
18. repository가 id를 binding해 해당 row를 삭제한다.
19. mutation 결과 경로를 구분한다.
    - `19-A`: 실패하면 상세 정보와 다시 누를 수 있는 삭제 버튼을 유지한다.
    - `19-B`: 성공 callback이 list query를 invalidate하고 삭제된 detail
      cache를 제거한다.
20. cache 정리가 끝나면 상세 route를 기록 tab으로 교체한다.

취소 경로는 15-A에서 끝난다. 실패 경로는 19-A에서 13단계로 다시 시도할 수
있고, 성공 경로만 19-B→20단계로 이어진다.

### FLOW-06: 온도 단위 영속화

1. 사용자가 설정 tab을 열면
   [`SettingsScreen`](<../app/(tabs)/settings.tsx>) route가 render된다.
2. 설정 화면이 Zustand selector로 `temperatureUnit`과 action만 구독한다.
3. 사용자가 섭씨 또는 화씨 option을 누른다.
4. `setTemperatureUnit` action이 선택한 값을 현재 state에 반영한다.
5. store 갱신을 소비하는 두 경로를 구분한다.
   - `5-A`: 설정 화면이 현재 값과 같은 radio option을 선택 상태로 다시
     render한다.
   - `5-B`: `partialize`가 전체 state에서 `temperatureUnit`만 영속 대상으로
     고른다.
6. `createJSONStorage` adapter가 `expo-sqlite/kv-store`를 통해 설정을
   저장하고 다음 시작에 읽는다.
7. 앱을 다시 시작하면 persisted state가 store에 합쳐진 뒤 hydration 완료
   callback이 복원 완료를 알린다.
8. 표시값 변환을 요청하는 consumer를 구분한다.
   - `8-A`: 현재 상태 화면이 API의 섭씨 날씨값을 선택 단위로 요청한다.
   - `8-B`: 작성 미리보기와 상세 화면의 공용 `SnapshotSummary`가 저장된
     섭씨값을 선택 단위로 요청한다.
9. `convertTemperature`가 원본 섭씨를 바꾸지 않고 표시용 숫자를 계산한다.
10. 변환 결과를 표시하는 consumer를 구분한다.
    - `10-A`: 현재 상태 화면이 변환한 숫자와 단위 문자를 표시한다.
    - `10-B`: `SnapshotSummary`가 변환한 숫자와 단위 문자를 표시한다.

현재 실행에서 설정을 바꾸면 1→2→3→4 뒤 5-A의 설정 UI와 5-B→6의 저장
경로로 갈라진다. 온도 consumer가 render될 때는 8-A→9→10-A 또는
8-B→9→10-B를 따른다. 앱 재시작 때는 FLOW-01의 초기화 안에서 6→7을 거쳐
복원한 값이 같은 8→9→10 표시 경로에 사용된다.

## 3. Inline 주석 대상

다음 37개 파일은 언어 문법이 허용하는 comment를 source 안에 직접 둔다.

| 계층 | 대상 |
| --- | --- |
| Route와 screen | `app/**/*.tsx` 7개 |
| Screen test | `app-tests/**/*.tsx` 2개 |
| TypeScript domain code와 test | `src/**/*.ts`, `src/**/*.tsx` 18개 |
| Native bridge | `modules/proximity-sensor/index.ts`, `src/*.ts` 3개 |
| Android native | `build.gradle`, `AndroidManifest.xml`, `ProximitySensorModule.kt` |
| iOS native | `ProximitySensor.podspec`, `ProximitySensorModule.swift` |
| Tooling | `eslint.config.js`, `jest.setup.ts` |

반복되는 style literal과 닫는 괄호까지 한 줄씩 해설하지는 않는다.
대신 React Native layout이나 accessibility 동작을 이해하는 데 필요한 style
group과 prop은 해당 JSX와 함께 설명한다.

## 4. JSON 설정 파일 해설

JSON 표준에는 comment 문법이 없다. 아래 5개 파일은 내용을 JSONC나 JavaScript
config로 바꾸지 않고 이 절에서 설명한다.

### `package.json`

| key | 의미와 실제 consumer |
| --- | --- |
| `main` | `expo-router/entry`가 bundle 시작점을 Expo Router에 연결한다. |
| `scripts` | local 개발, lint, typecheck와 Jest 명령의 고정 진입점이다. |
| `dependencies` | device에 포함되는 runtime package와 직접 import하는 library다. |
| `devDependencies` | TypeScript, ESLint와 Jest처럼 개발·검증 때만 필요한 도구다. |
| `jest.preset` | `jest-expo`가 Expo/React Native test 환경을 구성한다. |
| `setupFilesAfterEnv` | 각 test 전에 `jest.setup.ts`의 native module mock을 등록한다. |
| `modulePathIgnorePatterns`, `testPathIgnorePatterns` | `.expo/`의 검사 복제본을 현재 source test와 중복 실행하지 않게 한다. |
| `moduleNameMapper` | `@/` alias를 repository root로 해석한다. |
| `private` | 이 app package를 npm registry에 실수로 publish하지 않게 한다. |

### `app.json`

| key | 의미와 실제 consumer |
| --- | --- |
| `name`, `slug`, `scheme` | 표시 이름, Expo project 이름과 deep-link scheme을 정한다. |
| `owner`, `extra.eas.projectId` | EAS의 `@jungjh0519/fieldlog` project와 연결한다. 인증 secret은 아니다. |
| `platforms` | 생성·검사 대상을 Android와 iOS로 제한한다. |
| `newArchEnabled` | 생성되는 native app에서 React Native New Architecture를 사용한다. |
| `ios.bundleIdentifier`, `android.package` | 각 platform의 고유 app identifier다. |
| `android.permissions` | app이 요청하는 foreground coarse/fine 위치 permission이다. |
| `android.blockedPermissions` | dependency나 debug 설정이 불필요한 permission을 release app에 추가하지 못하게 한다. |
| `plugins` | Router, location, splash와 SQLite config plugin을 CNG 단계에서 적용한다. |
| `expo-location` options | foreground 설명만 두고 background location과 foreground service를 비활성화한다. |
| `experiments.typedRoutes` | Expo Router route string에 TypeScript 검사를 적용한다. |
| `experiments.reactCompiler` | Expo가 지원하는 React Compiler 설정을 활성화한다. |

`app.json` 변경은 native project를 다시 생성하거나 development build를 새로
만들어야 할 수 있다. 이번 주석 작업에서는 어떤 값도 변경하지 않는다.

### `tsconfig.json`

| key | 의미와 실제 consumer |
| --- | --- |
| `extends` | Expo SDK가 제공하는 React Native TypeScript 기본 설정을 상속한다. |
| `strict` | nullable 값과 함수 인자 등을 엄격하게 검사한다. |
| `types: ["jest"]` | test source에서 `jest`, `describe`, `expect` type을 사용할 수 있게 한다. |
| `paths` | `@/*`를 repository root의 `./*`로 해석한다. |
| `include` | app source, Expo가 생성한 route type과 `expo-env.d.ts`를 검사한다. |

### `eas.json`

`build.development` 하나만 유지한다. `developmentClient: true`는 Expo Go가 아닌
custom development client를 만들고, `distribution: internal`은 store 제출이
아닌 등록 기기 설치용 artifact를 만든다. preview와 production profile은
학습 범위에 없다.

### `modules/proximity-sensor/expo-module.config.json`

| key | 의미와 실제 consumer |
| --- | --- |
| `platforms` | local Expo Module이 Apple platform과 Android source를 제공함을 알린다. |
| `apple.modules` | Expo autolinking이 Swift `ProximitySensorModule` class를 등록한다. |
| `apple.podspecPath` | CocoaPods가 읽을 local podspec 위치다. |
| `android.modules` | Expo autolinking이 Kotlin class의 fully-qualified name을 찾는다. |

이 metadata의 class 이름과 native source의 실제 package/class 이름이 다르면
build는 성공적으로 autolink할 수 없다.

## 5. 제외 대상

- `package-lock.json`: npm이 생성·갱신하는 dependency resolution snapshot
- `assets/images/`: binary image asset
- root `/android`, root `/ios`: Expo CNG가 생성하는 native project
- `.expo/`: Expo CLI와 검사 도구의 local output
- `modules/proximity-sensor/android/build/`: Gradle output
- 기존 계획, handoff와 학습 진행표: 이번 comment 작업으로 상태를 바꾸지 않음

## 6. Test를 읽을 때의 경계

- Jest의 native module은 [`jest.setup.ts`](../jest.setup.ts)가 mock한다.
- hook test가 `addListener` callback을 직접 호출해도 Kotlin/Swift sensor가
  실제로 event를 보냈다는 뜻은 아니다.
- screen test는 화면 분기, action 호출과 navigation 계약을 검증한다.
- repository test는 SQL 문자열에 사용자 값을 직접 넣지 않고 parameter를
  전달했는지 검증한다.
- Android Kotlin compile과 iOS EAS build·실기기 결과는 Jest 결과와 별도의
  증거 층이다.

## 7. 초보자 권장 읽기 순서

1. 이 문서의 FLOW-01과 `app/_layout.tsx`
2. 공용 type, schema와 Zustand store
3. FLOW-02의 TypeScript bridge → hook → Kotlin/Swift → screen
4. FLOW-03의 위치 → Query → Axios → Zod → screen
5. FLOW-04와 FLOW-05의 form → repository → cache → route
6. FLOW-06의 설정과 표시 시점 변환
7. 각 production file 옆의 test file
8. 마지막으로 Gradle, Podspec, autolinking metadata와 JSON 설정

각 단계에서는 먼저 `[파일 역할]`을 읽고, 같은 `FLOW` 번호를 검색해 다음
파일로 이동한다.
