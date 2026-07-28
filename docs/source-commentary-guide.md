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
| `[FLOW-번호 / 단계]` | 사용자 동작부터 최종 상태까지 여러 파일을 잇는 실행 순서 |
| `[주의]` | nullable 값, lifecycle, 비동기 경합, cache 또는 platform 차이 |
| `[검증 경계]` | 해당 코드나 test가 증명하는 것과 증명하지 않는 것 |

주석은 identifier를 번역하지 않는다. 예를 들어 `captureContext`,
`useQuery`, `isAvailableAsync`는 source와 문서에서 같은 이름으로 읽는다.

## 2. 먼저 따라갈 여섯 가지 흐름

### FLOW-01: 앱 시작과 route 표시

1. [`RootLayout`](../app/_layout.tsx)이 error boundary와 `Suspense`를 준비한다.
2. `SQLiteProvider`가 `fieldlog.db`를 열고
   [`migrateDatabase`](../src/db/migrate.ts)를 실행한다.
3. Zustand `persist`가
   [`temperatureUnit`](../src/store/app-store.ts)을 SQLite key-value storage에서
   복원한다.
4. `hasHydrated`가 `true`가 된 뒤
   [`QueryClient`](../src/query-client.ts)와 Expo Router `Stack`을 표시한다.
5. [`TabLayout`](<../app/(tabs)/_layout.tsx>)이 현재 상태, 기록, 설정 route를
   하단 tab으로 구성한다.

### FLOW-02: 근접 센서 monitoring

1. [`CurrentStatusScreen`](<../app/(tabs)/index.tsx>)이 focus될 때 지원 여부를
   확인한다.
2. 사용자가 모니터링 시작을 누르면
   [`useProximity`](../src/hooks/use-proximity.ts)의 `startMonitoring`을 호출한다.
3. hook이 TypeScript bridge의
   [`isAvailableAsync`](../modules/proximity-sensor/src/ProximitySensorModule.ts)를
   호출한 뒤 `onProximityChange` listener를 추가한다.
4. Expo Modules API가 첫 listener를 감지하면 Android 또는 iOS native
   module이 platform sensor monitoring을 시작한다.
5. Android
   [`SensorEventListener`](../modules/proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ProximitySensorModule.kt)
   또는 iOS
   [`NotificationCenter`](../modules/proximity-sensor/ios/ProximitySensorModule.swift)가
   공통 `ProximityEvent`를 JavaScript로 보낸다.
6. hook의 함수형 state update가 event를 반영하고 React가 현재 상태 화면을
   다시 render한다.
7. 중지, 화면 이탈, background 진입 또는 module destroy 시 각 계층이 자기
   listener와 native resource를 정리한다.

### FLOW-03: 위치와 날씨 조회

1. 사용자가 현재 상태 화면의 위치 및 날씨 조회 버튼을 누른다.
2. 화면이 위치 service와 foreground permission을 순서대로 확인한다.
3. `getCurrentPositionAsync`의 결과를 내부 `LocationSnapshot`으로 바꾼다.
4. 좌표가 생기면
   [`useWeatherQuery`](../src/api/weather.ts)의 `enabled` 조건이 충족된다.
5. TanStack Query가 제공한 `AbortSignal`을 Axios가 Open-Meteo 요청에
   전달한다.
6. [`parseWeatherResponse`](../src/schemas/weather.ts)가 외부 `unknown`
   payload를 검증하고 `WeatherSnapshot`으로 변환한다.
7. 화면은 위치 오류, 날씨 오류, 재시도와 성공 상태를 서로 구분해 표시한다.

### FLOW-04: 현재 값을 기록으로 저장

1. 현재 상태 화면의 `createObservation`이 근접 센서, 위치, 날씨와 platform을
   한 `CaptureContext`로 고정한다.
2. Zustand `setCaptureContext`가 임시 snapshot을 memory에 저장한다.
3. Expo Router가
   [`/observations/new`](../app/observations/new.tsx) route를 연다.
4. React Hook Form이 입력 상태를 관리하고 Zod resolver가 제출값을 검증한다.
5. `useCreateObservationMutation`이
   [`createObservation`](../src/db/observations.ts)을 호출한다.
6. repository가 사용자 입력을 SQL 문자열에 합치지 않고 named parameter로
   binding한다.
7. 성공하면 observation query를 invalidate하고 `CaptureContext`를 지운 뒤
   기록 tab으로 이동한다.

### FLOW-05: 기록 조회, 상세 이동과 삭제

1. [`RecordsScreen`](<../app/(tabs)/records.tsx>)이 SQLite 기반 list query를
   실행한다.
2. database row는 `mapObservationRow`를 거쳐 camelCase domain model로
   변환된다.
3. 사용자가 row를 누르면 `/observations/[id]` 동적 route로 이동한다.
4. [`ObservationDetailScreen`](<../app/observations/[id].tsx>)이 URL parameter를
   양의 정수로 검증한 뒤 detail query를 실행한다.
5. 삭제를 확인하면 mutation이 row를 제거하고 list query를 invalidate하며
   삭제된 detail cache를 제거한다.
6. 화면은 기록 tab으로 돌아가 SQLite의 최신 상태를 다시 표시한다.

### FLOW-06: 온도 단위 영속화

1. [`SettingsScreen`](<../app/(tabs)/settings.tsx>)이 Zustand selector로
   `temperatureUnit`과 action만 구독한다.
2. 사용자가 섭씨 또는 화씨를 누르면 `setTemperatureUnit`이 store를 갱신한다.
3. Zustand `persist`의 `partialize`가 `temperatureUnit`만
   `expo-sqlite/kv-store`에 저장한다.
4. 앱을 다시 시작하면 FLOW-01의 hydration 과정이 저장값을 복원한다.
5. [`SnapshotSummary`](../src/components/snapshot-summary.tsx)는 원본 섭씨를
   바꾸지 않고 표시할 때만 선택한 단위로 변환한다.

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
