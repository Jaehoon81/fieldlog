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
| `[FLOW-번호 / 관련 코드]` | 해당 FLOW의 정식 단계는 아니지만 이해에 필요한 type, helper, 공용 UI, 방어 경로나 추가 call site |
| `[주의]` | nullable 값, lifecycle, 비동기 경합, cache 또는 platform 차이 |
| `[검증 경계]` | 해당 코드나 test가 증명하는 것과 증명하지 않는 것 |

주석은 identifier를 번역하지 않는다. 예를 들어 `captureContext`,
`useQuery`, `isAvailableAsync`는 source와 문서에서 같은 이름으로 읽는다.

각 `[FLOW-번호]`와 `[FLOW-번호 / N단계]`는 source 전체에서 정확히 한 번만
사용한다. 단계에는 하나의 숫자만 쓰며 `1~3단계`, `1, 3단계`,
`1·3단계`처럼 범위나 여러 단계를 한 표식에 합치지 않는다.
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

2~3단계의 main database 준비와 4~5단계의 Zustand 설정 복원은 완료 시점이
겹칠 수 있는 별도 준비 경로다. 숫자는 source 탐색 순서이며 두 경로는
`HydratedRoutes`의 6단계에서 합류한다.

### FLOW-02: 근접 센서 monitoring

1. [`CurrentStatusScreen`](<../app/(tabs)/index.tsx>)이 focus될 때 지원 여부를
   확인해 달라고 `useProximity`에 요청한다.
2. hook이 TypeScript bridge의 `isAvailableAsync`를 호출하고 지원 여부를
   화면 상태에 반영한다.
3. 사용자가 모니터링 시작을 누르면 화면 handler가 iOS 안내 여부를 처리한 뒤
   hook의 `startMonitoring`을 호출한다.
4. hook이 실제 구독을 만들기 직전에 지원 여부를 다시 확인한다.
5. 지원되는 경우 hook이 첫 `onProximityChange` listener를 추가한다.
6. Android module이 `SensorManager`에 `SensorEventListener`를 등록한다.
7. iOS module이 `NotificationCenter` observer와 `UIDevice` monitoring을
   시작한다.
8. Android
   [`SensorEventListener`](../modules/proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ProximitySensorModule.kt)
   callback이 `ProximityEvent`를 JavaScript로 보낸다.
9. iOS
   [`NotificationCenter`](../modules/proximity-sensor/ios/ProximitySensorModule.swift)가
   현재 상태를 공통 `ProximityEvent`로 JavaScript에 보낸다.
10. hook의 listener callback이 활성 platform에서 온 event를 받는다.
11. 함수형 state update가 event를 반영하고 React가 현재 상태 화면을 다시
    render한다.
12. 사용자가 중지하거나 화면이 blur되면 hook이 JS subscription을 정리한다.
13. hook이 unmount되면 남은 비동기 응답과 JS subscription을 정리한다.
14. Android module이 등록된 `SensorEventListener`를 해제한다.
15. iOS module이 observer와 `UIDevice` monitoring을 해제한다.

Android 실행 경로는 5→6→8→10, iOS 실행 경로는 5→7→9→10으로 갈라졌다가
공통 11단계로 합류한다. 명시적 중지·blur는 12단계, unmount는 13단계에서
시작하며 현재 platform에 따라 14단계 또는 15단계 cleanup으로 이어진다.

### FLOW-03: 위치와 날씨 조회

1. 사용자가 현재 상태 화면의 위치 및 날씨 조회 버튼을 누른다.
2. 화면이 이전 위치·오류를 지우고 새 요청의 loading 상태를 시작한다.
3. `hasServicesEnabledAsync`로 위치 service가 켜져 있는지 확인한다.
4. 현재 foreground permission을 읽고 필요한 경우에만 권한을 요청한다.
5. 권한이 있으면 `getCurrentPositionAsync`로 현재 위치를 한 번 요청한다.
6. Expo Location 결과에서 필요한 값만 `LocationSnapshot`으로 바꿔 저장한다.
7. 좌표가 생기면
   [`useWeatherQuery`](../src/api/weather.ts)의 `enabled` 조건이 충족된다.
8. TanStack Query의 `queryFn`이 `AbortSignal`과 좌표를 `fetchWeather`에
   전달한다.
9. Axios가 Open-Meteo에 실제 HTTP 요청을 보낸다.
10. [`parseWeatherResponse`](../src/schemas/weather.ts)가 외부 `unknown`
   payload를 검증하고 `WeatherSnapshot`으로 변환한다.
11. 화면이 위치 loading, 원인별 오류, 성공과 미요청 상태를 구분해 표시한다.
12. 화면이 날씨 loading, 오류·재시도와 성공 상태를 별도로 표시한다.

### FLOW-04: 현재 값을 기록으로 저장

1. 사용자가 현재 상태 화면에서 기록 만들기 버튼을 누른다.
2. `createObservation`이 근접 센서, 위치, 날씨와 platform을 한 시점의
   snapshot으로 만든다.
3. Zustand `setCaptureContext`가 snapshot을 memory에 저장한다.
4. Expo Router가
   [`/observations/new`](../app/observations/new.tsx) route를 연다.
5. 새 기록 화면이 store의 `CaptureContext`를 읽고 form 또는 방어 화면을
   선택한다.
6. 저장 버튼이 React Hook Form의 `handleSubmit`을 실행하고 Zod resolver가
   제출값을 검증한다.
7. 검증된 form 값과 `CaptureContext`를 합쳐 mutation에 전달한다.
8. `useCreateObservationMutation`이
   [`createObservation`](../src/db/observations.ts)을 호출한다.
9. repository가 값을 다시 검증하고 named parameter로 binding해 INSERT한다.
10. mutation 성공 callback이 observation query를 invalidate한다.
11. 작성 화면이 일회용 `CaptureContext`를 지운다.
12. 작성 route를 history에서 제거하고 기록 tab으로 이동한다.

### FLOW-05: 기록 조회, 상세 이동과 삭제

1. [`RecordsScreen`](<../app/(tabs)/records.tsx>)이 SQLite 기반 list query를
   요청한다.
2. list query hook이 `listObservations` repository를 호출한다.
3. repository가 최신순 SELECT 결과를 `mapObservationRow`로 변환한다.
4. 사용자가 row를 누르면 id를 `/observations/[id]` 동적 route에 전달한다.
5. [`ObservationDetailScreen`](<../app/observations/[id].tsx>)이 URL parameter를
   양의 정수로 검증한다.
6. 상세 화면이 유효한 id로 detail query를 요청한다.
7. detail query hook이 `getObservation` repository를 호출한다.
8. repository가 해당 id의 row를 조회하고 domain model로 변환한다.
9. 사용자가 삭제를 확인하면 화면이 id를 delete mutation에 전달한다.
10. delete mutation이 `deleteObservation` repository를 호출한다.
11. repository가 id를 binding해 해당 row를 삭제한다.
12. mutation 성공 callback이 list query를 invalidate하고 삭제된 detail
    cache를 제거한다.
13. 상세 화면이 기록 tab으로 돌아간다.

### FLOW-06: 온도 단위 영속화

1. [`SettingsScreen`](<../app/(tabs)/settings.tsx>)이 Zustand selector로
   `temperatureUnit`과 action만 구독한다.
2. 사용자가 섭씨 또는 화씨를 누르면 `setTemperatureUnit`이 store를 갱신한다.
3. store action이 선택한 `temperatureUnit`을 현재 state에 반영한다.
4. `partialize`가 전체 state에서 `temperatureUnit`만 영속 대상으로 고른다.
5. `createJSONStorage`가 `expo-sqlite/kv-store`를 통해 설정을 저장하고 읽는다.
6. 앱을 다시 시작하면 hydration 완료 callback이 복원 완료를 알린다.
7. `convertTemperature`가 원본 섭씨를 바꾸지 않고 표시할 때만 선택한 단위로
   변환한다.

현재 실행에서 설정을 바꿀 때는 1→5단계를 거친 뒤 React render가 7단계를
다시 사용한다. 앱 재시작 때는 FLOW-01의 초기화 경로 안에서 5→6단계를 거쳐
복원한 값이 7단계의 표시 계산에 사용된다.

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
