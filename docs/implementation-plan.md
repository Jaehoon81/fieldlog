# FieldLog 샘플 앱 구현 계획

> 상태: 구현·검증·GitHub 1차 push 완료, 대화형 학습 진행 중

## 1. 요약

- 앱 이름은 `FieldLog`, slug와 scheme은 `fieldlog`, Android/iOS 식별자는 `com.jaehoon.fieldlog`로 설정한다.
- 이 앱의 최우선 목적은 이후의 큰 프로젝트에 활용할 Expo 기반 React Native 핵심 패턴을 최소 기능으로 학습하는 것이다.
- Android 휴대폰과 iPhone만 대상으로 하며 Expo SDK 54, TypeScript strict mode, Expo Router, New Architecture를 유지한다.
- Expo가 제공하는 native module로 `expo-location`을 사용하고, Android/iOS platform API를 사용하는 근접 센서를 local Expo Module로 직접 구현한다.
- TanStack Query, Axios, Zustand, React Hook Form, Zod를 모두 사용하되 각 도구에는 하나의 명확한 학습 역할만 부여한다.
- 근접 센서, 위치, 날씨, 사용자 입력을 하나의 스냅샷으로 SQLite에 저장하고 생성, 조회, 상세 확인, 삭제까지만 구현한다.
- Git을 이용한 source 관리, store 출시, 운영 및 유지보수는 범위에서 제외한다.
- 구현과 검증을 마친 최신 소스를 기준으로 `docs/learning-guide.md`를 작성하고, 학습 완료 후 이 샘플 프로젝트를 종료한다.

## 2. 기능과 화면

### 2.1 현재 상태 탭

- 근접 센서 지원 여부를 확인하고 `모니터링 시작`과 `모니터링 중지`를 사용자가 직접 제어한다.
- 근접 센서 UI 상태를 `idle`, `pending`, `near`, `far`, `unavailable`로 구분한다.
- 상태 탭 진입 시 `isAvailableAsync()`를 호출해 지원 기기는 `idle`, 미지원 기기는 `unavailable`로 시작한다. 기록 생성은 상태가 `near`, `far`, `unavailable` 중 하나로 확정된 뒤에만 허용하고 `idle`, `pending`에서는 비활성화한다.
- Android에서는 센서가 제공하는 거리와 최대 범위를 표시하고, iOS에서는 거리값을 제공하지 않는 차이를 `null`로 정규화해 설명한다.
- iOS에서 proximity monitoring 중 화면이 꺼질 수 있음을 시작 전에 안내하고, 화면이 다시 켜진 뒤 확인할 수 있도록 마지막 `near` 감지 시각을 별도로 표시한다.
- 사용자가 버튼을 눌렀을 때만 foreground 위치 권한을 요청한다.
- 획득한 좌표를 사용해 Open-Meteo의 현재 날씨를 조회한다.
- 위치 및 날씨 요청 중에는 불완전한 상태를 캡처하지 않도록 기록 생성 버튼을 비활성화한다.
- 기록 생성 버튼을 누르면 현재 근접 센서, 위치, 날씨 값을 고정한 `CaptureContext`를 만들고 생성 화면으로 이동한다.
- 위치 또는 날씨가 없어도 센서와 사용자 입력만으로 기록을 만들 수 있다.
- 백그라운드 위치 수집은 구현하지 않는다.

### 2.2 기록 생성

- 제목, 메모, 카테고리를 입력하고 고정된 `CaptureContext`를 하나의 SQLite 기록으로 저장한다.
- 생성 화면에는 저장될 센서, 위치, 날씨 스냅샷의 요약을 표시한다.
- 제목은 trim 후 1자 이상 60자 이하로 검증한다.
- 메모는 최대 500자로 제한한다.
- 카테고리는 `experiment`, `environment`, `other` 중 하나로 제한한다.
- 위치 권한 거부나 날씨 조회 실패가 기록 생성을 막지는 않는다.
- 사용할 수 있는 센서 정보와 사용자 입력만 저장하며 가짜 날씨 데이터로 대체하지 않는다.
- 저장 성공, 취소, hardware/gesture back, 화면 이탈 시 `CaptureContext`를 제거한다.
- `CaptureContext` 없이 생성 route에 직접 접근한 경우 안내 후 현재 상태 탭으로 돌아갈 수 있게 한다.

### 2.3 기록 탭

- `FlatList`로 저장된 기록을 `captured_at DESC, id DESC` 고정 순서로 표시한다.
- 기록이 없을 때 빈 상태를 표시한다.
- 기록 상세 route에서 사용자 입력과 저장 당시 센서, 위치, 날씨 스냅샷을 확인한다.
- 상세 화면에서 삭제 확인 후 기록을 삭제하고 목록으로 돌아간다.
- 학습 범위를 작게 유지하기 위해 수정, 카테고리 필터, 정렬 선택은 구현하지 않는다.

### 2.4 설정 탭

- 섭씨/화씨 표시 단위를 선택할 수 있다.
- 온도 단위는 앱 재실행 후에도 유지한다.
- Open-Meteo attribution과 이 앱이 비상업 학습용이라는 범위를 표시한다.
- 정렬, 필터, theme 등 다른 설정은 추가하지 않는다.

### 2.5 UI 원칙

- `ScrollView`, `FlatList`, `Pressable`, `TextInput`, `ActivityIndicator`, `Alert`, `KeyboardAvoidingView` 등 React Native 기본 컴포넌트를 중심으로 구성한다.
- 카테고리와 온도 단위 선택은 별도 segmented control 패키지 없이 `Pressable` 기반 선택 그룹으로 구현한다.
- 기존 아이콘 패키지를 사용하며 별도 UI 프레임워크는 추가하지 않는다.
- light theme만 지원하고 `react-native-safe-area-context`와 현재 Android edge-to-edge 설정을 고려한다.
- 단순하고 절제된 스타일을 적용하며 접근성 label, role, selected/disabled 상태를 제공한다.
- 빈 상태, loading, 오류, 권한 거부, 위치 서비스 꺼짐, 센서 미지원 상태를 각각 구분해 표시한다.

## 3. 라이브러리별 역할

### 3.1 TanStack Query

- 사용자가 위치 및 날씨 조회를 요청했을 때 날씨의 loading, error, success, refetch 상태와 cache를 관리한다.
- SQLite 기록 목록과 상세 조회를 query로, 생성과 삭제를 mutation으로 감싼다.
- 생성과 삭제 성공 후 `observations` query prefix를 invalidate한다.
- 날씨 query는 좌표가 있을 때만 실행하고 stale time은 5분으로 설정한다.
- retry는 network 오류와 5xx 응답에만 1회 적용하고, 4xx 또는 Zod 검증 오류에는 적용하지 않는다.
- SQLite mutation은 중복 쓰기를 피하기 위해 retry하지 않는다.
- React Native `onlineManager`, app focus/reconnect 자동 refetch, query cache persistence, optimistic update는 추가하지 않는다.

### 3.2 Axios

- `https://api.open-meteo.com/v1/forecast`를 호출한다.
- 좌표와 `current=temperature_2m,apparent_temperature,weather_code`, `temperature_unit=celsius`, `timezone=GMT`를 요청해 응답 시각을 UTC 기준으로 고정한다.
- timeout은 10초로 설정하며 별도 API key는 사용하지 않는다.
- TanStack Query가 제공하는 `AbortSignal`을 Axios 요청에 전달한다.
- Axios instance, interceptor, 범용 API layer는 만들지 않고 하나의 weather client만 구현한다.
- 설정 화면에 `Weather data by Open-Meteo.com` attribution을 표시한다.
- API 문서: [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs)
- 이용 조건: [Open-Meteo Terms](https://open-meteo.com/en/terms)

### 3.3 Expo SQLite

- `SQLiteProvider`를 애플리케이션 루트에 배치한다.
- `useSuspense` loading UI와 `onError` 초기화 실패 UI를 제공한다.
- 초기화 시 WAL을 활성화하고 `PRAGMA user_version=1` 기반의 초기 migration을 실행한다.
- table, index, `user_version` 변경은 `withExclusiveTransactionAsync()` 안에서 처리한다.
- schema 생성처럼 상수로 고정된 SQL만 `execAsync()`로 실행하고, 사용자 입력이 포함된 CRUD에는 parameter binding을 사용한다.
- `captured_at, id` 기준 조회를 위한 index를 생성한다.
- `expo-sqlite/kv-store`를 Zustand 설정 영속화 저장소로도 사용한다.

### 3.4 Zustand

- 하나의 `useAppStore`에서 영속 상태와 일시 상태를 함께 관리한다.
- `temperatureUnit`은 `persist`와 `expo-sqlite/kv-store`로 영속화한다.
- `CaptureContext`는 현재 센서, 위치, 날씨 스냅샷을 생성 화면에 전달하는 일시 상태로 사용한다.
- `partialize`로 `temperatureUnit`만 저장하고 `CaptureContext`는 앱 재실행 후 복구하지 않는다.
- 비동기 저장소 hydration 완료 여부를 `hasHydrated`로 관리해 기본값이 잠깐 보였다가 바뀌는 현상을 막는다.
- store에는 `setTemperatureUnit`, `setCaptureContext`, `clearCaptureContext`처럼 실제로 필요한 action만 둔다.

### 3.5 React Hook Form과 Zod

- 기록 생성 form 상태는 React Hook Form으로 관리한다.
- `@hookform/resolvers`를 사용해 Zod 스키마와 연결한다.
- 동일한 Zod 스키마를 UI 입력과 저장 경계의 검증에 사용한다.
- Open-Meteo 응답 역시 별도의 Zod 스키마로 검증한 후 내부 모델로 변환한다.
- 수정 form이나 범용 form abstraction은 만들지 않는다.

## 4. 데이터 모델과 흐름

### 4.1 주요 타입

```ts
type ProximityUiStatus = 'idle' | 'pending' | 'near' | 'far' | 'unavailable';

type ProximityEvent = {
  status: 'near' | 'far';
  distanceCm: number | null;
  maxRangeCm: number | null;
  observedAt: number;
};

type ProximitySnapshot = {
  status: 'near' | 'far' | 'unavailable';
  distanceCm: number | null;
  maxRangeCm: number | null;
  observedAt: number | null;
};

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  observedAt: number;
};

type WeatherSnapshot = {
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  observedAt: number;
};

type ObservationCategory = 'experiment' | 'environment' | 'other';

type TemperatureUnit = 'celsius' | 'fahrenheit';
```

`idle`과 `pending`은 UI 상태로만 사용하고 SQLite에는 저장하지 않는다. `unavailable` snapshot은 거리, 최대 범위, 관측 시각을 모두 `null`로 저장한다.

### 4.2 SQLite 스키마

`observations` 테이블은 다음 데이터를 저장한다.

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `title TEXT NOT NULL`
- `note TEXT NOT NULL DEFAULT ''`
- `category TEXT NOT NULL CHECK (category IN ('experiment', 'environment', 'other'))`
- `proximity_state TEXT NOT NULL CHECK (proximity_state IN ('near', 'far', 'unavailable'))`
- `distance_cm REAL NULL`
- `max_range_cm REAL NULL`
- `platform TEXT NOT NULL CHECK (platform IN ('android', 'ios'))`
- `proximity_observed_at TEXT NULL`
- `latitude REAL NULL`
- `longitude REAL NULL`
- `location_accuracy_m REAL NULL`
- `location_observed_at TEXT NULL`
- `temperature_c REAL NULL`
- `apparent_temperature_c REAL NULL`
- `weather_code INTEGER NULL`
- `weather_observed_at TEXT NULL`
- `captured_at TEXT NOT NULL`

TypeScript에서는 관측 시각을 epoch milliseconds로 다루고 저장 경계에서 UTC ISO 8601 문자열로 변환한다. Open-Meteo의 `current.time`도 같은 기준으로 정규화한다.
온도는 항상 섭씨로 저장하고 화면에 표시할 때 Zustand 설정에 따라 화씨로 변환한다.
목록 query는 `ORDER BY captured_at DESC, id DESC`로 고정하고 `(captured_at DESC, id DESC)` index를 생성한다.

### 4.3 데이터 흐름

1. root provider가 SQLite migration과 Zustand hydration을 끝낸 후 route를 표시한다.
2. 현재 상태 화면이 focus 상태에서 사용자의 모니터링 시작 요청을 받으면 근접 센서 listener를 등록한다.
3. 사용자가 위치 및 날씨 조회 버튼을 누르면 기존 위치와 날씨를 지우고 Expo Location으로 새 좌표를 획득한다.
4. 위치 획득에 성공하면 Axios가 Open-Meteo를 호출하고 Zod가 응답을 내부 model로 변환한다.
5. 위치는 성공했지만 날씨가 실패한 경우 새 위치는 유지하고 날씨만 비어 있는 상태로 둔다.
6. 기록 생성 버튼을 누르면 현재 값을 Zustand의 일시적인 `CaptureContext`로 고정하고 생성 route를 연다.
7. React Hook Form과 Zod가 사용자 입력을 검증한 후 Expo SQLite에 기록을 저장한다.
8. 생성 mutation이 `observations` query를 invalidate하고 기록 목록이 SQLite를 최신순으로 다시 조회한다.
9. 상세 route의 삭제 mutation도 관련 목록과 상세 query를 정리한 후 기록 탭으로 이동한다.

## 5. 프로젝트 구조

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    records.tsx
    settings.tsx
  observations/
    new.tsx
    [id].tsx

src/
  api/
    weather.ts
  components/
    snapshot-summary.tsx
  db/
    migrate.ts
    observations.ts
  hooks/
    use-proximity.ts
  query-client.ts
  schemas/
    observation.ts
    weather.ts
  store/
    app-store.ts
  types/
    observation.ts
    weather.ts

modules/
  proximity-sensor/
    android/
    ios/
    src/
```

- Expo Router의 `app` 계층은 route와 화면 조합만 담당한다.
- `src`는 weather client, 공용 표시 component, DB, 공통 hook, app-wide query 정책, schema, store와 domain type처럼 route 밖의 공통 TypeScript 코드를 보관한다.
- 직접 작성한 Kotlin과 Swift 코드는 `modules/proximity-sensor`에 둔다.
- Android/iOS 차이는 native module이 공통 event payload로 정규화하고, 별도의 `*.android.ts`, `*.ios.ts` adapter는 만들지 않는다.
- 공통 UI component는 실제로 두 화면 이상에서 재사용될 때만 분리한다.
- 생성되는 `android/`, `ios/` 디렉터리는 재생성 가능한 CNG 산출물로 취급하고 직접 수정하거나 source의 기준으로 사용하지 않는다.

## 6. Expo와 Native 기능 경계

### 6.1 Expo가 제공하는 native module

- 위치 기능은 `expo-location`으로 구현한다.
- 공식 config plugin의 `locationWhenInUsePermission`으로 현재 위치의 날씨를 불러오기 위한 iOS foreground 권한 설명을 설정한다.
- background location 관련 config는 모두 비활성화하고 Android manifest와 iOS native 설정에 background 권한이 생성되지 않았는지 prebuild 결과에서 확인한다.
- 사용자가 조회 버튼을 누르면 `getForegroundPermissionsAsync()`로 현재 상태를 확인한 후 필요한 경우에만 권한을 요청한다.
- `canAskAgain=false`이면 재요청 대신 운영체제 설정 화면을 안내한다.
- 위치 서비스가 꺼진 상태와 권한 거부를 서로 다른 오류로 표시한다.
- 일회성 위치는 `Accuracy.Balanced`로 조회하고 좌표, 정확도, 관측 시각을 보존한다.
- 새 조회를 시작할 때 이전 위치와 날씨를 제거해 오래된 값을 새 스냅샷으로 오인하지 않게 한다.
- 권한 설명은 현재 위치의 날씨를 불러오기 위한 목적을 명시한다.
- 연속 위치 구독, background 권한과 background 위치 기능은 추가하지 않는다.
- SDK 참고: [Expo Location](https://docs.expo.dev/versions/v54.0.0/sdk/location/)

### 6.2 직접 구현하는 platform native module

- Expo SDK 54의 센서 목록에서 직접 제공하지 않는 근접 센서를 local Expo Module로 구현한다.
- 서드파티 근접 센서 wrapper는 사용하지 않는다.
- SDK 참고: [Expo Sensors](https://docs.expo.dev/versions/v54.0.0/sdk/sensors/)

Android 구현:

- Kotlin에서 `SensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)`를 사용한다.
- `SensorEventListener`로 거리 변경을 수신한다.
- `distance < maxRange`를 기준으로 `near` 상태를 계산한다.
- `SensorManager.SENSOR_DELAY_NORMAL`을 사용한다.
- sensor가 없거나 listener 등록이 실패하면 `unavailable`로 처리한다.
- 센서가 제공하는 거리와 최대 범위를 TypeScript 계층에 전달한다.
- API 참고: [Android SensorManager](https://developer.android.com/reference/android/hardware/SensorManager)

iOS 구현:

- Swift에서 `UIDevice.current.isProximityMonitoringEnabled`를 사용한다.
- availability 확인 시 monitoring을 활성화해 값이 실제로 `true`가 되는지 확인하고, JS listener가 없다면 즉시 다시 비활성화한다.
- `UIDevice.proximityStateDidChangeNotification`을 관찰한다.
- `UIDevice.current.proximityState`를 `near` 상태로 전달한다.
- iOS API가 실제 거리값을 제공하지 않으므로 거리 필드는 `null`로 정규화한다.
- monitoring이 활성화되면 기기가 화면을 끌 수 있음을 UI에서 미리 알리고, 마지막 `near` 감지 시각은 화면이 다시 켜진 뒤에도 확인할 수 있게 유지한다.
- API 참고: [UIDevice proximity monitoring](https://developer.apple.com/documentation/uikit/uidevice/isproximitymonitoringenabled)

### 6.3 Native module 계약

- module 이름은 `ProximitySensor`로 등록한다.
- `isAvailableAsync(): Promise<boolean>`를 제공한다.
- `onProximityChange` 이벤트는 `ProximityEvent` payload를 제공한다.
- 첫 JS listener가 추가되면 현재 센서 상태를 한 번 즉시 전송해 실제 변화가 발생하기 전에도 `pending`을 벗어나게 한다.
- 현재 상태 화면의 모니터링 시작 동작이 listener를 추가하고, 중지 또는 화면 이탈이 listener를 제거한다.

```text
platform sensor registered = JS listener exists && app is foreground
```

- Android는 `OnStartObserving`, `OnStopObserving`, `OnActivityEntersForeground`, `OnActivityEntersBackground`, `OnDestroy`를 사용한다.
- iOS는 `OnStartObserving`, `OnStopObserving`, `OnAppEntersForeground`, `OnAppEntersBackground`, `OnDestroy`를 사용한다.
- listener 제거, 앱 background 진입, module destroy 시 sensor/notification observer를 반드시 해제한다.
- foreground 복귀 시 JS listener가 남아 있는 경우에만 다시 등록한다.
- native sensor와 `UIDevice` 조작은 main queue에서 실행한다.
- 등록과 해제는 중복 호출에 안전한 idempotent 동작으로 구현한다.
- 참고 문서: [Create a local Expo module](https://docs.expo.dev/modules/get-started/), [Expo Modules API](https://docs.expo.dev/modules/module-api/)

근접 센서는 별도 permission, entitlement, manifest 설정이 필요하지 않으므로 목적 없는 custom config plugin은 만들지 않는다. local Expo Module과 Expo Modules API를 native 확장 경계로 사용한다.

## 7. Managed Workflow와 EAS

- `newArchEnabled: true`를 유지한다.
- `name`, `slug`, `scheme`, `android.package`, `ios.bundleIdentifier`를 FieldLog 값으로 변경한다.
- `platforms`는 Android와 iOS로 제한하고 web script, web config, `react-dom`, `react-native-web`을 제거한다.
- 휴대폰 센서 학습에 집중하기 위해 `ios.supportsTablet: false`로 설정한다.
- theme 구현 범위를 줄이기 위해 `userInterfaceStyle: light`로 고정한다.
- `expo-dev-client`, `expo-location`, `expo-sqlite`는 `npx expo install`로 SDK 호환 버전을 설치한다.
- TanStack Query v5, Axios v1, Zustand v5, React Hook Form v7, Zod v4, `@hookform/resolvers` v5를 npm으로 설치하고 실제 설치 버전은 lockfile에 고정한다.
- Jest, `jest-expo`, `@testing-library/react-native`, Jest type은 Expo 호환 버전으로 설치한다.
- 구현이 끝나면 실제 import와 Expo Router 필수 의존성을 대조하고, `create-expo-app` 템플릿에서 남은 미사용 package와 reset 예제 파일만 제거한다.
- custom native module이 포함되지 않는 Expo Go는 구현 이후 사용하지 않고 development build로 전환한다.
- Android는 `npx expo prebuild --clean --platform android` 결과를 검사하고 local development build로 Kotlin compile과 실제 기기 실행을 확인한다.
- Windows에서 직접 빌드하기 어려운 iOS native 통합은 EAS 원격 빌드로 검증한다.
- 참고 문서: [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)

`eas.json`에는 학습에 필요한 profile 하나만 정의한다.

- `development`: `developmentClient: true`, `distribution: internal`

Expo 계정 로그인과 iPhone device 등록 후 Android와 iOS EAS development build를 실제 생성하고 `npx expo start --dev-client`로 실행한다. native code를 변경한 뒤에는 development build를 다시 생성한다.

- 참고 문서: [Create a development build with EAS](https://docs.expo.dev/develop/development-builds/create-a-build/)

생성된 `android/`, `ios/`는 CNG 결과 확인과 native compile에만 사용하며 직접 수정하지 않는다. local Expo Module과 config plugin/CNG로 해결할 수 없는 문제가 생기더라도 이 샘플 앱에서는 bare workflow로 전환하거나 범위를 확장하지 않고 제한사항으로 기록한다.

preview/production EAS profile, store build, submission, update 배포는 구현하지 않는다.

## 8. 구현 순서

1. 이 계획서를 구현 기준으로 확정한다.
2. 첫 source, package, build, app config 변경 전에 실제 영향 범위를 다시 읽고 `[Impact Review]`를 작성한다.
3. FieldLog app config, Android/iOS 전용 범위, Expo Location plugin, development EAS profile을 구성한다.
4. 필수 runtime 의존성과 최소 테스트 의존성을 설치한다.
5. QueryClient, SQLiteProvider, migration, observation repository를 구현한다.
6. Zod schema, Zustand store, Axios weather client를 구현한다.
7. local `ProximitySensor` module의 Kotlin과 Swift 코드를 구현한다.
8. 공통 `use-proximity` hook과 현재 상태 탭을 구현한다.
9. 기록 생성, 목록, 상세, 삭제 flow를 구현한다.
10. 온도 단위 설정과 hydration 처리를 구현한다.
11. 학습 가치가 높은 단위 및 component test를 추가한다.
12. 정적 검사, Expo 진단, Android prebuild/local build를 검증한다.
13. Android와 iOS EAS development build를 생성한다.
14. Android 기기와 iPhone에서 실기기 기능을 검증한다.
15. 이 문서에 자동화, build, 실기기 검증 결과와 남은 제한사항을 구분해 기록한다.
16. 검증된 최신 소스를 기준으로 `docs/learning-guide.md`를 작성한다.
17. 학습서를 따라 핵심 flow를 복습한 뒤 이 샘플 프로젝트를 종료한다.

## 9. 테스트와 완료 기준

### 9.1 자동화 검사

- `npm run lint`
- `npm run typecheck`
- `npm test -- --runInBand`
- `npx expo-doctor@latest`

테스트 환경은 Expo 호환 버전의 Jest, `jest-expo`, React Native Testing Library를 사용한다. React 19에서 지원되지 않는 `react-test-renderer`는 설치하거나 사용하지 않는다.
Expo Router test가 필요한 경우 기존 `expo-router/testing-library`를 사용하며 test file은 route로 인식되는 `app/` 밖에 둔다.
EAS build inspect가 `.expo/` 아래에 만드는 source 복제본은 현재 source의 test를 중복 수집하므로 Jest의 module path와 test path에서 제외한다.

### 9.2 단위 및 컴포넌트 테스트

- 제목, 메모, 카테고리 Zod 경계값
- Open-Meteo 응답 검증과 내부 모델 변환
- 섭씨/화씨 변환
- 근접 센서 event payload와 `idle`, `pending`, `near`, `far`, `unavailable` hook 상태 전이
- SQLite row와 domain model 변환
- parameter binding을 사용하는 repository 호출
- 생성 및 삭제 mutation 성공 후 query invalidation
- 생성 form validation 오류와 정상 제출
- Zustand `partialize`, hydration 완료, `CaptureContext` 제거
- 근접 센서 `pending`, `near`, `far`, `unavailable` UI 상태

Jest에서는 local native module을 명시적으로 mock하고 TypeScript contract와 UI만 검증한다. Kotlin과 Swift의 실제 동작이 Jest로 검증됐다고 표현하지 않으며 snapshot test에 의존하지 않는다.
별도 Kotlin unit test, XCTest, Maestro E2E는 이 샘플의 범위에 추가하지 않는다.

### 9.3 빌드 및 실기기 검증

- Expo config가 Android/iOS만 포함하고 background 위치 권한이나 불필요한 native 설정을 생성하지 않는지 확인한다.
- Android prebuild와 local development build에서 local module이 autolink되고 Kotlin compile이 성공해야 한다.
- Android 및 iOS EAS development build가 성공해야 한다.
- Android 기기와 iPhone에서 근접 센서를 가리고 해제했을 때 상태가 변경되어야 한다.
- Android 거리값과 iOS의 거리값 부재가 각각 올바르게 표시되어야 한다.
- iOS에서 화면이 꺼졌다가 다시 켜진 뒤 마지막 `near` 감지 시각을 확인할 수 있어야 한다.
- 모니터링 중지, 화면 이탈 및 background 진입 후 sensor monitoring이 중지되어야 한다.
- 위치 권한 허용, 거부, 다시 요청할 수 없는 상태를 가능한 범위에서 확인한다.
- 위치 서비스가 꺼진 상태를 권한 거부와 구분해 표시해야 한다.
- 날씨 조회 성공, 네트워크 실패, 재시도를 확인한다.
- 위치 성공 후 날씨만 실패했을 때 위치는 유지되고 날씨는 비어 있어야 한다.
- 기록 생성, 목록, 상세, 삭제와 앱 재실행 후 SQLite 영속화를 확인한다.
- 앱 재실행 후 Zustand 온도 단위 영속화와 hydration을 확인한다.
- 미지원 Android 기기 또는 emulator의 native `unavailable` 검증은 근접 센서가 없는 실물 기기의 부재, emulator 비선호와 낮은 검증 중요도를 근거로 한 2026-07-23 사용자 결정에 따라 스킵한다. 성공으로 간주하지 않되 프로젝트 완료를 차단하는 필수 조건에서도 제외한다.

### 9.4 검증 기록 원칙

자동화 검사, local build, EAS build, 실기기 검증 결과는 서로 구분한다. 실제 검증 결과는 이 문서의 검증 기록에 다음 형식으로 남긴다.

| 날짜 | 구분 | build 또는 기기 | 검증 항목 | 결과 | 근거 및 제한사항 |
| --- | --- | --- | --- | --- | --- |
| 2026-07-20 | 자동화 | Windows / Node.js | `npm run lint`, `npm run typecheck` | 통과 | ESLint와 strict TypeScript 오류 없음 |
| 2026-07-20 | 자동화 | Jest / `jest-expo` | `npm test -- --runInBand` | 통과 | 9 suites, 30 tests, snapshot 0개. local native module은 명시적 mock으로 검증했으며 Kotlin/Swift 실행 근거로 사용하지 않음 |
| 2026-07-20 | 자동화 | Expo SDK 54 | `npx expo-doctor@latest`, `npx expo install --check` | 통과 | Expo Doctor 18/18, SDK 호환 dependency 이상 없음 |
| 2026-07-20 | bundle | Android Hermes bundle | `npx expo export --platform android --output-dir .expo/export-validation --clear` | 통과 | Expo Router entry 1,231 modules bundle 성공 |
| 2026-07-20 | config/CNG | Android | resolved config, clean prebuild, autolinking | 통과 | Android/iOS만 포함, background location과 foreground service 비활성화, `proximity-sensor` autolink 확인 |
| 2026-07-20 | local build | Android debug development APK | `:app:assembleDebug` | 통과 | `:proximity-sensor:compileDebugKotlin`과 `:app:assembleDebug` 성공. APK 169,182,874 bytes, SHA-256 `0C46D64F5BCD3412C2E02385B54DD9CA70D94CCB81CA4BF183B6CECBE73ED73B` |
| 2026-07-20 | manifest | Android release merge | `:app:processReleaseMainManifest` | 통과 | app 기능 권한은 foreground 위치, `INTERNET`, `ACCESS_NETWORK_STATE`이며 Android의 dynamic receiver 보호 권한도 생성됨. background 위치, foreground service, storage, vibration, overlay 권한 없음 |
| 2026-07-20 | manifest | Android debug merge | development tooling 권한 구분 | 확인 | debug APK에는 React Native development tooling의 `SYSTEM_ALERT_WINDOW`가 추가됨. app release manifest에는 포함되지 않음 |
| 2026-07-20 | EAS build | Android development | 계정 상태 확인 | 미검증 | `npx eas-cli@latest whoami` 결과 `Not logged in`; build를 생성하지 않음 |
| 2026-07-20 | EAS build | iOS development | 계정 상태 확인 | 미검증 | EAS 미로그인으로 build를 생성하지 않음. Swift compile도 확인되지 않음 |
| 2026-07-20 | 실기기 | Android / emulator | 설치, 실행, 센서·위치·날씨·SQLite·설정 | 미검증 | `adb devices -l`에 연결 기기가 없고 설치된 AVD도 없음 |
| 2026-07-20 | 실기기 | iPhone | 설치, 실행, 센서·화면 꺼짐·위치·영속화 | 미검증 | Windows 환경에 연결 iPhone development build가 없으며 iOS EAS build도 미생성 |
| 2026-07-22 | EAS 연결 | `@jungjh0519/fieldlog` | 계정 및 프로젝트 연결 | 통과 | `eas whoami`는 `jungjh0519`, project ID는 `f64a7e95-7255-4a34-a502-13d615271efa`로 확인. `app.json`에 owner와 `extra.eas.projectId`를 반영했고, EAS CLI가 중복 `android.permissions`와 빈 `extra.router`를 정리한 뒤 Expo Doctor 18/18 및 dependency 호환 검사를 통과함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | EAS build | Android development / internal | build `f9f2f11a-d340-4c40-b64d-e087e105ee02` | 통과 | `FINISHED`, Expo SDK 54, 앱 `1.0.0 (1)`. 최종 입력 archive는 79 files / 1,282,785 bytes이며, 최초 inspect에서 발견한 local Gradle 산출물 133개를 `.gitignore`에 추가해 제외함. APK 169,182,934 bytes, SHA-256 `13C126731ED80D48ED05B16A732BE4E4696A97D49A4C5CBFE301DB30A23E5DCF`; v2 서명, min SDK 24·target SDK 36, development launcher manifest와 `ProximitySensor` DEX 포함을 독립 확인. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 실기기 | `LM-V500N` / Android 12 / API 31 | 근접 센서 및 lifecycle | 통과 | 모니터링 시작, 가림·해제에 따른 `near/far`, 거리·최대 범위, 마지막 가까움 시각, 중지 후 `idle` 복귀를 확인함. 화면 이탈 시 listener 3→2, background 진입 시 3→2, foreground 복귀 시 2→3과 최종 중지 cleanup도 확인함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 실기기 | `LM-V500N` / Android 12 / API 31 | 위치 권한·서비스 및 날씨 | 통과 | 최초 거부·허용·설정 차단·재요청 거부·복원과 위치 서비스 꺼짐 구분을 확인함. 첫 번째 offline 시도는 위치 획득 실패여서 날씨 실패 근거에서 제외했고, online 기준 상태 복원 후 두 번째 offline 시도에서 위치 유지·날씨만 실패·재시도 노출을 확인한 뒤 최종 복구함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 실기기 | `LM-V500N` / Android 12 / API 31 | SQLite 기록 흐름 | 통과 | 빈 제목 차단, 전체 snapshot 기록과 위치·날씨가 없는 최소 기록 생성, 최신순 목록·상세·빈 메모·삭제 확인 창을 확인함. DB를 직접 조회해 `user_version=1`, 삭제 전후 rows 2→1과 앱 재실행 후 잔여 기록 영속화를 확인함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | source regression | Android development client / Metro | 실기기 검증 중 발견한 UI·hook 수정 | 통과 | `(tabs)` root header 숨김, Fast Refresh 후 `pending` 고착 방지, 기록 만들기 상태별 안내를 최신 source로 확인함. 기존 EAS APK의 build 입력은 이후 변경된 source 3개와 test 2개보다 앞선 상태이며, native/config 변경이 없는 JS/TS 후속 수정은 설치된 development client와 Metro로 실기기 검증함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 자동화 | Windows / Node.js / Jest | 후속 source 회귀 검사 | 통과 | `.expo/` inspect 복제본을 Jest 기본 수집 대상에서 제외한 `npm test -- --runInBand` 기준 9 suites, 33 tests, snapshot 0개와 `npm run lint`, `npm run typecheck` 통과. native 실행 결과는 실기기 검증과 구분함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 실기기 | `LM-V500N` / Android 12 / API 31 | 섭씨·화씨 변경 및 재실행 hydration | 통과 | 초기 섭씨 선택, 화씨 전환과 기록 상세의 `°F` 표시, 강제 종료·재실행 후 화씨 복원을 확인함. 이후 섭씨로 되돌려 다시 강제 종료·재실행한 뒤 섭씨 복원도 확인함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 안정성 | `LM-V500N` / Android 12 / API 31 | 검증 중 crash·ANR 및 민감 임시 산출물 | 통과 | exit history와 logcat에서 crash·ANR이 없음을 확인함. 좌표가 포함될 수 있는 `.expo/device-validation` DB·log 복제본, 검증 스크린샷, EAS inspect source 복제본·추출 DEX·검사 log와 Metro runtime log를 삭제하고 최종 EAS APK만 보존함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-22 | 실기기 / emulator | 미지원 Android 환경 | `unavailable` 상태 | 미검증 | 계획상 미지원 기기 또는 emulator에서 확인해야 하나, `LM-V500N`은 센서 지원 기기이고 사용 가능한 AVD가 없어 native `unavailable` 경로는 확인하지 못함. Jest mock 기반 UI·hook 검증과 구분함. [상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-23 | EAS build | iOS development / internal | build `5585528e-f84a-4da1-9796-bcdf774afe16` | 통과 | `FINISHED`, Expo SDK 54, 앱 `1.0.0 (1)`. EAS log에서 `ProximitySensorModule.swift` arm64 compile, pod autolink와 archive 성공을 확인함. iPhone 11을 포함한 ad hoc profile로 생성한 IPA는 17,397,936 bytes, SHA-256 `0F3F6F168782170467CB97BC7DD7BC2B7FF4F2BA30F6EBAEBDF0440BE486CD50`이며 bundle identifier `com.jaehoon.fieldlog`, minimum iOS 15.1과 native module marker를 독립 확인함. [4번 상세 기록](./2026-07-22-step-4-handoff.md) |
| 2026-07-23 | 실기기 | iPhone 11 / iOS version 미수집 | 설치, 근접 센서 및 lifecycle | 통과 | development build 설치·기동, `far`, 센서 가림에 따른 화면 꺼짐·해제 후 복귀와 마지막 `near` 시각, iOS 거리·최대 범위 `null`을 확인함. background와 tab 이탈 중 화면 유지, foreground 재개, 수동 중지 후 `idle`·화면 유지도 확인함. 화면 꺼짐과 마지막 시각 갱신을 `near` event 근거로 사용하며 device diagnostic log 검증으로 확대하지 않음. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | 실기기 | iPhone 11 / iOS version 미수집 | 위치 권한·서비스 및 날씨 | 통과 | 최초 거부 후 `canAskAgain: false`에 맞는 설정 안내, 두 번째 요청의 system prompt 미표시, 설정 허용 후 성공을 확인함. 위치 서비스 꺼짐을 권한 거부와 구분했고 복원 후 정상 조회함. offline에서도 위치 획득은 성공하고 위치를 유지한 채 날씨만 실패·재시도 노출, online 복원 후 성공을 확인함. 실제 WMO code는 시점·위치에 따라 달라지는 값으로 판정함. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | 실기기 | iPhone 11 / iOS version 미수집 | SQLite 기록 흐름 | 통과 | 빈 제목 차단, 위치·날씨가 포함된 전체 snapshot과 선택 데이터가 없는 최소 snapshot, iOS 거리·최대 범위 없음, 최신순 목록·상세·빈 메모, 삭제 취소·확정을 확인함. 여러 차례의 앱 강제 종료·재실행 후 생성·삭제 상태가 유지됨. Windows에서 iPhone app sandbox DB를 직접 조회하지 않았으므로 UI runtime 근거로 한정함. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | 실기기 | iPhone 11 / iOS version 미수집 | 섭씨·화씨 변경 및 재실행 hydration | 통과 | 초기 섭씨, 화씨 전환과 저장 기록 상세의 `°F`, 강제 종료·재실행 후 화씨 복원을 확인함. 이후 섭씨로 되돌려 다시 강제 종료·재실행한 뒤 설정과 상세의 `°C` 복원을 확인함. 최종 기기 상태는 섭씨임. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | source regression | iOS development client / Metro | observation header back title | 통과 | `새 기록`·`기록 상세`에서 노출된 내부 route group 이름 `(tabs)`를 각각 `현재 상태`·`기록`으로 수정하고 iPhone에서 확인함. `headerBackTitle`은 iOS 전용 옵션이라 Android route·header 동작에는 영향을 주지 않는 계약을 설치된 navigation 타입으로 확인했으나 Android 실기기를 다시 실행하지는 않음. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | 자동화 | Windows / Node.js / Jest | iPhone 검증 후 최종 source 회귀 검사 | 통과 | `npm test -- --runInBand` 9 suites, 33 tests, snapshot 0개, `npm run lint`, `npm run typecheck`, Expo Doctor 18/18과 dependency 호환 검사를 통과함. native runtime 성공 근거는 iPhone 실기기 결과와 구분함. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-23 | 범위 결정 | 미지원 Android 실물 기기 / emulator | native `unavailable` 상태 | 스킵 | 근접 센서가 없는 Android 실물 기기가 없고 emulator 검증을 선호하지 않으며 중요도가 낮다는 사용자 판단에 따라 의도적으로 제외함. 성공으로 기록하지 않고, 기기 조달이나 emulator 구성으로 범위를 확대하지 않으며 완료 차단 요인으로도 취급하지 않음. [5번 상세 기록](./2026-07-23-step-5-handoff.md) |
| 2026-07-28 | source regression | 현재 TypeScript source / 기존 자동화 | 상세 not-found 상태의 iOS 뒤로가기 제목 | 확인 | 상세 route의 invalid·pending·error·success·not-found 분기를 다시 대조해 not-found 분기에 누락된 `headerBackTitle: "기록"`을 적용함. 당시 `npm run lint`, `npm run typecheck`, `npm test -- --runInBand` 9 suites·33 tests를 통과했으나 상세 화면 전용 자동화 test와 iPhone runtime 재검증은 없어 source·type·기존 자동화 회귀 근거로 한정함. [학습 진행표](./2026-07-23-step-7-learning-progress.md) |

2026-07-20과 2026-07-22의 미검증 행은 당시 상태를 보존한 이력이며, 같은 항목의 현재 판단은 더 최근 날짜의 행을 따른다. 실제로 확인하지 않은 항목은 성공으로 추정하지 않고 `미검증`으로 기록하며, 사용자가 명시적으로 제외한 항목은 성공과 구분해 `스킵`으로 기록한다. 한 platform의 성공을 다른 platform의 성공 근거로 사용하지 않는다.

## 10. 학습서 작성 및 대화형 학습 계획

구현과 검증을 마친 후 최신 소스를 직접 다시 읽고 `docs/learning-guide.md`를 작성한다.

학습서는 다음 순서로 구성한다.

1. 먼저 알아둘 검증 경계
2. 프로젝트 구조와 책임
3. Expo Router 화면 흐름
4. 앱 시작, SQLite migration, Zustand hydration
5. 근접 센서와 native lifecycle
6. 위치, 날씨, `CaptureContext`, 저장 흐름
7. 각 library의 실제 역할
8. Expo 제공 기능과 직접 작성한 native 기능
9. 주요 TypeScript·React·Kotlin·Swift 문법
10. 자동화와 실기기 검증 구분
11. 복습 실습

학습서에는 구현되지 않은 기능이나 검증하지 않은 결과를 포함하지 않는다. 실제 코드 flow와 다른 프로젝트에 재사용할 핵심 패턴을 중심으로 설명하고, API 전체 목록이나 범용 이론을 길게 나열하지 않는다.
학습서 문서 자체는 최신 source·검증 결과를 반영한 기준 자료로 유지한다. 실제 학습은 Codex가 각 대단원을 적정 크기의 서브 스탭으로 나누어 한 번에 하나씩 대화창에 제시하고, 학습 목표·충분한 설명·실제 source 경로와 코드·동작 예시·서브 스탭 핵심 요약을 제공하는 방식으로 진행한다. 사용자는 실제 source를 직접 찾아 읽고 질문하며, 오류·누락이 없다는 사용자 확인 후에만 해당 서브 스탭을 완료한다.
현재 1~6단원의 확정 서브 스탭과 완료 결론, 7~11단원의 비확정 예정안은 [학습 진행표](./2026-07-23-step-7-learning-progress.md)에서 관리한다. 미시작 단원의 제목·개수·순서는 실제 학습 직전 최신 source와 설치 계약을 다시 대조한 뒤 확정한다.

8번 `AGENTS.md` 정비, 9번 GitHub repository 연결과 10번 현재 기준 source·문서의 1차 commit/push를 완료했다. 현재는 [대화형 학습 진행표](./2026-07-23-step-7-learning-progress.md)를 기준으로 실제 대화형 학습과 source 검증을 진행하며, 현재 서브 스탭과 완료 결론은 진행표에서 관리한다. 학습 중 오류·보완점이 발견되면 학습서를 수정하고 검증한 뒤 1차 push와 구분되는 별도의 추가 commit/push로 반영한다.

모든 서브 스탭의 source 확인과 질의응답을 완료하고 필요한 학습서 보완까지 끝내는 것으로 학습 범위를 마무리한다. preview/production release나 store 운영 계획은 작성하지 않는다.

## 11. 전제와 제외 범위

- 개인 학습용 비상업 샘플 앱이며 제품 출시를 목표로 하지 않는다.
- Android 휴대폰과 iPhone만 지원하며 web, iPad와 tablet 최적화는 제외한다.
- 별도 애플리케이션 서버는 구축하지 않는다.
- 날씨는 attribution과 무료 사용 조건을 지키는 범위에서 Open-Meteo 공개 API를 사용한다.
- background location, push notification, 인증, 클라우드 동기화는 구현하지 않는다.
- 기록 수정, filter, sort 선택, pagination, 검색은 구현하지 않는다.
- dark theme, 별도 UI framework, segmented control package, platform-specific TypeScript adapter는 추가하지 않는다.
- SQLCipher, query cache persistence, React Native online manager, optimistic update는 추가하지 않는다.
- 별도 native unit test와 E2E framework는 추가하지 않는다.
- Expo Go는 초기 project 확인 용도로만 보고 native module 구현 이후에는 custom development client를 사용한다.
- preview/production build, App Store와 Play Store 제출, OTA update는 구현하지 않는다.
- Expo 계정, 유료 Apple Developer 계정, Android 기기, iPhone을 사용할 수 있다고 전제한다.
- 앱 구현·build·실기기 검증 단계에는 Git repository 생성·commit·branch·push·pull request를 포함하지 않았다. 사용자가 별도로 승인한 9·10번에서 public GitHub repository 연결과 현재 기준 source·문서의 1차 commit/push를 완료했으며, 이후에는 대화형 학습에서 실제 보완이 발생할 때만 추가 commit/push한다.
- Git repository와 index 상태는 앱 기능의 성공 근거로 사용하지 않으며, 저장소 정리와 학습 보완의 완료 여부만 해당 후속 단계에서 별도로 기록한다.
- 검증할 수 없는 기기 또는 외부 환경 항목은 범위를 확대해 우회하지 않고 제한사항과 `미검증` 상태로 기록한다. 사용자가 중요도와 대체 수단을 검토한 뒤 명시적으로 제외한 검증은 성공과 구분해 `스킵`으로 기록한다.
- 구현·검증·`docs/learning-guide.md` 작성, 별도 승인된 저장소 정리, 마지막 대화형 학습과 필요한 보완을 마치면 제품 유지보수나 release 작업 없이 프로젝트를 종료한다.

## 12. 현재 진행 상태

| 구분 | 상태 | 비고 |
| --- | --- | --- |
| 학습 목표와 구현 범위 | 확정 | 이 문서를 최종 구현 기준으로 사용 |
| source 및 app config 구현 | 완료 | 변경 전 `[Impact Review]` 작성, 계획 범위의 화면·data flow·local module과 iOS observation header back title 후속 수정 완료 |
| 자동화 검사 | 통과 | lint, typecheck, `.expo/` 복제본을 제외한 기본 Jest 9 suites/35 tests, Expo Doctor 18/18, dependency 호환 검사와 Android bundle 통과 |
| Android local build | 통과 | clean prebuild, autolinking, local module Kotlin compile, debug APK 생성 |
| Android EAS build | 통과 | `development` / `internal` build `f9f2f11a-d340-4c40-b64d-e087e105ee02` 완료 및 artifact 독립 검사 |
| iOS EAS build | 통과 | `development` / `internal` build `5585528e-f84a-4da1-9796-bcdf774afe16` 완료, Swift local module compile·autolink와 IPA 독립 검사 |
| Android 실기기 검증 | 통과 | `LM-V500N`에서 센서·lifecycle·위치·날씨·SQLite·섭씨/화씨 재실행 hydration과 후속 UI 수정 확인 |
| Android native `unavailable` 검증 | 스킵 | 미지원 실물 기기 부재, emulator 비선호와 낮은 중요도에 따른 2026-07-23 사용자 결정. 성공으로 간주하지 않으며 완료를 차단하지 않음 |
| iPhone 실기기 검증 | 통과 | iPhone 11에서 설치·기동, 센서·lifecycle, 위치·날씨, SQLite 생성·삭제·재실행, 섭씨/화씨 hydration과 새 기록·조회된 상세 화면의 iOS header 수정을 확인함. 2026-07-28 상세 not-found 분기 보완은 iPhone에서 다시 검증하지 않았으며, iOS version·device diagnostic log·sandbox DB 직접 검사는 미수집 제한으로 유지 |
| `docs/learning-guide.md` | 확장 완료 | 2026-07-23 기능·실기기 검증 기준선과 이후 대화형 학습에서 확인·보완한 현재 source·config·test를 반영하고 source 링크·실제 code pattern·복습 실습을 보강함. 이후 현재 위치와 보완 기록은 [학습 진행표](./2026-07-23-step-7-learning-progress.md)에서 관리함. [7번 상세 기록](./2026-07-23-step-7-handoff.md) |
| 저장소 작업 지침과 진입 문서 | 완료 | `agents-md-improver` 절차로 기존 `AGENTS.md`를 31/100(D)으로 평가한 뒤 사용자 승인에 따라 한글 작업 지침, `architecture-internals.md`와 실제 FieldLog용 한글 `README.md`를 반영하고 문서 검증을 통과함. [8번 상세 기록](./2026-07-23-step-8-handoff.md) |
| GitHub repository 생성·연결 | 완료 | public [`Jaehoon81/fieldlog`](https://github.com/Jaehoon81/fieldlog)을 빈 repository로 생성하고 HTTPS `origin`에 연결. Description은 `Expo 기반 React-Native 학습용 Sample App.`으로 설정함. [9·10번 통합 기록](./2026-07-24-step-9-10-handoff.md) |
| 현재 source·문서 1차 commit/push | 완료 | `master`에서 project/config, native module, data/API/state, screen flow, tests, docs의 6개 commit을 생성하고 최초 push함. 통합 handoff와 상태 문서는 별도 closeout commit으로 추가 push함. [9·10번 통합 기록](./2026-07-24-step-9-10-handoff.md) |
| 대화형 학습·source 검증 | 최종 완료 | [학습 진행표](./2026-07-23-step-7-learning-progress.md)의 1~11단원 모든 확정 서브 스탭에서 source 확인·질의응답·사용자 검증을 완료했고 확정된 수정 대기 항목은 없음. 학습 문서 변경을 `636bd51b491bc0c5b8ad66d6337f9147230f7617`까지 추가 commit/push한 뒤 local·tracking·GitHub remote parity와 clean working tree를 확인하고, 이 최종 상태 기록도 별도 closeout commit으로 추가함 |

현재 구현, Android/iOS EAS build, 지원 기기 실기기 검증, 최신 source 기반 학습서 확장, 저장소 지침 정비와 GitHub repository 작업을 완료했습니다. Android native `unavailable` 검증은 성공이 아닌 사용자 승인 `스킵`으로 유지하며 완료를 차단하지 않습니다. 대화형 학습 1~11단원의 source 확인·질의응답·사용자 검증, 발견한 보완의 반영과 검증, 학습 문서 추가 commit/push 및 remote parity 확인까지 마쳤고 확정된 수정 대기 항목은 없습니다. 이 계획의 구현·검증·학습·저장소 closeout은 최종 완료 상태입니다.
