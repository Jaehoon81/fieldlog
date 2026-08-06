# FieldLog 구현 학습서

이 문서는 2026-07-23 기능·실기기 검증 기준선과 이후 대화형 학습에서 확인·보완한 현재 FieldLog source를 다시 읽기 위한 안내서다. 구현 기준은 [implementation-plan.md](./implementation-plan.md)이며, 범용 Expo 이론보다 이 프로젝트에서 실제로 이어지는 흐름과 다른 앱에도 재사용할 수 있는 경계를 설명한다.

처음 읽는 사람은 다음 원칙을 기억하면 된다.

- 화면 파일은 `app/`, 화면과 분리한 기능은 `src/`, 직접 작성한 native code는 `modules/`에서 찾는다.
- TypeScript type은 개발 중 실수를 줄이고, Zod와 SQLite 제약은 runtime data 경계를 지킨다.
- SQLite가 기록의 영속 원본이고, TanStack Query와 Zustand는 각각 다른 종류의 상태를 맡는다.
- 자동화, native compile, EAS artifact, 실기기 관찰은 증명하는 범위가 서로 다르다.
- 문서의 source 링크는 이 문서가 설명하는 실제 구현으로 바로 이동하기 위한 것이다.

## 이 학습서를 사용하는 방법

이 문서는 학습 내용과 source 근거를 보관하는 기준 자료다. 실제 학습은 사용자가 문서 전체를 한 번에 읽는 방식이 아니라 Codex가 내용을 대화형으로 재구성해 한 서브 스탭씩 진행한다.

1. 대단원을 학습하기 전에 내용의 크기와 의존 관계에 따라 여러 서브 스탭으로 나눈다.
2. 한 번에 하나의 서브 스탭만 대화창에 제시한다.
3. 각 서브 스탭에는 학습 목표, 충분한 설명, 실제 source 경로와 코드, 동작 예시를 포함한다.
4. 각 서브 스탭 마지막에는 핵심 포인트를 다시 요약한다.
5. 사용자는 연결된 실제 source를 직접 찾아 읽고 대화로 질문한다.
6. 설명이나 source에 오류·누락이 없다는 사용자의 확인이 있어야 해당 서브 스탭을 완료한다.
7. 오류나 보완점이 발견되면 이 학습서를 수정하고 관련 검증을 다시 수행한다.
8. 한 서브 스탭이 완료되기 전에는 다음 서브 스탭으로 넘어가지 않는다.

대화창은 전달과 질의응답 수단이고 이 문서는 durable 기준이다. 대화 내용을 그대로 복제하지 않으며, 학습 중 확인된 사실·설명·source 경계의 변경만 문서에 반영한다. 너무 큰 단락은 학습 과정에서 검증된 구분에 따라 소제목을 점진적으로 추가할 수 있다.

`AGENTS.md` 정비, GitHub repository 연결과 현재 기준 source·문서의 1차 commit/push를 완료했다. 실제 대화형 학습과 source 검증의 현재 위치는 [2026-07-23-step-7-learning-progress.md](./2026-07-23-step-7-learning-progress.md)에서 관리하며 한 번에 한 서브 스탭씩 진행한다. 학습 중 문서 수정이 생기면 그 수정만 다시 검증하고 1차 push와 구분되는 별도의 추가 commit/push 대상으로 삼는다.

## 1. 먼저 알아둘 검증 경계

### 1.1 증거 층과 주장 범위

검증 결과는 “테스트가 통과했으니 모두 된다”로 합치지 않고 증거 층별로 읽는다.

| 증거 층 | 현재 결과 | 여기서 확인한 것 |
| --- | --- | --- |
| source·config 정적 확인 | 통과 | Expo SDK 54 package 조합, app config, route와 data flow, Android/iOS module 계약 |
| 자동화 | 통과 | Jest 9 suites·35 tests, ESLint, strict TypeScript, Expo Doctor 18/18, Expo dependency 호환 |
| Android local build | 통과 | clean prebuild, local module autolinking, Kotlin compile, debug APK, merged manifest |
| Android EAS development build | 통과 | build `f9f2f11a-d340-4c40-b64d-e087e105ee02`, 설치 가능한 development APK와 native module 포함 |
| iOS EAS development build | 통과 | build `5585528e-f84a-4da1-9796-bcdf774afe16`, Swift arm64 compile, pod autolink, signed IPA |
| Android 지원 실기기 | 통과 | `LM-V500N`에서 센서·lifecycle·위치·날씨·SQLite·온도 설정 hydration |
| iPhone 지원 실기기 | 통과 | iPhone 11에서 센서 가림에 따른 화면 꺼짐·복귀, 위치 권한·서비스, offline 재시도, SQLite, 온도 설정 hydration |
| Android native `unavailable` | 스킵 | 센서 없는 실물 기기 부재, emulator 비선호와 낮은 중요도에 따른 사용자 결정 |

`스킵`은 성공의 다른 표현이 아니다. Android native module이 센서 없는 기기에서 실제로 `unavailable`을 내보내는지는 확인하지 않았고, 기기 조달이나 emulator 구성으로 검증 범위를 늘리지 않기로 한 것이다.

### 1.2 Jest mock과 실제 native code의 경계

Jest에서 local native module을 mock한 결과는 TypeScript 계약과 UI 상태 전이의 근거다. Kotlin·Swift 실행 근거는 각각 build와 지원 실기기 결과에서 가져온다.

### 1.3 Native build·artifact와 실기기 증거

Native build log는 autolinking과 Kotlin·Swift compile을, APK·IPA 검사는 compile된 module이 binary에 포함됐음을 확인한다. 실제 설치·센서 event·lifecycle 동작은 지원 실기기 관찰이 추가로 필요하다. 자세한 검증 원문은 [implementation-plan.md](./implementation-plan.md)의 9장, [4번 build handoff](./2026-07-22-step-4-handoff.md), [5번 runtime handoff](./2026-07-23-step-5-handoff.md)를 기준으로 한다.

### 1.4 결과 상태와 남은 제한사항

아직 남아 있는 제한도 성공으로 확대하지 않는다.

- iPhone 11의 iOS version은 수집하지 않았다.
- iPhone device diagnostic log와 app sandbox SQLite 파일을 Windows에서 직접 검사하지 않았다.
- 2026-07-23 새 기록 화면과 조회된 상세 화면의 iOS `headerBackTitle` 수정은 iPhone에서 확인했지만 Android 실기기를 다시 실행하지 않았다. 설치된 navigation type의 iOS 전용 계약과 자동화로 Android 영향 범위만 확인했다.
- 2026-07-28 상세 not-found 분기의 `headerBackTitle` 누락을 보완한 뒤 source·type·기존 자동화 회귀 검사는 통과했지만, 상세 화면 전용 자동화 test와 iPhone runtime 재검증은 수행하지 않았다.
- 실제 날씨 코드는 위치와 시각에 따라 달라진다. Android에서 본 `2`와 iPhone에서 본 `53`은 서로 같아야 하는 고정 기대값이 아니다.

## 2. 프로젝트 구조와 책임

### 2.1 저장소 지도와 source/generated 경계

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

app-tests/
  current-status-screen.test.tsx
  new-observation-screen.test.tsx

src/
  api/weather.ts
  components/snapshot-summary.tsx
  db/migrate.ts
  db/observations.ts
  hooks/use-proximity.ts
  query-client.ts
  schemas/observation.ts
  schemas/weather.ts
  store/app-store.ts
  types/observation.ts
  types/weather.ts

modules/proximity-sensor/
  android/
  ios/
  src/

app.json
eas.json
package.json
jest.setup.ts
tsconfig.json
```

현재 root `android/`, `.expo/`, `modules/proximity-sensor/android/build/`는 존재하지만 generated 또는 ignored output이고, root `ios/`도 생성될 수 있는 ignored 경로이므로 구현 source의 기준으로 사용하지 않는다. 유지 대상은 route의 `app/`, 공용 TypeScript의 `src/`, 직접 작성한 native source의 `modules/proximity-sensor/android/src/`·`ios/`·`src/`, 그리고 `app.json` 같은 선언적 config다.

### 2.2 계층별 책임과 공용 코드 분리 기준

| 위치 | 책임 | 대표 source |
| --- | --- | --- |
| route와 화면 조합 | Expo Router URL, 화면 상태와 사용자 event 연결 | [`app/_layout.tsx`](../app/_layout.tsx), [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>) |
| domain type | 앱 안에서 오가는 data shape와 허용 상태 | [`src/types/observation.ts`](../src/types/observation.ts), [`src/types/weather.ts`](../src/types/weather.ts) |
| runtime schema | form 입력과 외부 API 응답을 실제 실행 중 검증 | [`src/schemas/observation.ts`](../src/schemas/observation.ts), [`src/schemas/weather.ts`](../src/schemas/weather.ts) |
| 영속 data | DB migration, SQL CRUD, query hook | [`src/db/migrate.ts`](../src/db/migrate.ts), [`src/db/observations.ts`](../src/db/observations.ts) |
| query cache 정책 | TanStack Query cache와 기본 retry·refetch 정책 | [`src/query-client.ts`](../src/query-client.ts) |
| 화면 간 client state | 임시 캡처, 온도 설정, hydration 완료 상태 | [`src/store/app-store.ts`](../src/store/app-store.ts) |
| native adapter | native event를 React UI 상태로 정규화 | [`src/hooks/use-proximity.ts`](../src/hooks/use-proximity.ts) |
| 직접 작성한 native 기능 | Android `SensorManager`, iOS `UIDevice`를 하나의 JS 계약으로 노출 | [`modules/proximity-sensor/`](../modules/proximity-sensor/) |
| 자동화 | 화면·hook·schema·DB·store의 좁은 계약 검증 | [`app-tests/`](../app-tests/), [`src/`](../src/)의 `*.test.ts(x)` |
| build 입력 | app identity, 권한, config plugin, EAS profile, package version | [`app.json`](../app.json), [`eas.json`](../eas.json), [`package.json`](../package.json) |

`SnapshotSummary`는 생성 화면과 상세 화면에서 실제로 두 번 사용되므로 공통 component로 분리했다. 그 외 화면 style과 작은 표시 함수는 한 번만 사용하므로 각 route에 남겨 두었다.

### 2.3 하나의 기록을 따라가는 source 읽기 순서

처음부터 모든 파일을 위에서 아래로 읽기보다 data 하나가 지나가는 길을 따라가면 이해하기 쉽다.

1. [`src/types/observation.ts`](../src/types/observation.ts)에서 저장할 data shape를 본다.
2. [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)에서 센서·위치·날씨가 `CaptureContext`가 되는 지점을 찾는다.
3. [`app/observations/new.tsx`](../app/observations/new.tsx)에서 사용자 입력이 붙는 과정을 본다.
4. [`src/db/observations.ts`](../src/db/observations.ts)에서 SQLite row로 저장되고 다시 domain object가 되는 과정을 본다.
5. [`app/(tabs)/records.tsx`](<../app/(tabs)/records.tsx>)와 [`app/observations/[id].tsx`](<../app/observations/[id].tsx>)에서 저장 결과를 읽는다.
6. 마지막에 [`src/hooks/use-proximity.ts`](../src/hooks/use-proximity.ts)와 Kotlin·Swift 구현을 비교한다.

## 3. Expo Router 화면 흐름

### 3.1 Root Stack, Tabs와 파일 기반 route

Expo Router는 [`app/`](../app/)의 파일을 route로 바꾼다. [`app/_layout.tsx`](../app/_layout.tsx)의 root `Stack` 아래에 tab group과 observation route가 놓인다.

```text
/(tabs)
├─ index       현재 상태
├─ records     기록 목록
└─ settings    설정

/observations/new
/observations/[id]
```

괄호로 감싼 `(tabs)`는 URL segment를 추가하지 않는 route group이다. 화면을 파일 구조상 묶고 navigator를 공유하지만 사용자 URL에는 `(tabs)`라는 글자가 포함되지 않는다. `[id]`는 값이 바뀌는 동적 segment다.

| 파일 | route 의미 | 화면 |
| --- | --- | --- |
| [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>) | tab group의 기본 route | 현재 상태 |
| [`app/(tabs)/records.tsx`](<../app/(tabs)/records.tsx>) | `/records`에 해당하는 tab | 기록 목록 |
| [`app/(tabs)/settings.tsx`](<../app/(tabs)/settings.tsx>) | `/settings`에 해당하는 tab | 설정 |
| [`app/observations/new.tsx`](../app/observations/new.tsx) | `/observations/new` | 새 기록 |
| [`app/observations/[id].tsx`](<../app/observations/[id].tsx>) | `/observations/7` 같은 주소 | ID가 7인 기록 상세 |

root layout의 핵심은 다음과 같다.

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
</Stack>
```

tab group의 header를 root Stack에서도 표시하면 tab header와 겹칠 수 있으므로 root 쪽 header를 숨긴다. [`app/(tabs)/_layout.tsx`](<../app/(tabs)/_layout.tsx>)는 `Tabs`와 기존 `Ionicons`만 사용한다. 별도 UI framework나 segmented control package는 없다.

### 3.2 현재 상태에서 새 기록 화면으로

현재 상태 화면에서 기록 만들기를 누르면 다음 순서로 이동한다.

1. 센서·위치·날씨 값을 `CaptureContext`로 복사한다.
2. Zustand에 `captureContext`를 넣는다.
3. `router.push("/observations/new")`으로 이동한다.

### 3.3 기록 목록에서 동적 상세 화면으로

기록 row를 누르면 `/observations/[id]`로 이동한다. `[id].tsx`는 route parameter를 양의 정수로 검사한 뒤 SQLite detail query를 실행한다.

```tsx
router.push({
  pathname: "/observations/[id]",
  params: { id: String(item.id) },
});
```

### 3.4 URL·memory state, navigation history와 platform header 경계

#### route 전환과 임시 상태를 분리한 이유

URL에는 record ID처럼 다시 찾아도 되는 식별자를 넣는다. 반면 방금 읽은 센서·위치·날씨 전체를 URL parameter로 직렬화하지 않고 Zustand의 임시 `CaptureContext`에 넣는다. 그래서 새 기록 화면을 직접 열거나 앱을 재실행해 임시 context가 사라졌다면 저장 form을 억지로 만들지 않고 현재 상태 화면으로 돌아가도록 안내한다.

현재 source에서 `push`는 이전 route를 history에 남겨 새 기록이나 상세를 열고, 취소의 `back`은 실제 이전 route로 돌아간다. 저장·삭제 성공이나 잘못된 직접 접근의 `replace`는 현재 route를 history에서 제거하고 명시한 tab으로 교체한다. 새 기록 route의 `useFocusEffect` cleanup은 system back·gesture back을 포함한 이탈에서도 일회용 `CaptureContext`가 남지 않게 한다. 여기서는 이 상태의 navigation 수명만 다루며 snapshot 생성·form·저장 구현은 6단원 범위다.

#### iOS 뒤로가기 제목에서 배운 점

Expo Router의 내부 group 이름이 기본 back title로 노출되어 iPhone에서 `(tabs)`가 보였고, 실제 source에서 다음처럼 명시했다.

```tsx
// app/observations/new.tsx
<Stack.Screen
  options={{ headerBackTitle: "현재 상태", title: "새 기록" }}
/>

// app/observations/[id].tsx
<Stack.Screen
  options={{ headerBackTitle: "기록", title: "기록 상세" }}
/>
```

`headerBackTitle`은 이 구성에서 iOS native-stack의 back button 문구를 정하는 option이다. 2026-07-23에는 iPhone에서 새 기록 화면의 `현재 상태`와 조회된 상세 화면의 `기록`을 확인했다. 2026-07-28 source 대조에서는 상세 route의 invalid·pending·error·success 분기와 달리 not-found 분기만 이 option을 빠뜨린 것을 발견해 현재는 다섯 분기 모두 `기록`을 직접 선언한다. 이 후속 보완은 상세 화면 전용 자동화 test나 iPhone runtime으로 다시 확인하지 않았으며, source·type·기존 자동화 회귀 근거로 한정한다.

## 4. 앱 시작, SQLite migration, Zustand hydration

### 4.1 Import 시점과 Root 초기화 tree

초기화 시작점은 `app/_layout.tsx`다.

1. `InitializationErrorBoundary`가 초기화 중 render 오류를 잡는다.
2. `SQLiteProvider`가 `fieldlog.db`를 연다.
3. `migrateDatabase`가 끝날 때까지 `Suspense` fallback을 표시한다.
4. `HydratedRoutes`가 Zustand `hasHydrated`를 기다린다.
5. 두 초기화가 끝나면 `QueryClientProvider`와 route를 표시한다.

실제 component 중첩을 줄이면 다음과 같다.

```tsx
<InitializationErrorBoundary>
  <Suspense fallback={/* DB 준비 화면 */}>
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={migrateDatabase}
      useSuspense
    >
      <HydratedRoutes />
    </SQLiteProvider>
  </Suspense>
</InitializationErrorBoundary>
```

`app/_layout.tsx`를 불러오면 `RootLayout`을 호출하기 전에 import한
`app-store.ts`와 `query-client.ts`도 먼저 불러온다. JavaScript module이 처음
“평가된다”는 말은 파일의 top-level 코드를 실행해 export 값을 준비한다는
뜻이다.

- `app-store.ts`의 `export const useAppStore = create(...)(persist(...))`가
  store를 만들고 설정 복원을 시작한다.
- `query-client.ts`의 `export const queryClient = createQueryClient()`가
  `QueryClient`를 한 번 만든다.
- `HydratedRoutes`의 selector는 복원을 시작하지 않고 이미 진행 중인 복원의
  완료값을 읽고 구독한다.
- `QueryClientProvider`는 render될 때 client를 새로 만들지 않고 import 때
  준비된 `queryClient`를 prop으로 받는다.

즉, import는 필요한 파일의 값을 먼저 생성·준비하고, React 화면은 그 값을
읽거나 구독해 UI를 만드는 경계로 이해하면 된다.

`SQLiteProvider`의 `onInit`이 끝나기 전에 자식이 DB를 사용하지 못하게 하고, `useSuspense`로 준비 중 UI를 한 곳에 둔다. 그 안에서 다시 Zustand hydration을 기다리는 이유는 DB schema 준비와 key-value 설정 복원이 서로 다른 비동기 작업이기 때문이다.

### 4.2 SQLite migration과 schema version

`src/db/migrate.ts`는 먼저 WAL을 설정하고 `PRAGMA user_version`을 읽는다. version 0이면 exclusive transaction 안에서 `observations` table, 최신순 index, `user_version = 1`을 함께 만든다. 현재 앱보다 높은 DB version은 조용히 열지 않고 오류로 중단한다.

```ts
const versionRow = await db.getFirstAsync<{ user_version: number }>(
  "PRAGMA user_version",
);

if (currentVersion > DATABASE_VERSION) {
  throw new Error(`지원하지 않는 데이터베이스 버전입니다: ${currentVersion}`);
}
```

이 pattern의 핵심은 “table이 있는가”만 매번 묻지 않고 schema version을 명시적으로 올리는 것이다. 새 migration이 생기면 현재 version별 block을 순서대로 추가해야 하며, `user_version`만 먼저 올리면 안 된다.

`withExclusiveTransactionAsync` callback 안의 SQL은 바깥 `db`가 아니라 전달받은 `transaction`으로 실행한다. 설치된 Expo SQLite 구현은 exclusive transaction용 connection에서 `BEGIN`하고 그 connection을 callback 인자로 넘기므로, table·index·`user_version` 갱신을 같은 `COMMIT`·`ROLLBACK` 경계에 두려면 그 인자를 사용해야 한다.

### 4.3 Zustand persist와 hydration 성공·실패 경계

Zustand store에는 세 종류의 상태가 있다.

- `temperatureUnit`: SQLite key-value storage에 영속화
- `captureContext`: route 이동용 임시 상태, 영속화하지 않음
- `hasHydrated`: route 표시 gate

`partializeAppState`가 `temperatureUnit`만 반환하므로 센서, 위치, 날씨 snapshot은 설정 저장소에 남지 않는다.

```ts
export function partializeAppState(state: AppStore): PersistedAppState {
  return {
    temperatureUnit: state.temperatureUnit,
  };
}

onRehydrateStorage: () => (state) => {
  state?.setHasHydrated(true);
}
```

현재 callback은 hydration 성공 여부를 별도 UI 상태로 분리하지 않는다. 저장소 읽기나 JSON parsing이 실패해 `state`를 받지 못하면 optional chaining이 action을 건너뛰어 `hasHydrated`가 `false`로 남고, `HydratedRoutes`는 설정을 불러오는 loading 화면에 계속 머물 수 있다. 다시 시도·오류 안내·기본값으로 계속하기 UI가 없는 것은 사용자가 학습용 sample 범위에서 유지하기로 결정한 현재 한계다.

`createJSONStorage(() => SQLiteStorage)`의 `SQLiteStorage`는 `expo-sqlite/kv-store`가 제공하는 key-value API다. 기록용 `observations` table과 같은 library를 쓰지만 책임은 다르다.

- 기록은 명시적인 SQL schema와 CRUD로 관리한다.
- 온도 단위는 Zustand persist가 JSON key-value로 관리한다.
- `CaptureContext`는 저장하지 않고 화면 이동 동안만 유지한다.

### 4.4 두 준비 경로의 합류와 QueryClient 노출 정책

마지막으로 [`src/query-client.ts`](../src/query-client.ts)는 query와 mutation의 기본 자동 재시도를 끄고, reconnect·window focus 자동 refetch도 끈다. 이 앱은 사용자가 명시적으로 재시도하는 작고 예측 가능한 학습 흐름을 택했으며, 날씨 query만 자체 retry 함수를 둔다.

`queryClient` singleton은 import 평가 때 이미 생성되지만 `QueryClientProvider`는 DB migration과 설정 hydration gate 뒤에 둔다. 생성 시점과 사용 가능 시점을 분리하면 route와 그 아래 query·mutation hook이 두 준비 작업보다 먼저 mount되어 DB나 설정을 읽지 않는다. Provider가 client를 새로 만드는 것이 아니라 준비가 끝난 descendant에 기존 singleton을 노출하는 구조다.

## 5. 근접 센서와 native lifecycle

### 5.1 공통 TypeScript bridge와 native registry 계약

[`modules/proximity-sensor/src/ProximitySensorModule.ts`](../modules/proximity-sensor/src/ProximitySensorModule.ts)는 `requireNativeModule("ProximitySensor")`로 module을 가져온다.

```ts
isAvailableAsync(): Promise<boolean>
onProximityChange(event: {
  status: "near" | "far"
  distanceCm: number | null
  maxRangeCm: number | null
  observedAt: number
})
```

Android와 iOS 차이는 이 payload 경계에서 정규화한다. platform별 TypeScript adapter는 만들지 않았다.

[`expo-module.config.json`](../modules/proximity-sensor/expo-module.config.json)은 이 JS 이름을 구현하는 native class를 platform별로 등록한다.

```text
JavaScript: requireNativeModule("ProximitySensor")
                       │
                       ├─ Android: expo.modules.proximitysensor.ProximitySensorModule
                       └─ Apple:   ProximitySensorModule
```

이 metadata를 Expo autolinking이 읽으므로 `app.json`의 `plugins` 배열에 local module 이름을 별도로 넣지 않는다.

#### 5.1.1 공통 bridge와 native registry의 전체 연결 흐름

각 파일을 따로 보는 것보다 먼저 **누가 누구를 호출하고, 결과가 어디로
돌아오는지**를 하나의 흐름으로 연결해야 한다.

##### 먼저 두 시점을 구분해야 한다

근접 센서 연결에는 서로 다른 두 시점이 있다.

```text
1. Native build·등록 시점
   어떤 Kotlin·Swift class를 앱에 포함하고 무슨 이름으로 등록할지 결정

2. 앱 실행 시점
   TypeScript가 등록된 module을 찾아 함수 호출과 event 수신
```

`expo-module.config.json`과 `requireNativeModule`은 같은 순간에 동작하지
않는다.

##### 1. Native build·등록 흐름

출발점은
[`expo-module.config.json`](../modules/proximity-sensor/expo-module.config.json)이다.

```text
expo-module.config.json
        │
        ├─ Android build
        │    └─ expo.modules.proximitysensor.ProximitySensorModule 로드
        │
        └─ iOS build
             └─ ProximitySensorModule 로드
```

이 파일이 하는 일은 platform별 native class를 Expo autolinking에 알려주는
것이다.

로드된 각 class는 자신을 JS registry에 등록한다.

Android:

```kotlin
class ProximitySensorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ProximitySensor")
  }
}
```

iOS:

```swift
public final class ProximitySensorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ProximitySensor")
  }
}
```

따라서 native 앱이 준비되면 registry에는 다음 관계가 만들어진다.

```text
Native registry

"ProximitySensor"
        │
        ├─ Android에서는 Kotlin ProximitySensorModule
        └─ iOS에서는 Swift ProximitySensorModule
```

여기까지는 앱을 build할 때 준비되는 native 연결이다. 사용자가 모니터링 버튼을
누를 때마다 `expo-module.config.json`을 다시 읽는 것은 아니다.

##### 2. JavaScript가 등록된 module을 찾는 흐름

앱 source는 다음 경로로 module을 가져온다.

```ts
import ProximitySensor from "@/modules/proximity-sensor";
```

이 import를 따라가면 다음 순서다.

```text
use-proximity.ts
      │
      │ import ProximitySensor
      ▼
modules/proximity-sensor/index.ts
      │
      │ default export 재전달
      ▼
src/ProximitySensorModule.ts
      │
      │ requireNativeModule("ProximitySensor")
      ▼
Native registry
      │
      ├─ Android → Kotlin module 반환
      └─ iOS     → Swift module 반환
```

[`index.ts`](../modules/proximity-sensor/index.ts)는 연결을 직접 수행하지 않는다.

```ts
export { default } from "./src/ProximitySensorModule";
```

내부 파일을 앱에 다시 내보내는 입구 역할만 한다.

실제 runtime 연결은
[`ProximitySensorModule.ts`](../modules/proximity-sensor/src/ProximitySensorModule.ts)의
다음 코드다.

```ts
requireNativeModule("ProximitySensor");
```

이 함수가 native registry에서 이름이 같은 module을 찾는다.

```text
TypeScript 요청 이름
requireNativeModule("ProximitySensor")
                         │
                         │ 이름으로 검색
                         ▼
Native 등록 이름
Name("ProximitySensor")
```

그래서 class 이름과 registry 이름은 역할이 다르다.

- `ProximitySensorModule`: Kotlin·Swift class 이름
- `ProximitySensor`: JavaScript가 찾는 runtime 공개 이름

##### 3. 함수 호출은 JS에서 native로 갔다가 돌아온다

화면이 focus되면 다음 흐름이 시작된다.

```text
CurrentStatusScreen
  → useProximity.checkAvailability()
  → ProximitySensor.isAvailableAsync()
  → 현재 platform native module
  → boolean 반환
  → Promise<boolean> 완료
  → Hook 상태 변경
  → 화면 재render
```

실제 호출자는 [`use-proximity.ts`](../src/hooks/use-proximity.ts)다.

```ts
const isAvailable = await ProximitySensor.isAvailableAsync();
```

TypeScript에는 함수 모양이 다음처럼 선언돼 있다.

```ts
declare class ProximitySensorNativeModule extends NativeModule {
  isAvailableAsync(): Promise<boolean>;
}
```

이 선언은 구현이 아니다. 실제 구현은 현재 platform native source에 있다.

Android:

```kotlin
AsyncFunction<Boolean>("isAvailableAsync") {
  // Android 센서 지원 여부 계산
}
```

iOS:

```swift
AsyncFunction("isAvailableAsync") { () -> Bool in
  // iOS monitoring 지원 여부 계산
}
```

이름 관계를 연결하면 다음과 같다.

```text
TypeScript
isAvailableAsync()
        │
        ▼
Expo native module proxy
        │
        ├─ Android AsyncFunction<Boolean>("isAvailableAsync")
        └─ iOS     AsyncFunction("isAvailableAsync")
        │
        ▼
boolean이 JS로 돌아와 Promise<boolean> 완료
```

Hook은 그 결과를 UI 상태로 변환한다.

```ts
status: isAvailable ? "idle" : "unavailable";
```

즉, native는 `true`나 `false`를 반환하고, React Hook이 그것을 `idle`이나
`unavailable`이라는 화면 상태로 해석한다.

##### 4. Event는 반대 방향으로 흐른다

`isAvailableAsync`는 JS가 질문하고 native가 답하는 요청·응답이다.

센서 event는 반대로 native가 먼저 JS에 값을 보낸다.

```text
JS가 listener 등록
  → native monitoring 시작

실제 센서 값 변경
  → native가 sendEvent
  → JS listener callback 실행
  → Hook state 변경
  → 화면 재render
```

시작 시 Hook이 다음 코드를 호출한다.

```ts
ProximitySensor.addListener("onProximityChange", (event) => {
  // native event 수신
});
```

첫 listener가 추가되면 Expo Modules API가 활성 platform의
`OnStartObserving`을 호출한다.

```text
addListener("onProximityChange")
        │
        ├─ Android OnStartObserving
        └─ iOS     OnStartObserving
                 → 실제 native monitoring 시작
```

그 후 native module이 같은 이름으로 event를 보낸다.

Android:

```kotlin
sendEvent(
  "onProximityChange",
  mapOf(
    "status" to status,
    "distanceCm" to distanceCm,
    "maxRangeCm" to maxRangeCm,
    "observedAt" to System.currentTimeMillis()
  )
)
```

iOS:

```swift
sendEvent("onProximityChange", [
  "status": UIDevice.current.proximityState ? "near" : "far",
  "distanceCm": NSNull(),
  "maxRangeCm": NSNull(),
  "observedAt": Date().timeIntervalSince1970 * 1_000
])
```

이 event가 JS callback의 `event`로 들어온다.

```text
Native sendEvent payload
             │
             ▼
(event: ProximityEvent)
             │
             ▼
useProximity state
             │
             ▼
CurrentStatusScreen
```

##### 5. TypeScript event type은 이 흐름의 검사표다

[`ProximitySensor.types.ts`](../modules/proximity-sensor/src/ProximitySensor.types.ts)는
event가 이동하는 통로를 만들지 않는다.

```ts
export type ProximitySensorModuleEvents = {
  onProximityChange(event: ProximityEvent): void;
};
```

실제 통로는 Expo native module과 event infrastructure가 만든다. TypeScript
type은 JS 코드를 작성할 때 다음 관계가 맞는지 검사한다.

```text
event 이름             payload type
onProximityChange  →   ProximityEvent
```

따라서 두 층은 다음처럼 구분된다.

```text
실제 runtime 전달
Native sendEvent → Expo Modules API → JS callback

compile-time 검사
ProximitySensorModuleEvents → event 이름과 callback type 확인
```

Native가 실수로 다음 payload를 보낸다고 가정해 보자.

```json
{
  "status": "unknown"
}
```

TypeScript는 Kotlin·Swift가 만든 runtime 객체를 직접 검사하지 않으므로 이것을
자동으로 막지 못한다. Native 구현이 공통 계약을 정확히 지켜야 한다.

##### 전체 관계를 한 번에 정리하면

```text
[Build·등록]

expo-module.config.json
  → platform native class 로드
  → Name("ProximitySensor")
  → native registry 등록


[JS 함수 호출]

CurrentStatusScreen
  → useProximity
  → barrel index.ts
  → requireNativeModule("ProximitySensor")
  → active native module
  → isAvailableAsync 실행
  → boolean 반환
  → Hook 상태
  → 화면


[Native event]

useProximity.addListener("onProximityChange")
  → OnStartObserving
  → native monitoring
  → sensor 값 변경
  → sendEvent("onProximityChange", payload)
  → JS listener
  → ProximityEvent
  → Hook 상태
  → 화면
```

핵심 식별자 관계는 다음과 같다.

| 연결 대상 | TypeScript | Native |
| --- | --- | --- |
| module | `requireNativeModule("ProximitySensor")` | `Name("ProximitySensor")` |
| 함수 | `isAvailableAsync()` | `AsyncFunction("isAvailableAsync")` |
| event | `addListener("onProximityChange")` | `Events`·`sendEvent("onProximityChange")` |
| payload | `ProximityEvent` | Kotlin `Map` / Swift `Dictionary` |
| class 발견 | 해당 없음 | `expo-module.config.json` |

5.1의 중심은 결국 다음 한 문장으로 정리할 수 있다.

> `expo-module.config.json`이 native class를 앱에 연결하고, `Name`과
> `requireNativeModule`이 같은 이름으로 native 객체를 찾으며, 함수는
> JS→native→JS로 왕복하고 event는 native→JS 방향으로 전달된다.

### 5.2 Android `SensorManager`와 Activity lifecycle

[`ProximitySensorModule.kt`](../modules/proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ProximitySensorModule.kt)는 `SensorManager.TYPE_PROXIMITY`를 사용한다.

- listener와 app foreground가 모두 true일 때만 `registerListener`를 호출한다.
- 동일 listener를 중복 등록하지 않는다.
- `distance < maximumRange`이면 `near`, 아니면 `far`다.
- 거리와 최대 범위를 `Double` cm 값으로 event에 넣는다.
- listener 제거, background 진입, module destroy에서 `unregisterListener`를 호출한다.
- sensor 접근과 listener lifecycle은 main queue에서 처리한다.

상태 판정 자체는 다음 한 줄로 드러난다.

```kotlin
val status = if (distanceCm < maxRangeCm) "near" else "far"
```

Android local build와 EAS build에서 Kotlin compile·autolinking·packaging을 확인했고, `LM-V500N` 실기기에서 `far → near → far`, 마지막 `near` 시각, background·tab 이탈·수동 중지 cleanup과 복귀 후 재동작을 확인했다.

센서가 없는 Android 기기의 실제 `unavailable` path는 별도다. 해당 실물 기기가 없고 emulator 검증을 진행하지 않기로 했으므로 `스킵` 상태다.

### 5.3 iOS `UIDevice`와 App lifecycle

[`ProximitySensorModule.swift`](../modules/proximity-sensor/ios/ProximitySensorModule.swift)는 `UIDevice.current.isProximityMonitoringEnabled`와 `UIDevice.proximityStateDidChangeNotification`을 사용한다.

- event listener가 있고 app이 foreground일 때만 monitoring을 켠다.
- 첫 시작 시 현재 상태를 즉시 event로 보낸다.
- iOS API가 거리를 제공하지 않으므로 `distanceCm`과 `maxRangeCm`은 `NSNull()`이다.
- observer 제거, background 진입, module destroy에서 monitoring을 끈다.

iPhone에서는 센서를 가리면 화면이 꺼질 수 있다. 현재 상태 화면은 시작 전에 `Alert`로 안내하고, 화면이 다시 켜진 후 확인할 수 있도록 `lastNearAt`을 별도로 유지한다.

iOS payload에서 값 부재를 JS의 `null`로 보내는 부분은 다음과 같다.

```swift
sendEvent(proximityEventName, [
  "status": UIDevice.current.proximityState ? "near" : "far",
  "distanceCm": NSNull(),
  "maxRangeCm": NSNull(),
  "observedAt": Date().timeIntervalSince1970 * 1_000
])
```

iOS EAS build에서 Swift arm64 compile과 pod autolink를 확인했다. iPhone 11에서 초기 `far`, 센서 가림에 따른 화면 꺼짐, 해제 후 화면 복귀, 마지막 `near` 시각, 거리·최대 범위의 `없음` 표시를 확인했다. background, 다른 tab, 수동 중지에서는 monitoring이 해제되어 화면이 유지됐고 foreground 복귀 후 다시 동작했다.

### 5.4 `useProximity` 상태 전이와 비동기 구독 제어

`useProximity`는 native 상태를 다음 UI 상태로 바꾼다.

Hook 안의 React state와 ref는 서로 다른 역할을 맡는다.

| 값 | 역할 | 변경 시 render |
| --- | --- | --- |
| `state` | `status`, 최근 event와 `lastNearAt`을 화면에 제공 | O |
| `isMonitoring` | 시작·중지 button에 listener 활성 여부를 제공 | O |
| `subscriptionRef` | 현재 JS event subscription을 보관 | X |
| `operationRef` | 비동기 작업의 최신 번호를 보관 | X |
| `mountedRef` | unmount 뒤 state update를 막는 생존 상태를 보관 | X |

`subscriptionRef.current`가 바뀌어도 React는 다시 render하지 않는다. 따라서
화면의 button 활성 상태에는 별도의 `isMonitoring` state가 필요하다.

```text
화면 진입
  → pending
  → isAvailableAsync()
     ├─ false/error → unavailable
     └─ true        → idle

모니터링 시작
  → pending
  → listener 등록
  → near 또는 far event

중지/화면 이탈
  → listener 제거
  → idle
```

첫 listener와 마지막 listener 사이에는 Expo Module의 observing lifecycle이
연결된다.

```text
첫 addListener
  ├─ Android OnStartObserving(PROXIMITY_EVENT_NAME)
  └─ iOS     OnStartObserving(proximityEventName)
       → startMonitoringIfNeeded()

마지막 subscription.remove()
  ├─ Android OnStopObserving(PROXIMITY_EVENT_NAME)
  └─ iOS     OnStopObserving(proximityEventName)
       → stopMonitoring()
```

listener 등록 뒤 `isAvailableAsync()`를 한 번 더 호출해 Android native 등록 실패도 `unavailable`로 바꾼다. `operationRef`는 이전 async 응답이 중지 이후 상태를 덮어쓰지 못하게 한다.

```ts
const operation = ++operationRef.current;
const isAvailable = await ProximitySensor.isAvailableAsync();

if (!mountedRef.current || operation !== operationRef.current) {
  return;
}
```

여기서 `operation`은 요청을 시작한 시점의 번호다. 사용자가 기다리는 동안 화면을 떠나거나 중지를 누르면 `operationRef.current`가 증가하므로 오래된 응답은 무시된다. `operationRef`는 Promise를 취소하지 않고, 응답이 돌아온 뒤 최신 작업인지 판별하는 번호표다. `mountedRef`는 unmount된 component에 state update가 일어나는 것을 막는다.

비동기 결과를 화면에 반영하지 않는 것과 subscription을 정리하는 것은 별도
문제다. 이전 start A가 listener 등록 뒤 두 번째 `isAvailableAsync()`를 기다리는
동안 Stop과 새 start B가 실행되면, A의 늦은 cleanup이 공유 ref의 B를 제거해서는
안 된다. 각 start는 자신이 만든 subscription을 지역 변수에도 보관한다.

```ts
let createdSubscription: ProximitySubscription | null = null;

createdSubscription = ProximitySensor.addListener(
  "onProximityChange",
  (event) => {
    if (mountedRef.current) {
      setState((current) => applyProximityEvent(current, event));
    }
  },
);
subscriptionRef.current = createdSubscription;
```

정리할 때는 해당 start가 만든 값과 현재 ref가 같은지 먼저 확인한다.

```ts
if (subscriptionRef.current !== expectedSubscription) {
  return;
}

expectedSubscription?.remove();
subscriptionRef.current = null;

if (mountedRef.current) {
  setIsMonitoring(false);
}
```

따라서 A의 subscription과 현재 B subscription이 다르면 A의 cleanup은 아무것도
제거하지 않는다. [`use-proximity.test.tsx`](../src/hooks/use-proximity.test.tsx)는
A의 두 번째 availability Promise를 의도적으로 대기시킨 뒤
Stop→B 시작→A 완료 순서를 만들어 B가 유지되는지 검증한다. 이 소유권 검사는
FLOW-02의 단계 순서를 바꾸지 않고, 실제로 제거된 마지막 listener만 기존
15→16단계의 native cleanup으로 이어지게 한다.

### 5.5 화면 focus부터 계층별 cleanup까지

현재 상태 route에서는 화면 focus와 native resource 수명을 연결한다.

```ts
useFocusEffect(
  useCallback(() => {
    void checkAvailability();
    return stopMonitoring;
  }, [checkAvailability, stopMonitoring]),
);
```

따라서 앱이 background로 가는 경우에는 native lifecycle이 sensor를 멈추고, route가 focus를 잃는 경우에는 React cleanup이 listener 자체를 제거한다. 두 층은 중복이 아니라 서로 다른 종료 경로를 담당한다.

모니터링 중지 버튼은 `stopMonitoring`을 호출할 뿐 화면을 unmount하지 않는다.
화면 blur의 focus cleanup도 같은 `stopMonitoring`을 사용하고, 실제 unmount
때는 hook effect cleanup이 남은 비동기 응답과 subscription을 한 번 더
안전하게 정리한다. 앞선 경로에서 subscription ref를 이미 `null`로 바꾸므로
두 cleanup이 연달아 실행되어도 native listener를 중복 제거하지 않는다.

화면 lifecycle과 app lifecycle은 다음처럼 역할이 다르다.

| 상황 | JS subscription | native listener 수요 | 실제 native resource |
| --- | --- | --- | --- |
| focus + monitoring + foreground | 유지 | 유지 | 동작 |
| app background | 유지 | 유지 | 잠시 중지 |
| app foreground 복귀 | 유지 | 유지 | 다시 시작 |
| 수동 Stop 또는 화면 blur | 제거 | 제거 | 중지 |
| hook owner unmount | 남은 구독 제거 | 제거 | 중지 |

수동 Stop과 blur는 `stopMonitoring`으로 합류해 화면 상태도 정리한다. Hook
unmount cleanup은 화면을 다시 보여줄 필요가 없으므로 비동기 응답을 무효화하고
남은 subscription을 직접 제거하는 최종 안전망이다. Expo event emitter는 실제
마지막 listener가 제거될 때만 `OnStopObserving`을 호출하고, Android와 iOS도
실제 등록 상태를 확인한 뒤 resource를 해제한다.

현재 React 19 cleanup 순서에서 focus된 화면이 blur 없이 직접 unmount되면 hook
effect cleanup 뒤 focus cleanup의 `stopMonitoring`이 불필요한 `setState`를 한 번
요청할 수 있다. 이때 subscription ref는 이미 `null`이고 화면도 제거 중이므로
중복 native cleanup이나 표시 UI 영향은 없다. FieldLog는 학습용 sample이라는
범위에서 이 저영향 cleanup 한계를 인정하고 현행 source를 유지한다.

### 5.6 Android·iOS 차이와 공통 상태 정규화

| 항목 | Android | iOS | 공통 JS 결과 |
| --- | --- | --- | --- |
| native API | `SensorManager.TYPE_PROXIMITY` | `UIDevice` proximity monitoring | `onProximityChange` |
| 상태 판정 | 거리와 maximum range 비교 | `proximityState` boolean | `near` 또는 `far` |
| 거리 | cm 값 제공 | API가 값 미제공 | `number \| null` |
| lifecycle | Activity foreground/background | App foreground/background | listener가 있을 때만 monitoring |
| 기기 관찰 | `LM-V500N` 통과 | iPhone 11 통과 | UI 상태와 cleanup 확인 |
| 미지원 기기 | native path 스킵 | 이번 범위의 별도 미지원 검증 없음 | 성공으로 추정하지 않음 |

## 6. 위치, 날씨, CaptureContext, 저장 흐름

전체 흐름은 다음과 같다.

```text
사용자 버튼
  → foreground 위치 권한 확인/요청
  → 현재 위치 1회 획득
  → Axios로 Open-Meteo 요청
  → Zod 응답 검증/변환
  → 기록 만들기
  → CaptureContext 고정
  → React Hook Form + Zod
  → bound SQL INSERT
  → observations query invalidate
  → 기록 목록
```

### 6.1 Foreground 위치 요청과 `LocationSnapshot`

[`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)는 사용자가 `위치 및 날씨 조회`를 눌렀을 때만 다음 API를 호출한다.

1. `Location.hasServicesEnabledAsync()`
2. `Location.getForegroundPermissionsAsync()`
3. 필요할 때만 `Location.requestForegroundPermissionsAsync()`
4. `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`

2번은 현재 권한 상태를 읽는 단계이고, 3번은 system prompt를 여는 별도
단계다. 3번에서는 사용자가 허용 또는 거부를 선택할 때까지
`await`가 결과를 기다린다. 이미 허용됐거나 `canAskAgain`이 `false`이면 이
prompt 단계는 실행하지 않는다.

위치 서비스 꺼짐, 다시 요청 가능한 거부, 다시 요청할 수 없는 거부, 위치 획득 실패를 서로 다른 메시지로 표시한다. 연속 위치 구독과 background 위치는 없다.

권한 분기는 다음 truth table로 읽을 수 있다.

| services enabled | permission status | `canAskAgain` | 앱 동작 |
| --- | --- | --- | --- |
| false | 관계없음 | 관계없음 | `기기의 위치 서비스가 꺼져 있습니다.` |
| true | granted | 관계없음 | 현재 위치 1회 획득 |
| true | not granted | true | system permission을 한 번 요청 |
| true | not granted | false | system prompt 없이 기기 설정 안내 |

```ts
if (permission.status !== Location.PermissionStatus.GRANTED) {
  if (!permission.canAskAgain) {
    setLocationError("permission-blocked");
    return;
  }

  permission = await Location.requestForegroundPermissionsAsync();
}
```

iPhone 11에서는 최초 거부 직후 `canAskAgain: false`에 해당하는 설정 안내가 표시됐고, 두 번째 button press에서도 system dialog가 다시 나타나지 않았다. 이는 “버튼이 고장남”이 아니라 이미 결정된 iOS 권한을 앱이 다시 prompt할 수 없는 상태다. 설정에서 허용하면 위치·날씨 조회가 복구됐다. 위치 서비스를 끈 경우에는 권한 거부와 다른 문구가 표시됐고 다시 켠 뒤 정상 조회됐다.

### 6.2 좌표 기반 날씨 Query와 실패·재시도 경계

[`src/api/weather.ts`](../src/api/weather.ts)는 Open-Meteo `/v1/forecast`에 다음 현재값만 요청한다.

- `temperature_2m`
- `apparent_temperature`
- `weather_code`
- `temperature_unit=celsius`
- `timezone=GMT`

timeout은 10초다. 취소와 4xx는 재시도하지 않고, network 오류나 5xx만 한 번 재시도한다. query stale time은 5분이다.

`src/schemas/weather.ts`는 응답을 검증하고 GMT 시각을 epoch milliseconds로 바꾼다. DB에는 항상 섭씨를 저장하고 화면에서만 화씨로 변환한다.

query key에 좌표를 포함하므로 서로 다른 위치의 응답을 같은 cache entry로 오인하지 않는다. TanStack Query가 넘긴 `AbortSignal`을 Axios에 전달해 query가 취소되면 HTTP 요청도 취소할 수 있게 한다.

```ts
return useQuery({
  queryKey: weatherKeys.current(coordinates),
  enabled: coordinates !== null,
  queryFn: ({ signal }) => fetchWeather({ ...coordinates, signal }),
  staleTime: 5 * 60 * 1000,
  retry: shouldRetryWeatherRequest,
});
```

좌표가 state에 반영되면 위치 UI는 바로 다시 render되고, 동시에
`enabled: true`가 된 날씨 query가 시작된다. 위치 표시와 날씨 조회는 같은
좌표를 소비하지만 서로 기다리는 순차 UI가 아니다. Query는 `queryFn`의
Promise 결과를 cache와 `pending`·`error`·`data` 상태에 반영하고 화면을 다시
render한다.

retry 정책은 오류 종류를 읽고 결정한다.

- 취소: 재시도하지 않음
- HTTP 4xx: 재시도하지 않음
- HTTP 5xx: 한 번 재시도
- 응답 자체를 받지 못한 network 오류: 한 번 재시도
- Zod parsing 같은 Axios 이외의 오류: 재시도하지 않음

iPhone offline 검증에서는 기기 위치를 얻었지만 날씨만 오류가 됐다. `날씨 다시 시도`는 같은 위치를 유지한 채 `weatherQuery.refetch()`만 호출하고, online 복원 후 날씨가 성공했다. 이 흐름 때문에 위치 성공을 날씨 실패와 함께 버리지 않는다.

### 6.3 현재 runtime 값의 `CaptureContext` 고정

기록 만들기 버튼은 센서 상태가 `near`, `far`, `unavailable` 중 하나이고 위치·날씨 요청이 끝났을 때만 활성화된다.

```ts
type CaptureContext = {
  proximity: ProximitySnapshot
  location: LocationSnapshot | null
  weather: WeatherSnapshot | null
  platform: "android" | "ios"
  capturedAt: number
}
```

위치나 날씨가 없어도 `null` 그대로 저장한다. 가짜 대체 데이터는 만들지 않는다.

기록 만들기 버튼을 누르면 먼저 근접 센서 결과를 불변
`ProximitySnapshot`으로 정규화하고, 그 값과 위치·날씨·platform·캡처 시각을
하나의 `CaptureContext`로 store에 넣은 뒤 작성 route를 연다. 따라서 근접
센서 복사와 전체 context 저장은 서로 다른 단계다.

생성 route의 focus cleanup이 저장, 취소, hardware/gesture back, 다른 화면 이동에서 `CaptureContext`를 제거한다. context 없이 `/observations/new`에 직접 접근하면 현재 상태 탭으로 돌아가는 안내를 표시한다.

저장 성공은 context 제거 뒤 기록 tab으로 `replace`하고, 취소는 context 제거
뒤 이전 route로 `back`한다. focus cleanup은 이 두 명시적 경로 외의 이탈까지
정리하는 안전망이다.

### 6.4 Form state, Zod와 저장 command 결합

[`app/observations/new.tsx`](../app/observations/new.tsx)는 React Hook Form이 field 상태를 맡고, `zodResolver`가 [`observationFormSchema`](../src/schemas/observation.ts)를 runtime validation으로 연결한다.

```ts
const {
  control,
  handleSubmit,
  formState: { errors },
} = useForm<ObservationFormInput, unknown, ObservationFormValues>({
  resolver: zodResolver(observationFormSchema),
  defaultValues: {
    title: "",
    note: "",
    category: "experiment",
  },
});
```

`Controller`는 React Native `TextInput`의 `value`, `onChangeText`, `onBlur`를 form field와 연결한다. `useWatch`는 메모 길이 표시처럼 특정 field 값을 화면에서 관찰할 때만 사용한다.

schema는 제목을 trim한 뒤 1~60자로 제한하고, 메모는 500자 이하, category는 세 값 중 하나로 제한한다. TypeScript generic은 개발 중 type을 맞추고, Zod `parse`는 실제 입력값을 검사하고 trim된 output을 만든다. 둘 중 하나가 다른 하나를 대체하지 않는다.

사용자는 먼저 제목·메모·category를 form state에 입력하고 저장 버튼을
누른다. 그때 `handleSubmit`이 validation을 실행한다. 실패하면 field 오류를
표시하고 `submit`을 호출하지 않으며, 성공한 값만 `CaptureContext`와 합쳐
mutation으로 전달한다.

### 6.5 SQLite binding, nullable row 정규화와 저장 단위

`createObservation`은 중첩된 `CreateObservationInput`을 다시 검증한 뒤 SQLite가 받을 수 있는 scalar·`null`·UTC ISO 문자열로 펼쳐 한 행에 저장한다. 읽을 때는 flat row를 다시 `Observation`의 중첩 snapshot으로 조립한다.

[`src/db/observations.ts`](../src/db/observations.ts)는 사용자 문자열을 SQL text에 이어 붙이지 않고 named parameter를 binding한다. 핵심 구조만 줄이면 다음과 같다.

```ts
const result = await db.runAsync(
  `INSERT INTO observations (
     title,
     captured_at
   ) VALUES (
     $title,
     $capturedAt
   )`,
  parameters,
);
```

이 방식은 제목에 `'` 같은 문자가 있어도 SQL 구조와 data를 분리한다. 테스트도 입력 문자열이 SQL text에 직접 들어가지 않고 parameter object로 전달되는지 확인한다.

목록 query는 `ORDER BY captured_at DESC, id DESC`로 최신순을 보장한다. 같은 캡처 시각이면 auto-increment ID가 큰 기록을 먼저 두므로 순서가 안정적이다. DB의 ISO 문자열은 읽을 때 epoch milliseconds로 되돌리고, 위치나 날씨에 필요한 column 묶음이 불완전하면 해당 snapshot 전체를 `null`로 정규화한다.

#### 섭씨 원본 저장과 표시 단위

날씨는 DB에 항상 `temperature_c`와 `apparent_temperature_c`로 저장한다. 설정에서 화씨를 선택해도 과거 row를 수정하지 않고 [`convertTemperature`](../src/types/weather.ts)가 render 시점에 변환한다.

```ts
return unit === "celsius"
  ? temperatureC
  : (temperatureC * 9) / 5 + 32;
```

이렇게 하면 단위를 여러 번 바꿔도 원본 값을 반복 변환하며 생기는 오차가 없다. Android와 iPhone 모두 섭씨→화씨→재실행, 다시 섭씨→재실행에서 설정과 기존 상세 표시가 함께 복원됨을 확인했다. 단위 선택의 SQLite key-value 저장과 앱 재시작 hydration은 4.3절의 설정 흐름이고, 이 절에서는 기록 row의 섭씨 원본과 render 시점 표시 변환 경계만 다룬다.

### 6.6 Mutation 결과, Query cache와 목록·상세 정합성

submit이 성공하면 다음 단계가 이어진다.

```text
handleSubmit
  → createMutation.mutateAsync
  → pending UI
  → observationFormSchema.parse
  → db.runAsync(INSERT, parameters)
  ├─ 실패 → 입력과 snapshot을 유지한 error UI
  └─ 성공 → observations query invalidate
             → CaptureContext 제거
             → 기록 tab으로 replace
```

TanStack Query는 DB가 아니다. 생성 성공 후 `["observations"]` 아래 query를 invalidate해 목록·상세가 다시 읽을 시점을 알리고, 삭제 성공 후에는 삭제한 상세 cache를 먼저 제거한 뒤 목록을 포함한 나머지 observations query를 invalidate한다.

#### `invalidateQueries`가 다시 실행하는 대상

`invalidateQueries`를 이해하려면 먼저 쓰기 Mutation과 읽기 Query를 분리해야 한다.

| 구분 | 현재 FieldLog 함수 | SQLite 작업 |
| --- | --- | --- |
| 쓰기 Mutation | `createObservation` | 기록 한 건을 `INSERT` |
| 쓰기 Mutation | `deleteObservation` | 기록 한 건을 `DELETE` |
| 읽기 Query | `listObservations` | 기록 목록을 `SELECT` |
| 읽기 Query | `getObservation` | ID에 해당하는 기록을 `SELECT` |

`mutate` 또는 `mutateAsync`를 호출하면 `useMutation`의 `mutationFn`이 실행된다. 생성 Mutation의 `mutationFn`은 `createObservation`, 삭제 Mutation의 `mutationFn`은 `deleteObservation`을 각각 호출한다. 쓰기가 성공한 뒤에만 `onSuccess`가 실행되고, 그 안에서 `invalidateQueries`가 Query cache를 갱신 대상으로 표시한다.

```text
생성 버튼
  → mutateAsync(input)
  → mutationFn: createObservation(db, input)
  → SQLite INSERT 1회
  → onSuccess
  → invalidateQueries(["observations"])
  → 조건에 맞는 활성 Query의 queryFn만 다시 실행
```

```text
삭제 확인
  → mutateAsync(id)
  → mutationFn: deleteObservation(db, id)
  → SQLite DELETE 1회
  → onSuccess
  → 삭제한 detail cache 제거
  → invalidateQueries(["observations"])
  → 조건에 맞는 나머지 활성 Query의 queryFn만 다시 실행
```

따라서 `invalidateQueries`는 `createObservation`이나 `deleteObservation`을 다시 실행하지 않는다. 다시 실행할 수 있는 것은 `useQuery`에 등록된 `queryFn`, 즉 `listObservations`와 `getObservation`이다. 현재 Mutation은 `retry: false`이므로 라이브러리가 실패한 `INSERT`나 `DELETE`를 자동으로 반복하지도 않는다.

`observationKeys`는 다음과 같이 같은 prefix 아래에서 목록과 상세 cache를 구분한다.

```ts
const observationKeys = {
  all: ["observations"],
  list: () => ["observations", "list"],
  detail: (id: number) => ["observations", "detail", id],
};
```

여기서 `all`은 모든 함수를 실행한다는 뜻이 아니다. `queryKey`가 `["observations"]`로 시작하는 목록·상세 Query cache를 모두 찾기 위한 prefix다. Mutation 함수는 이 Query key의 대상이 아니다.

Query의 활성·비활성 기준은 화면에 보이는지가 아니라, 해당 Query를 구독하는 활성화된 `useQuery` observer가 mounted되어 있는지다.

| Query 상태 | 현재 상태의 의미 | `invalidateQueries` 실행 결과 |
| --- | --- | --- |
| 활성 | mounted된 컴포넌트가 `enabled !== false`인 `useQuery`로 구독 중 | 기존 data를 유지한 채 stale로 표시하고 `queryFn`을 즉시 다시 실행한다. |
| 비활성 | cache는 있지만 활성 observer가 없음 | cache를 stale로만 표시하고, 이후 다시 구독될 때 필요한 `queryFn`을 실행한다. |
| cache 없음 | 아직 생성되지 않았거나 제거된 Query | 표시할 Query가 없으므로 아무것도 하지 않는다. 이후 화면이 처음 구독할 때 정상 조회한다. |

예를 들어 `RecordsScreen`이 mounted되어 `useObservationsQuery()`를 호출하면 `["observations", "list"]` Query를 구독하므로 목록 Query가 활성 상태가 된다. 정상 ID의 상세 화면이 `useObservationQuery(id)`를 호출하면 해당 `["observations", "detail", id]` Query가 활성 상태가 된다. 상세 화면을 Stack에서 제거해 unmount하면 observer는 사라지지만 cache가 남아 있는 동안에는 비활성 Query가 된다. 잘못된 ID처럼 `enabled: false`인 Query도 `queryFn`을 실행하는 활성 Query로 계산하지 않는다.

Navigator는 보이지 않는 화면을 mounted 상태로 보존할 수 있다. 따라서 화면에 보이지 않더라도 observer가 남아 있으면 활성 Query이고, `invalidateQueries` 시점에 다시 조회할 수 있다. 반대로 실제로 unmount되어 observer가 없다면 즉시 SQLite `SELECT`를 실행하지 않는다. Query가 활성이라는 사실은 현재 조회 중이라는 뜻도 아니다. 활성은 구독자 유무이고, `isFetching`은 `queryFn`이 실행 중인지 나타내는 별도 상태다.

삭제 버튼을 누른 상세 화면은 `DELETE`가 성공하는 시점에도 mounted되어 있으므로 그 detail Query가 활성 상태다. 현재 코드는 해당 detail cache를 `removeQueries`로 먼저 제거하고 나서 `["observations"]` prefix를 invalidate한다. 따라서 삭제된 detail은 다시 조회할 cache 대상에서 빠지고, 목록을 포함한 나머지 활성 observations Query만 최신 SQLite 값을 읽는다. 이 순서는 `deleteObservation`을 다시 실행하는 것이 아니라, 한 번의 `DELETE` 뒤에 필요한 `SELECT`만 실행되게 한다.

마지막으로 두 cache API의 역할도 다르다.

| API | 기존 cache data | 이후 동작 |
| --- | --- | --- |
| `invalidateQueries` | 유지 | stale로 표시하고 활성 Query를 다시 조회한다. |
| `removeQueries` | Query 항목과 함께 즉시 제거 | 나중에 다시 사용하면 cache가 없는 상태에서 처음부터 조회한다. |

목록에서 상세와 삭제까지의 사용자 흐름은 다음과 같다.

```text
기록 tab render
  → list query → pending/error/empty/data UI
  → 사용자가 row를 누름
  → id가 있는 상세 route
  → id 검증 → detail query → 상태별 상세 UI
  → 사용자가 삭제 버튼을 누름
  → Alert
     ├─ 취소 → 종료
     └─ 확인 → delete mutation pending
                ├─ 실패 → 상세 유지, 다시 시도 가능
                └─ 성공 → detail cache 제거 + 나머지 observations invalidate
                           → 기록 tab으로 replace
```

```ts
onSuccess: async (_, id) => {
  queryClient.removeQueries({
    queryKey: observationKeys.detail(id),
    exact: true,
  });
  await queryClient.invalidateQueries({ queryKey: observationKeys.all });
}
```

실기기에서는 전체 snapshot과 위치·날씨가 없는 최소 snapshot의 생성, 빈 제목 차단, 최신순 목록, 상세, 빈 메모, 삭제 취소·확정, 앱 재실행 후 생성·삭제 상태 유지를 Android와 iPhone에서 확인했다.

## 7. 각 library의 실제 역할

아래 version은 [`package.json`](../package.json)에 선언된 현재 범위다.

| Library | 선언 version | 이 프로젝트에서 하는 일 | 하지 않는 일 |
| --- | --- | --- | --- |
| Expo / React Native | `~54.0.35` / `0.81.5` | app runtime과 native module 기반 | 별도 web app 제공 |
| Expo Router | `~6.0.24` | 세 tab, 생성 route, 동적 상세 route | 기록 data 저장 |
| Expo Location | `~19.0.8` | 사용자 요청 기반 foreground 권한과 현재 위치 1회 획득 | background tracking |
| Expo SQLite | `~16.0.10` | `fieldlog.db`, migration, bound CRUD, Zustand key-value storage | cloud 동기화 |
| TanStack Query | `^5.101.2` | weather와 SQLite read의 비동기 상태, mutation 후 cache 정리 | 영속 DB 대체 |
| Axios | `^1.18.1` | Open-Meteo HTTP 요청, timeout, 취소와 오류 종류 판별 | cache·schema validation |
| Zustand | `^5.0.14` | 임시 `CaptureContext`, 영속 온도 단위, hydration gate | 기록 목록 복제 |
| React Hook Form | `^7.82.0` | 생성 form field, 오류, submit 상태 관리 | domain 저장·API 호출 |
| Zod | `^4.4.3` | 제목·메모·카테고리 경계, Open-Meteo 응답 검증·변환 | UI state 관리 |

TanStack Query는 SQLite를 대체하지 않는다. SQLite가 영속 data source이고 Query는 비동기 상태와 갱신 시점을 관리한다. Zustand에도 기록 목록을 복제하지 않는다.

### 자주 혼동하는 경계

- TypeScript는 compile 시점의 개발자 계약이고 Zod는 runtime의 실제 값 검사다. Open-Meteo 응답을 `unknown`으로 받아 Zod로 검사하는 이유다.
- Axios는 HTTP 전송과 HTTP/network 오류 정보를 제공하고, TanStack Query는 그 Promise의 loading·error·retry·cache 수명을 관리한다.
- React Hook Form은 사용자가 아직 저장하지 않은 form 상태를 관리하고, Zustand의 `CaptureContext`는 이전 화면에서 고정한 sensor snapshot을 전달한다.
- Expo SQLite의 table API는 domain 기록을 저장하고, `expo-sqlite/kv-store`는 작은 설정을 key-value로 저장한다.

이 구분은 “모든 상태를 한 store에 넣기”를 피한다. data의 수명과 원본이 다르면 도구도 다르게 선택한다.

## 8. Expo 제공 기능과 직접 작성한 native 기능

`expo-location`, `expo-sqlite`, `expo-router`는 SDK 54 module을 사용한다. 근접 센서는 Expo가 동일한 Android/iOS 계약으로 제공하지 않으므로 local Expo Module로 작성했다.

먼저 용어를 구분한다.

| 용어 | 의미 | FieldLog에서의 위치 |
| --- | --- | --- |
| Expo SDK package | Expo가 제공하는 JS/native 기능 package | `expo-location`, `expo-sqlite`, `expo-router` |
| app config | native project 생성에 사용할 선언적 설정 | [`app.json`](../app.json) |
| config plugin | prebuild 중 app config를 Android/iOS 설정으로 반영하는 code | `expo-location`, `expo-sqlite` 등의 plugin |
| local Expo Module | 앱 저장소 안에서 직접 유지하는 Kotlin/Swift + JS 계약 | [`modules/proximity-sensor/`](../modules/proximity-sensor/) |
| autolinking | package/module metadata를 읽어 native build에 자동 연결 | `expo-module.config.json`, podspec, Gradle module |
| Prebuild | app config와 template로 `android/`, `ios/` project 생성 | `npx expo prebuild` |
| CNG | 생성된 native project보다 설정·module source를 유지하고 필요할 때 재생성하는 workflow | root `android/`를 산출물로 취급 |
| development build | 앱 고유 native code와 developer menu가 들어간 설치 binary | Android APK, iOS IPA |
| Metro | 설치된 development client가 불러오는 JS/TS bundle server | `npx expo start --dev-client` |
| EAS Build | cloud에서 native project를 생성·compile·sign하는 서비스 | Android/iOS development build |

[`app.json`](../app.json)은 다음 범위를 고정한다.

- `platforms`: Android, iOS
- `newArchEnabled: true`
- light theme
- Android/iOS app identifier
- foreground 위치 설명
- background 위치와 Android foreground service 비활성화
- legacy storage, vibration, overlay 권한 차단

Android debug APK에는 React Native development tooling이 `SYSTEM_ALERT_WINDOW`를 별도 debug manifest에서 추가한다. release merged manifest에는 이 권한이 없음을 확인했다.

### Android 위치 권한 선언 위치와 소유 기준

Android permission을 적을 수 있는 위치가 여러 곳이라고 해서 같은 permission을
모두 반복해서 선언해야 하는 것은 아니다. 선언 위치는 그 native 요구사항을 누가
소유하고, 모든 사용 앱에 고정으로 필요한지 또는 앱마다 선택할 수 있는지에 따라
정한다.

| 위치 | 선언 기준 | FieldLog의 현재 상태 |
| --- | --- | --- |
| `node_modules/expo-location/android/src/main/AndroidManifest.xml` | package가 모든 사용 앱에서 항상 요구하는 고정 native permission | 설치된 `expo-location` package가 `ACCESS_COARSE_LOCATION`과 `ACCESS_FINE_LOCATION`을 선언한다. `node_modules/`는 설치 결과이므로 FieldLog가 직접 수정하지 않는다. |
| [`app.json`](../app.json)의 `plugins` 안 `expo-location` option | iOS permission 설명, background location과 foreground service처럼 앱마다 달라지는 조건부 native 설정 | foreground 설명만 설정하고 iOS·Android background location과 Android foreground service를 모두 비활성화한다. 설치된 plugin은 coarse/fine도 추가하지만, plugin source는 package manifest에 이미 있어 필수 추가가 아니라고 명시한다. |
| [`app.json`](../app.json)의 `android.permissions` | 사용 package가 제공하지 않지만 app 자체가 추가로 요구하는 Android permission | coarse/fine을 다시 명시한다. `expo-location` package manifest가 이미 제공하므로 현재 두 항목은 기술적으로 중복이지만 최종 manifest에서는 같은 permission으로 병합되어 기능 오류를 만들지 않는다. |
| [`modules/proximity-sensor/android/src/main/AndroidManifest.xml`](../modules/proximity-sensor/android/src/main/AndroidManifest.xml) | local module 자체가 모든 사용처에서 요구하는 permission이나 Android component | 근접 센서는 별도 permission이나 component 등록이 필요하지 않아 `<manifest />`만 유지한다. 위치 permission은 이 module의 책임이 아니므로 여기에 선언하지 않는다. |

현재 `app.json`의 coarse/fine 두 항목을 처음 추가한 의도는 source만으로 확정할 수
없다. 기술적으로는 제거해도 `expo-location` package manifest를 통해 같은
permission이 포함되며, 현재 선언은 FieldLog가 foreground 위치 범위를 사용한다는
사실을 app config에서 명시적으로 보여 주는 효과가 있다. 따라서 중복은 동작
오류가 아니며 이 학습에서는 source를 변경하지 않는다.

선언 위치를 선택하는 기준은 다음과 같다.

- package나 local module이 항상 요구하는 고정 permission은 해당 module의
  `AndroidManifest.xml`이 소유한다.
- 앱마다 선택하는 permission 설명·background 기능·service 설정은 config
  plugin option이 소유한다.
- 어느 package도 제공하지 않는 app 자체의 추가 permission은
  `app.json.android.permissions`에 둔다.
- manifest와 plugin은 build-time 선언일 뿐 사용자에게 permission을 허용받지
  않는다. 실제 요청은
  [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)의
  `Location.requestForegroundPermissionsAsync()`가 수행하고, 허용·거부 상태는
  Android/iOS 운영체제가 소유한다.

### Autolinking 핵심 요약

Autolinking은 native code를 직접 실행하거나 compile하지 않고, 앱의 native
build에 연결할 대상을 찾아 주는 배선 담당이다.

```text
1. ./modules에서 ProximitySensor 발견
2. expo-module.config.json에서 platform과 class 확인
3. Android는 build.gradle, iOS는 podspec에 연결
4. Gradle/CocoaPods가 실제 Kotlin·Swift compile
```

| 대상 | 핵심 역할 |
| --- | --- |
| Autolinking | 무엇을 native build에 연결할지 찾는다. |
| `expo-module.config.json` | 연결할 platform·class·podspec 위치를 알려 준다. |
| `build.gradle` | Android module을 어떻게 build할지 정의한다. |
| podspec | iOS module을 어떻게 연결·build할지 정의한다. |
| `Name("ProximitySensor")` | compile된 module을 JS가 찾을 runtime 이름을 정한다. |

Autolinking의 `resolve` 결과는 metadata를 해석한 연결 계획이다. 실제 native
compile 성공, binary 포함 또는 runtime 동작까지 증명하지 않는다.

`expo prebuild --clean --platform android`는 app config, SDK version의 template와 local module metadata를 읽어 `android/`를 다시 만든다. 따라서 수정 기준은 `app.json`과 `modules/proximity-sensor/`이며, 생성된 Gradle·manifest 파일을 직접 고치지 않는다. `--clean`은 native directory를 삭제하고 다시 만들므로 사용자가 만든 변경이 generated directory에만 있다면 사라진다.

이 프로젝트에서 Expo Go를 최종 runtime으로 사용할 수 없는 이유는 Expo Go binary 안에 `ProximitySensor`라는 사용자 정의 module이 없기 때문이다. development build는 이 native module을 포함해 만든 앱 전용 binary이므로 JS에서 `requireNativeModule("ProximitySensor")`가 성공한다.

[`eas.json`](../eas.json)의 profile은 하나뿐이다.

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

`developmentClient: true`는 `expo-dev-client` 기반 개발 binary를 만들고, `distribution: "internal"`은 store를 거치지 않고 직접 설치할 artifact를 만드는 profile이다. iOS ad hoc build는 provisioning profile에 포함된 등록 기기에 설치한다. store 제출용 production profile은 이 프로젝트 범위에 없다.

### 실제 build와 반복 개발

```text
app config / native module 변경
  → Prebuild와 native compile이 포함된 새 development build 필요

JS / TS / style만 변경
  → 이미 설치된 development client + Metro로 다시 확인 가능
```

- Android EAS build `f9f2f11a-d340-4c40-b64d-e087e105ee02`가 완료됐고 `ProximitySensor` code가 APK에 포함됨을 검사했다.
- iOS EAS build `5585528e-f84a-4da1-9796-bcdf774afe16`가 완료됐고 Swift compile, pod autolink, signing과 IPA 내용을 검사했다.
- iOS 뒤로가기 제목은 JS/TS option 변경이므로 새 IPA를 만들지 않고 기존 development client와 최신 Metro source로 iPhone에서 확인했다.

preview/production build, App Store·Play Store 제출, OTA update는 계획상 제외다.

## 9. 주요 TypeScript·React·Kotlin·Swift 문법

### TypeScript 문자열 literal union과 indexed access type

`ProximityUiStatus`와 `ProximitySnapshot`의 `status` property는 허용 상태를 문자열
literal union으로 제한한다. `ProximitySnapshot["status"]`는 이미 선언한
property type을 꺼내 쓰는 indexed access type이다. 공통 판별 property를 가진
여러 object type의 union은 아니므로 discriminated union이라고 부르지 않는다.
`idle`과 `pending`은 UI 전용이며 DB snapshot에는 들어가지 않는다.

```ts
type ProximityUiStatus =
  | "idle"
  | "pending"
  | "near"
  | "far"
  | "unavailable";

type ProximitySnapshot = {
  status: "near" | "far" | "unavailable";
  // ...
};

type ObservationRow = {
  proximity_state: ProximitySnapshot["status"];
};
```

두 union을 일부러 같게 만들지 않은 점이 중요하다. DB에는 “확인 중”이라는 순간 UI 상태를 저장할 이유가 없다. `Record<ProximityUiStatus, string>`은 모든 상태에 표시 문구가 있는지 TypeScript가 확인하게 한다.

### nullable normalization

Android의 거리값과 iOS의 값 부재를 서로 다른 shape로 두지 않고 `number | null`로 맞춘다. 위치와 날씨 snapshot 전체도 없을 수 있으므로 `null`을 사용한다.

`undefined`는 field를 아직 만들지 않았거나 잘못 접근한 경우에도 생길 수 있다. 저장 계약에서는 “값이 없음”을 `null`로 명시해 SQLite `NULL`, native `NSNull()`, TypeScript `null`을 한 의미로 맞춘다.

### React component, JSX와 props

FieldLog의 일반 화면과 표시 component는 props를 받아 JSX를 반환하는 함수다. 예를 들어 [`app/(tabs)/records.tsx`](<../app/(tabs)/records.tsx>)의 `ObservationRow`는 `Observation`과 `onPress` callback을 받고, navigation은 부모 `RecordsScreen`에 남긴다.

```tsx
type ObservationRowProps = {
  observation: Observation;
  onPress: () => void;
};

function ObservationRow({ observation, onPress }: ObservationRowProps) {
  return (
    <Pressable onPress={onPress}>
      <Text>{observation.title}</Text>
    </Pressable>
  );
}
```

`onPress={onPress}`는 함수를 전달하고, `onPress={() => router.push(...)}`는 누를 때 실행할 wrapper를 전달한다. `onPress={router.push(...)}`처럼 호출 결과를 넣으면 render 중 즉시 실행되므로 의미가 다르다. React Hook Form의 `Controller.render`도 library가 인자를 전달해 호출하고 JSX를 돌려받는 callback prop이다.

[`app/_layout.tsx`](../app/_layout.tsx)의 `InitializationErrorBoundary`는 이 앱의 예외적인 class component다. `Component<Props, State>`의 두 type으로 `this.props`와 `this.state`를 정하고, descendant 초기화·render 오류에서는 fallback JSX를 반환한다. 여는 tag와 닫는 tag 사이의 JSX는 `children: ReactNode` prop으로 전달된다.

JSX의 `{...}`에는 JavaScript expression을 넣는다. `prop={value}`는 계산된 값을 전달하고, 값 없는 boolean prop `useSuspense`는 `useSuspense={true}`의 축약이다. `<>...</>` Fragment는 여러 sibling element를 묶지만 별도 React Native `View`나 layout을 만들지 않는다.

전체 화면의 invalid·pending·error·not-found 상태는 [`app/observations/[id].tsx`](../app/observations/[id].tsx)처럼 early return으로 분리한다. 화면 일부는 [`src/components/snapshot-summary.tsx`](../src/components/snapshot-summary.tsx)처럼 삼항식으로 element를 고르고, 표시할 것이 없으면 `null`을 반환한다.

```tsx
{snapshot.location ? (
  <>
    <Text>{snapshot.location.latitude}</Text>
    <Text>{snapshot.location.longitude}</Text>
  </>
) : (
  <Text>저장된 위치가 없습니다.</Text>
)}
```

`CATEGORIES.map(...)`은 각 항목을 JSX element로 변환한다. `key`는 React가 이전·다음 render의 배열 항목 identity를 연결하는 특별한 값이며 일반 component props로 전달되지 않는다. 안정된 `category.value`나 database ID를 사용하고 배열 index는 피한다. React key 자체는 숫자도 허용하지만 React Native `FlatList.keyExtractor`는 `string` 반환 계약이므로 FieldLog 목록은 `String(observation.id)`로 변환한다.

### React Hook, callback, ref와 effect lifecycle

React renderer는 한 component의 Hook을 호출 순서대로 연결해 이전 render의 state와 다음 render의 Hook 호출을 대응시킨다. 따라서 Hook을 조건문이나 반복문 안에서 호출해 순서를 바꾸면 안 된다. [`src/hooks/use-proximity.ts`](../src/hooks/use-proximity.ts) 같은 custom Hook 안의 Hook도 이를 호출한 component의 Hook 목록에 같은 순서로 포함된다.

- `useState`: 바뀌면 화면을 다시 그려야 하는 상태
- `useMemo`: location에서 query 좌표처럼 입력이 같을 때 파생값의 계산과 참조 생성을 건너뜀
- `useCallback`: effect dependency나 child callback에서 같은 함수 identity가 필요한 명령
- `useRef`: listener handle, async sequence처럼 render에는 직접 보이지 않는 mutable 값
- `useEffect`: component mount·dependency 변경·unmount 수명
- `useFocusEffect`: Expo Router screen focus·blur 수명

`useState`의 함수형 setter는 callback이 만들어진 render의 값을 다시 읽는 대신 React가 관리하는 최신 queued state를 `current`로 받는다. 근접 센서 Hook은 비동기 응답과 event가 이전 state를 덮어쓰지 않도록 다음 형태를 사용한다.

```ts
setState((current) => ({
  ...current,
  status: "pending",
  event: null,
}));
```

callback은 자신이 만들어진 render의 값을 closure로 기억한다. `useCallback`은 dependency가 모두 같으면 이전 함수 참조를 재사용하고 하나라도 바뀌면 최신 값을 기억하는 새 함수를 만든다. [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)의 `createObservation`은 캡처할 `weatherQuery.data`뿐 아니라 cached data와 오류 상태를 구분하는 `weatherQuery.isSuccess`도 dependency에 포함한다. `useCallback`을 모든 함수에 붙이는 것이 목표는 아니며, FieldLog에서는 cleanup dependency 안정성과 비동기 명령 공유가 필요한 위치에만 사용한다.

근접 센서 Hook의 ref는 render를 일으키지 않고 render 사이에 다음 mutable 값을 보존한다.

- `subscriptionRef`: 현재 활성 native event subscription
- `operationRef`: 늦게 끝난 이전 비동기 작업을 구별하는 최신 작업 번호
- `mountedRef`: unmount 뒤 비동기 결과가 state를 갱신하지 않게 하는 생존 여부

`useMemo`도 dependency가 같을 때 결과 참조를 재사용할 뿐, TanStack Query의 cache identity를 직접 소유하지 않는다. 현재 화면의 `coordinates`는 `location` 참조가 같을 때 다시 만들지 않지만, weather Query는 `weatherKeys.current`가 만든 좌표 값 배열을 stable hash한 결과로 같은 cache 항목인지 판단한다.

`useEffect`의 setup은 component가 commit된 뒤 실행되고, cleanup은 dependency가 바뀌어 setup을 다시 실행하기 전과 unmount 때 실행된다. 근접 센서 Hook의 빈 dependency effect는 unmount에서 `mountedRef`를 끄고 진행 중 작업을 무효화한 뒤 subscription을 제거한다.

Expo Router의 `useFocusEffect`는 내부적으로 navigation의 focus·blur event를 구독하므로 component가 계속 mount되어 있어도 route focus 수명에 맞춰 setup과 cleanup을 실행한다. callback을 `useCallback`으로 감싸 dependency가 바뀔 때만 다시 등록한다. 현재 상태 탭은 focus 때 센서 지원 여부를 확인하고 blur·unmount 때 `stopMonitoring`으로 진입하며, [`app/observations/new.tsx`](../app/observations/new.tsx)는 화면 이탈 cleanup에서 일회용 `CaptureContext`를 지운다.

화면 blur, component unmount와 앱 background 진입은 같은 사건이 아니다. blur cleanup은 navigation focus 수명, unmount cleanup은 React component 수명, native background hook은 OS app lifecycle을 각각 처리한다. Focus된 현재 상태 화면을 직접 unmount할 때 cleanup 뒤 불필요한 state setter가 한 번 요청될 수 있는 기존 저영향 한계는 native resource나 표시 UI 영향이 없어 학습용 sample 범위에서 현행 유지한다.

### SQL binding

`createObservation`은 사용자 문자열을 SQL에 이어 붙이지 않는다. `$title`, `$note` 같은 placeholder와 parameter object를 `runAsync`에 전달한다.

[`src/db/observations.ts`](../src/db/observations.ts)의 SQLite 함수는 반환할 결과에 따라 다음 API를 사용한다.

| API | FieldLog 사용처 | Promise 성공값 |
| --- | --- | --- |
| `execAsync` | 고정된 migration DDL과 `PRAGMA` | 별도 값 없음 |
| `runAsync` | `INSERT`와 `DELETE` | `lastInsertRowId`, `changes`를 가진 결과 |
| `getAllAsync<T>` | 기록 목록 | `T[]` |
| `getFirstAsync<T>` | schema version과 기록 상세 | `T` 또는 `null` |

```ts
const parameters: Record<string, SQLiteBindValue> = {
  $title: formValues.title,
  $note: formValues.note,
  $latitude: captureContext.location?.latitude ?? null,
};

const result = await db.runAsync(
  `INSERT INTO observations (title, note, latitude)
   VALUES ($title, $note, $latitude)`,
  parameters,
);
```

Named placeholder와 같은 이름의 parameter를 분리하면 문자열의 따옴표나 특수문자도 SQL 문법이 아니라 값으로 전달된다. 설치된 Expo SQLite의 `SQLiteBindValue`는 `string`, `number`, `null`, `boolean`, `Uint8Array`를 허용하므로 FieldLog는 선택값의 `undefined`를 `?? null`로 SQLite `NULL`에 맞춘다. Binding은 값에만 적용되며 table·column 같은 identifier를 대신 만들지는 않는다.

`execAsync`는 전달된 SQL을 대신 escape하지 않는다. [`src/db/migrate.ts`](../src/db/migrate.ts)는 사용자 입력이 없는 고정 SQL만 `execAsync`에 전달하고, runtime 값이 들어가는 조회·생성·삭제에는 parameter binding을 사용한다.

`getAllAsync<ObservationRow>`과 `getFirstAsync<ObservationRow>`의 generic은 TypeScript가 기대 row shape를 검사하게 하지만 실제 SQLite row를 runtime에 검증하거나 변환하지 않는다. 단건 조회의 `null`은 행 없음이고 SQL 실행 실패는 Promise rejection이므로 서로 다른 결과다.

Migration은 table·index·version을 하나의 exclusive transaction으로 묶는다.

```ts
await db.withExclusiveTransactionAsync(async (transaction) => {
  await transaction.execAsync(`
    CREATE TABLE ...;
    CREATE INDEX ...;
    PRAGMA user_version = 1;
  `);
});
```

설치된 Expo SQLite 구현은 `BEGIN` 뒤 callback을 `await`하고, resolve되면 `COMMIT`, reject되면 `ROLLBACK`한 뒤 같은 오류를 다시 throw하며 마지막에 transaction connection을 닫는다. Transaction 안의 SQL은 바깥 `db`가 아니라 callback이 받은 `transaction`으로 실행해야 한다. FieldLog가 `PRAGMA user_version`을 마지막에 실행하므로 앞선 DDL 실패 시 version만 최신으로 남지 않는다.

### Kotlin/Swift lifecycle DSL

Expo Modules API의 `OnStartObserving`, `OnStopObserving`, foreground/background hook, `OnDestroy`를 사용해 JS listener 수명주기와 native resource 수명주기를 연결한다.

### TypeScript generic과 type derivation

```ts
const row = await db.getFirstAsync<ObservationRow>(/* ... */);
type ObservationFormValues = z.output<typeof observationFormSchema>;
```

`<ObservationRow>`은 query 결과로 기대하는 shape를 표현하지만 DB가 runtime에 그 shape를 보장해 주는 validation은 아니다. 반면 `z.output<typeof schema>`는 Zod가 parse한 뒤의 type을 schema에서 직접 유도하므로 schema와 별도 interface가 어긋날 가능성을 줄인다.

`ProximitySnapshot["status"]`는 이미 선언한 object type에서 한 property type만 뽑는 indexed access type이다. 같은 문자열 union을 다시 써서 두 곳이 나중에 달라지는 일을 피한다.

### `async`, `await`, `void`

`async` 함수는 호출자에게 항상 Promise를 반환한다. 본문은 첫 `await`까지 실행된 뒤 해당 Promise가 끝날 때까지 이 함수의 다음 부분만 보류되며 JavaScript thread나 앱 전체를 막지 않는다. 일반 `return` 값은 fulfilled 결과가 되고, `throw` 또는 `await`한 Promise의 rejection은 바깥 Promise에도 rejection으로 전파된다.

```ts
createObservation(...): Promise<number>
deleteObservation(...): Promise<void>
```

`Promise<number>`는 완료와 함께 생성 ID를 제공하고, `Promise<void>`는 별도 성공값 없이 완료만 표현한다. 삭제 mutation의 `UseMutationResult<void, Error, number>`에서 `void`도 같은 의미다.

[`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)의 위치 요청은 `try`·`catch`·`finally`의 차이를 보여준다.

```ts
setIsLocating(true);

try {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    return;
  }

  // permission과 현재 위치를 순서대로 await
} catch {
  setLocationError("unavailable");
} finally {
  setIsLocating(false);
}
```

`catch`는 동기 throw와 `await`한 Promise의 rejection을 처리하고, `finally`는 성공·실패뿐 아니라 `try` 안의 `return` 뒤에도 실행된다. 따라서 위치 service가 꺼졌거나 권한 분기에서 끝나도 loading은 종료된다. 좌표가 state에 반영된 다음 날씨 Query가 별도로 실행되므로 이 함수가 날씨 HTTP Promise까지 직접 기다리는 것은 아니다.

새 기록 저장의 실제 Promise 연결은 다음 순서다.

```text
handleSubmit → submit → mutateAsync → createObservation → db.runAsync
  → async onSuccess → invalidateQueries → mutateAsync resolve
  → CaptureContext 제거 → records route 이동
```

[`app/observations/new.tsx`](../app/observations/new.tsx)의 `await createMutation.mutateAsync(...)`는 SQLite `INSERT`만 기다리지 않는다. 설치된 TanStack Query는 `mutationFn` 성공 뒤 `onSuccess`가 반환한 cache invalidation Promise도 `await`하므로, 임시 context 제거와 route 이동은 두 작업 뒤에 실행된다. Validation·SQL·mutation lifecycle에서 rejection이 생기면 Query가 error state를 보존하고 `submit`의 `catch`가 최종 rejection을 소비한다.

[`app/observations/[id].tsx`](../app/observations/[id].tsx)의 삭제는 같은 성공·실패 관계를 Promise chain으로 표현한다.

```ts
void deleteMutation
  .mutateAsync(id)
  .then(() => router.replace("/(tabs)/records"))
  .catch(() => undefined);
```

`.then()`은 앞 Promise의 fulfilled 결과에서 실행되고 `.catch()`는 앞 단계 어디서든 생긴 rejection을 처리한다. `async`·`await`와 Promise chain은 표현 방식이 다를 뿐 같은 Promise 상태를 연결한다.

event handler는 Promise를 UI framework에 반환해 처리시키지 않고 다음처럼 의도를 표시한다.

```ts
onPress={() => {
  void weatherQuery.refetch();
}}
```

`void`는 작업을 취소하는 문법이 아니다. 반환된 Promise 값을 이 위치에서 사용하지 않는다는 표시다. 오류를 무시해도 된다는 뜻도 아니므로, 실제 오류는 query/mutation state가 화면에 표시한다.

FieldLog의 `checkAvailability`·`beginMonitoring`은 함수 내부 `catch`, mutation은 `catch` 또는 Query state, 기본 `refetch`는 Query result로 실패를 처리한다. React Hook Form의 `handleSubmit(submit)()`은 `Promise<void>`를 반환하지만 `submit` 안에서 mutation rejection을 처리한다.

반면 React Native의 `Linking.openURL`은 URL을 열 수 없으면 reject할 수 있으므로 [`app/(tabs)/settings.tsx`](<../app/(tabs)/settings.tsx>)는 최종 `catch`까지 연결한다.

```ts
void Linking.openURL("https://open-meteo.com/").catch(() => undefined);
```

이 링크는 앱 기능 완료에 필수인 작업이 아니므로 실패 UI를 새로 만들지 않고 best-effort로 끝낸다. 여기서 `catch`가 rejection을 처리하고, 바깥 `void`는 처리된 최종 Promise의 반환값을 사용하지 않겠다는 뜻이다.

### Kotlin에서 읽어야 할 문법

[`ProximitySensorModule.kt`](../modules/proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ProximitySensorModule.kt)는 Android framework callback, Kotlin null safety와 Expo Module DSL이 만나는 FieldLog의 Kotlin source다.

```kotlin
private var sensorManager: SensorManager? = null
sensorManager?.unregisterListener(this)
val context = appContext.reactContext ?: return null
sensorManager?.let { return it }
return@AsyncFunction hasSensor
```

- `Type?`: null 가능 type
- `?.`: null이 아닐 때만 호출하는 safe call
- `?:`: 왼쪽이 null이면 오른쪽을 쓰는 Elvis operator
- `let`: 값을 block에 넘겨 좁은 범위에서 사용
- `return@AsyncFunction`: 바깥 함수가 아니라 이름 붙은 lambda에서 반환
- `: Module(), SensorEventListener`: class 상속과 interface 구현

Android sensor 등록·해제는 main looper에서 실행한다. `Handler(Looper.getMainLooper())`와 `runOnQueue(Queues.MAIN)`은 native resource를 어느 thread에서 다루는지 명시한다.

#### 선언, 재대입과 함수 계약

```kotlin
private const val PROXIMITY_EVENT_NAME = "onProximityChange"

class ProximitySensorModule : Module(), SensorEventListener {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var sensorManager: SensorManager? = null
}
```

- 파일 수준 `private const val`은 이 파일에서만 사용하는 compile-time 상수다.
- `val`은 변수에 다른 참조를 재대입하지 못하게 하지만 참조한 객체 내부까지 immutable하게 만들지는 않는다.
- `var`는 lifecycle에 따라 다른 값을 다시 대입할 수 있다.
- `Module()`은 Expo class의 생성자를 호출해 상속하고, `SensorEventListener`는 생성자가 없는 Android interface를 구현한다.

`override`는 super class나 interface가 선언한 계약을 구현한다. `definition`, `onSensorChanged`, `onAccuracyChanged`가 실제 예다.

```kotlin
override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
```

`= Unit`은 내용 없는 expression-body 함수다. Kotlin의 `Unit`은 완료를 나타내는 실제 단일 값과 type이며 TypeScript의 `void`와 완전히 같은 문법은 아니다.

#### Nullable lazy cache와 scope function

```kotlin
sensorManager?.let { return it }

val context = appContext.reactContext ?: return null

return (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)
  ?.also { sensorManager = it }
```

- `as?`는 cast 실패 시 예외 대신 `null`을 만든다.
- `let`은 non-null receiver를 `it`으로 넘기고 lambda의 결과를 반환한다. 현재 inline `let` 안의 `return it`은 `resolveSensorManager` 자체를 끝내는 non-local return이다.
- `also`는 `it`으로 cache 저장 같은 부수효과를 실행한 뒤 원래 receiver를 반환한다.
- `?: return null`은 왼쪽이 null이면 현재 함수를 즉시 끝낸다.

따라서 system service를 `SensorManager`로 cast하지 못하면 null을 반환하고, 성공하면 같은 객체를 cache에 저장한 뒤 호출자에게 반환한다.

#### 분기, Map과 고차 함수

Kotlin의 `if`는 실행 분기이면서 값을 만드는 expression이 될 수 있다.

```kotlin
val status = if (distanceCm < maxRangeCm) "near" else "far"
```

반면 `startMonitoringIfNeeded`의 `if (...) { return }`은 조건이 맞지 않을 때 함수를 끝내는 guard clause다. `||`는 하나라도 참, `&&`는 모두 참, `!`는 boolean 반전을 뜻한다.

```kotlin
private fun runOnMain(block: () -> Unit) {
  if (Looper.myLooper() == Looper.getMainLooper()) {
    block()
  } else {
    mainHandler.post { block() }
  }
}
```

`block: () -> Unit`은 인자와 의미 있는 반환값이 없는 함수를 parameter로 받는 고차 함수 계약이다. `runOnMain { ... }`은 마지막 lambda를 괄호 밖에 쓰는 trailing-lambda 문법이며, `Handler.post { ... }`는 lambda를 Android `Runnable`로 변환한다.

```kotlin
mapOf(
  "status" to status,
  "distanceCm" to distanceCm
)
```

`to`는 key와 value의 `Pair`를 만들고 `mapOf`는 Pair들로 mutation API를 노출하지 않는 읽기 전용 `Map`을 만든다. 이는 모든 backing object와 포함된 값의 깊은 불변성까지 일반적으로 보장한다는 뜻은 아니다.

#### Expo Module DSL block

```kotlin
override fun definition() = ModuleDefinition {
  Name("ProximitySensor")
  Events(PROXIMITY_EVENT_NAME)

  AsyncFunction<Boolean>("isAvailableAsync") {
    val hasSensor = resolveProximitySensor() != null
    return@AsyncFunction hasSensor &&
      (!hasEventListener || !registrationFailed)
  }.runOnQueue(Queues.MAIN)

  OnStartObserving(PROXIMITY_EVENT_NAME) {
    runOnMain { startMonitoringIfNeeded() }
  }
}
```

`ModuleDefinition { ... }`은 별도 설정 형식이 아니라 설치된 `expo-modules-core`가 제공하는 Kotlin extension function과 receiver lambda다. Receiver type은 `ModuleDefinitionBuilder`이므로 block 안에서 builder를 직접 쓰지 않고 `Name`, `Events`, `AsyncFunction`, lifecycle hook을 호출한다. 설치 source는 개념상 `ModuleDefinitionBuilder(this).also(block).buildModule()` 순서로 이 선언들을 `ModuleDefinitionData`에 모은다.

| DSL | FieldLog에서 등록하는 계약 |
| --- | --- |
| `Name` | TypeScript `requireNativeModule("ProximitySensor")`가 찾는 JS registry 이름 |
| `Events` | native가 보낼 `onProximityChange` event 이름 |
| `AsyncFunction<Boolean>` | JS의 `isAvailableAsync(): Promise<boolean>` 구현 |
| `OnStartObserving`·`OnStopObserving` | 첫 listener 추가와 마지막 listener 제거 뒤 실행할 callback |
| `OnActivityEntersForeground`·`OnActivityEntersBackground` | Activity foreground·background callback |
| `OnDestroy` | module 파괴 때 실행할 cleanup callback |

DSL 평가 시점에는 lifecycle lambda 내부의 sensor 명령이 즉시 실행되지 않는다. Builder가 callback을 등록하고 Expo runtime이 해당 event나 lifecycle 시점에 나중에 호출한다.

설치된 Expo Modules 구현은 `AsyncFunction<Boolean>`을 Boolean async component로 만들고 Kotlin lambda의 반환값을 JS Promise에 resolve한다. Lambda가 예외를 던지면 wrapper가 Promise를 reject한다. Kotlin body 자체가 `suspend`나 Kotlin Promise인 것은 아니며 `.runOnQueue(Queues.MAIN)`이 function component의 실행 queue를 main으로 설정한다.

[`build.gradle`](../modules/proximity-sensor/android/build.gradle)은 중괄호가 비슷해 보여도 Kotlin source가 아니라 Groovy Gradle DSL이다. `expo-module-gradle-plugin`은 Android library의 Expo Modules build 설정을 제공하고, runtime의 `ModuleDefinition` Kotlin DSL과는 역할이 다르다.

### Swift에서 읽어야 할 문법

[`ProximitySensorModule.swift`](../modules/proximity-sensor/ios/ProximitySensorModule.swift)는 UIKit의 근접 상태, Swift optional·closure와 Expo Module result builder DSL이 만나는 FieldLog의 Swift source다.

```swift
guard hasEventListener, isAppForeground, !isMonitoring else {
  return
}

proximityObserver = NotificationCenter.default.addObserver(
  // ...
) { [weak self] _ in
  self?.sendCurrentState()
}
```

- `guard ... else`: 필요한 조건이 아니면 일찍 반환해 본문 들여쓰기를 줄임
- `NSObjectProtocol?`: observer token이 없을 수 있는 optional
- `if let proximityObserver`: optional 값을 안전하게 꺼냄
- `[weak self]`: notification closure가 module을 강하게 붙잡는 cycle을 피함
- `self?.`: `self`가 살아 있을 때만 호출
- `NSNull()`: native collection 안에서 JS `null`로 bridge할 명시적 값

Swift는 `Thread.isMainThread`를 확인하고, 아니면 main queue에서 실행해 `UIDevice` monitoring과 observer 수명을 한 thread에 둔다.

#### 선언, reference mutation과 module 계약

```swift
private let proximityEventName = "onProximityChange"

public final class ProximitySensorModule: Module {
  private var hasEventListener = false
  private var isAppForeground = true
  private var isMonitoring = false
  private var proximityObserver: NSObjectProtocol?
}
```

- 파일 범위 `private let`은 이 파일에서만 보이고 다른 값을 재대입할 수 없는 binding이다.
- `var`는 listener·app·monitoring lifecycle에 따라 값을 다시 대입할 수 있다.
- `final`은 다른 class가 `ProximitySensorModule`을 subclass하지 못하게 한다.
- Optional stored property `NSObjectProtocol?`은 observer token이 없을 수 있으며 초기값은 `nil`이다.

설치된 Expo Modules Core 3.0.30은 `Module`을 다음 class·protocol composition의 typealias로 정의한다.

```swift
public typealias Module = AnyModule & BaseModule
```

따라서 `: Module`을 풀어 읽으면 `BaseModule`을 상속해 `sendEvent`와 `appContext`를 사용하고, `AnyModule` protocol의 `definition()` 계약을 구현한다는 뜻이다.

```swift
let device = UIDevice.current
device.isProximityMonitoringEnabled = true
```

`let device`는 다른 `UIDevice` reference로 재대입할 수 없지만, `UIDevice` class instance의 mutable property까지 immutable하게 만들지는 않는다. 파일 상수, module instance property, 함수의 local binding은 각각 서로 다른 scope와 수명을 가진다.

#### Optional, `guard`와 cleanup

```swift
guard hasEventListener, isAppForeground, !isMonitoring else {
  return
}

guard device.isProximityMonitoringEnabled else {
  removeProximityObserver()
  return
}
```

`guard`의 쉼표로 연결한 조건은 모두 참이어야 아래 정상 경로로 진행한다. 첫 guard는 JS listener 수요, app foreground와 실제 monitoring 상태를 확인하고, 두 번째 guard는 하드웨어가 monitoring enable을 유지하지 못하면 앞에서 만든 observer까지 되돌린다. `!`는 boolean을 반전하고 `||`는 두 조건 중 하나라도 참인지 확인한다.

```swift
if let proximityObserver {
  NotificationCenter.default.removeObserver(proximityObserver)
  self.proximityObserver = nil
}
```

Swift 5.9의 shorthand optional binding은 property에 값이 있을 때 같은 이름의 non-optional local constant로 꺼낸다. 안쪽 `proximityObserver`는 제거할 token이고, `self.proximityObserver`는 제거 뒤 `nil`로 비울 module property다.

#### Escaping closure, capture list와 `_`

```swift
proximityObserver = NotificationCenter.default.addObserver(
  forName: UIDevice.proximityStateDidChangeNotification,
  object: device,
  queue: .main
) { [weak self] _ in
  self?.sendCurrentState()
}
```

마지막 인자를 괄호 밖에 쓴 trailing closure는 `NotificationCenter`에 저장되어 상태 변화 때 나중에 호출된다. `[weak self]` capture list는 closure가 module을 강하게 유지하는 순환 참조를 막고, `_`는 전달된 `Notification` parameter를 사용하지 않는다는 뜻이다. `self?.`는 weak reference가 아직 살아 있을 때만 method를 호출한다.

```swift
private func runOnMain(_ block: () -> Void) {
  if Thread.isMainThread {
    block()
  } else {
    DispatchQueue.main.sync(execute: block)
  }
}
```

여기서 `_`는 다른 문맥으로, 호출할 때 `block:` external argument label을 생략하게 한다. `block: () -> Void`는 인자와 반환값이 없는 closure를 parameter로 받는 고차 함수 계약이다. 이미 main thread이면 바로 호출하고, 아니면 main queue에서 동기 실행한다. 먼저 thread를 검사하므로 main thread에서 다시 `DispatchQueue.main.sync`를 호출하는 경로를 피한다.

Source의 `.main`도 parameter type 문맥에 따라 다르다. `AsyncFunction.runOnQueue(.main)`은 `DispatchQueue.main`, `NotificationCenter.addObserver(..., queue: .main)`은 `OperationQueue.main`이다.

#### Dictionary와 `nil`·`NSNull()` bridge

```swift
sendEvent(proximityEventName, [
  "status": UIDevice.current.proximityState ? "near" : "far",
  "distanceCm": NSNull(),
  "maxRangeCm": NSNull(),
  "observedAt": Date().timeIntervalSince1970 * 1_000
])
```

`BaseModule.sendEvent`의 body parameter는 `[String: Any?]`이므로 문자열, `NSNull`과 `Double`을 한 dictionary에 담는다. 삼항식은 iOS boolean 상태를 공통 `near`·`far` 문자열로 바꾸고, 초 단위 `timeIntervalSince1970`에 1,000을 곱해 JS epoch millisecond에 맞춘다.

Swift `nil`은 optional native 값이 없음을 나타낸다. `NSNull()`은 collection 안에 존재하는 실제 객체이므로 `distanceCm`과 `maxRangeCm` key를 유지한 채 Expo bridge를 거쳐 명시적인 JS `null`이 된다. 이 dictionary의 `[String: Any?]`는 넓은 Swift type 계약일 뿐 TypeScript `ProximityEvent` shape를 runtime에 검증하지 않으므로 native key·값과 TypeScript 선언을 함께 유지해야 한다.

#### Expo Module result builder DSL

```swift
public func definition() -> ModuleDefinition {
  Name("ProximitySensor")
  Events(proximityEventName)

  AsyncFunction("isAvailableAsync") { () -> Bool in
    // ...
  }.runOnQueue(.main)

  OnStartObserving(proximityEventName) {
    self.runOnMain { self.startMonitoringIfNeeded() }
  }
}
```

`AnyModule.definition()`에는 설치된 `expo-modules-core`의 `@ModuleDefinitionBuilder` result builder가 선언되어 있어 구현 method에 annotation을 다시 쓰지 않아도 된다. Builder의 `buildBlock(_ definitions: AnyDefinition...)`이 여러 factory 결과를 모아 `ModuleDefinition`을 만든다. 따라서 중괄호가 비슷해도 Kotlin의 receiver lambda DSL과 구현 문법은 다르다.

| DSL | FieldLog에서 등록하는 계약과 callback 시점 |
| --- | --- |
| `Name` | TypeScript `requireNativeModule("ProximitySensor")`가 찾는 registry 이름 |
| `Events` | native가 보낼 `onProximityChange` event 이름 |
| `AsyncFunction` | JS가 `isAvailableAsync()`를 호출할 때 body 실행 |
| `OnStartObserving`·`OnStopObserving` | 해당 event의 첫 listener 추가·마지막 listener 제거 때 callback 실행 |
| `OnAppEntersForeground`·`OnAppEntersBackground` | iOS app foreground·background 전환 때 callback 실행 |
| `OnDestroy` | module이 파괴될 때 마지막 cleanup callback 실행 |

Definition을 만들 때 lifecycle closure 내부의 `UIDevice` 명령이 모두 즉시 실행되는 것은 아니다. Factory와 result builder가 callback을 definition에 등록하고 Expo runtime이 JS 호출, listener 수 변화나 app·module lifecycle 시점에 나중에 실행한다.

설치된 `AsyncFunction` factory는 Swift closure의 반환 type을 받아 JS Promise function을 만든다. Expo runtime은 지정 queue에서 body를 실행하고 현재 `Bool`을 `Promise<boolean>`에 resolve하며, thrown error는 reject한다. 기본 Expo async queue 대신 `.runOnQueue(.main)`을 지정한 이유는 `UIDevice` 접근을 main queue에 두기 위해서다.

이 문법들이 만드는 FieldLog lifecycle 관계만 압축하면 다음과 같다.

```text
첫 JS listener → OnStartObserving → observer 등록·monitoring 활성화
app background → monitoring 정리, JS listener 수요는 보존
app foreground → listener가 남아 있으면 monitoring 재시작
마지막 listener 또는 module destroy → observer·monitoring 정리
```

이는 5-3의 iOS end-to-end lifecycle을 반복하는 것이 아니라 Swift closure와 Expo DSL이 어느 시점의 명령을 등록하는지 구분하기 위한 문법 예시다.

## 10. 자동화와 실기기 검증 구분

같은 기능도 질문에 따라 필요한 증거가 다르다.

| 확인하려는 질문 | 맞는 증거 | FieldLog 결과 |
| --- | --- | --- |
| schema가 잘못된 값을 거부하는가 | Jest unit test | 통과 |
| hook이 listener cleanup을 호출하는가 | mocked module + hook test | 통과 |
| Kotlin/Swift가 실제 SDK와 compile되는가 | native build log | Android local/EAS, iOS EAS 통과 |
| module이 binary에 연결됐는가 | autolink/build/artifact 검사 | Android·iOS 통과 |
| 실제 센서가 event를 내는가 | 지원 실기기 조작 | `LM-V500N`, iPhone 11 통과 |
| iPhone이 near에서 화면을 끄는가 | iPhone 실제 관찰 | 통과 |
| 권한 dialog가 다시 나타나는가 | 권한 초기화·거부·재요청 실험 | iPhone에서 설정 안내와 prompt 미표시 확인 |
| offline에서 위치를 보존하고 날씨만 재시도하는가 | network를 끈 실기기 흐름 | iPhone 통과 |
| process 재시작 후 DB와 설정이 남는가 | 앱 강제 종료·재실행 | Android·iPhone 통과 |
| 센서 없는 Android의 native `unavailable`이 동작하는가 | 센서 없는 실물 기기 또는 emulator | 사용자 결정으로 스킵 |

### 자동화가 확인한 좁은 계약

Jest 9 suites·35 tests는 다음을 확인한다.

- [`src/schemas/observation.test.ts`](../src/schemas/observation.test.ts): trim, 빈 제목과 길이 경계
- [`src/schemas/weather.test.ts`](../src/schemas/weather.test.ts): Open-Meteo shape와 GMT 시각 변환, 잘못된 응답 거부
- [`src/types/weather.test.ts`](../src/types/weather.test.ts): 섭씨·화씨 변환
- [`src/hooks/use-proximity.test.tsx`](../src/hooks/use-proximity.test.tsx): availability, `near/far`, 마지막 `near`, 등록 실패, 지연된 start의 subscription 소유권, unmount cleanup
- [`src/db/observations.test.tsx`](../src/db/observations.test.tsx): nullable row mapping과 bound INSERT
- [`src/db/observation-mutations.test.ts`](../src/db/observation-mutations.test.ts): 생성·삭제 후 query cache 정리와 삭제 detail 우선 제거 순서
- [`src/store/app-store.test.ts`](../src/store/app-store.test.ts): `partialize`, hydration, 임시 capture 제거
- [`app-tests/current-status-screen.test.tsx`](../app-tests/current-status-screen.test.tsx): proximity UI 상태, 기록 button gate와 cached 날씨 오류 시 저장 경계
- [`app-tests/new-observation-screen.test.tsx`](../app-tests/new-observation-screen.test.tsx): form 오류, 고정 snapshot submit, context 없는 직접 접근

local native module은 [`jest.setup.ts`](../jest.setup.ts)에서 mock한다. 따라서 이 test들은 `SensorManager`나 `UIDevice` 자체를 실행하지 않는다.

### build가 추가로 확인한 계약

- Android clean prebuild: app config 반영과 CNG 재생성 가능성
- Expo autolinking: local module metadata가 native project에 연결됨
- Kotlin/Swift compile: source가 각 platform SDK와 type 수준에서 맞음
- manifest·artifact 검사: 권한과 native code가 최종 binary에 포함됨
- signing과 설치 artifact: 등록된 기기에 설치할 수 있는 development build 생성

build 성공만으로 센서 앞을 손으로 가렸을 때의 runtime behavior까지 증명되지는 않는다.

### 실기기가 추가로 확인한 계약

- 물리 근접 센서 event와 iPhone 화면 꺼짐·복귀
- route/tab/background/manual stop에 따른 실제 resource 해제
- iOS system permission dialog와 Settings 복구
- 실제 Open-Meteo 성공, offline 오류, online 재시도
- SQLite 생성·조회·삭제와 process 재시작 persistence
- Zustand 온도 단위 hydration

반대로 UI로 재실행 persistence를 관찰한 것을 sandbox DB 파일 직접 검사로 표현하지 않는다. 검증 결과의 원문과 제한사항은 [implementation-plan.md](./implementation-plan.md)의 검증 기록을 기준으로 본다.

### 현재 재현 가능한 자동화 명령

```powershell
npm test -- --runInBand
npm run lint
npm run typecheck
npx expo-doctor@latest
npx expo install --check
```

이 명령은 문서 변경 자체의 필수 검사는 아니며, 앱 source나 package를 바꿨을 때 사용한다. 실기기 검증을 대신하지 않는다.

## 11. 복습 실습

구현 범위를 늘리지 않고 다음 순서로 읽고 확인한다.

1. [`src/types/observation.ts`](../src/types/observation.ts)에서 UI에만 있는 `idle`, `pending`과 저장 가능한 상태를 구분한다.
2. [`app/_layout.tsx`](../app/_layout.tsx)의 JSX를 종이에 tree로 그려 DB migration과 Zustand hydration 중 무엇이 먼저 route를 막는지 설명한다.
3. [`src/hooks/use-proximity.test.tsx`](../src/hooks/use-proximity.test.tsx)에서 `near → far` 뒤에도 `lastNearAt`이 유지되는 assertion을 찾고 [`applyProximityEvent`](../src/hooks/use-proximity.ts)의 어느 조건과 대응하는지 찾는다.
4. Kotlin의 `distanceCm < maxRangeCm`와 Swift의 `proximityState`가 공통 `near/far` event로 모이는 지점을 나란히 표시한다.
5. [`app/(tabs)/index.tsx`](<../app/(tabs)/index.tsx>)에서 위치 성공 후 날씨 실패가 기록을 막지 않는 조건과, `날씨 다시 시도`가 위치를 지우지 않는 이유를 찾는다.
6. [`src/db/migrate.ts`](../src/db/migrate.ts)의 18개 column과 [`src/db/observations.ts`](../src/db/observations.ts)의 row field·named parameter를 한 항목씩 대응시킨다.
7. 생성 성공과 삭제 성공에서 query cache 처리가 왜 다른지 `invalidateQueries`와 `removeQueries`를 사용해 설명한다.
8. [`src/store/app-store.ts`](../src/store/app-store.ts)에서 `partializeAppState`가 `captureContext`를 제외하지 않았다면 재실행 후 어떤 잘못된 UX가 생길지 설명한다.

### 작은 변경 실습

동작 범위를 늘리지 않는 가장 작은 실습은 validation 경계를 test-first로 바꿔 보는 것이다.

1. [`src/schemas/observation.test.ts`](../src/schemas/observation.test.ts)의 “제목 60자를 허용한다” test를 복사해 “61자는 거부한다” case를 만든다.
2. `npm test -- --runInBand src/schemas/observation.test.ts`로 먼저 통과 여부를 확인한다.
3. 학습을 위해 schema의 `.max(60)`을 잠깐 `.max(61)`로 바꾸고 같은 test가 실패하는지 확인한다.
4. 변경한 schema를 반드시 `.max(60)`으로 직접 되돌리고 test를 다시 통과시킨다.
5. 이 실습 결과는 기능 변경이 아니므로 plan 검증 기록이나 handoff에 새 기능처럼 기록하지 않는다.

Git 명령으로 원복하는 것을 전제로 하지 않는다. 시작 전 원래 한 줄을 확인하고 실습 직후 직접 되돌린다.

### 학습 종료 점검

다음 질문에 source 위치를 가리키며 답할 수 있으면 핵심 흐름을 한 번 따라간 것이다.

- 왜 Expo Go가 아니라 development build가 필요한가?
- 센서 event가 background나 tab 이탈 뒤 남지 않게 하는 두 cleanup 층은 무엇인가?
- 위치가 없거나 날씨가 실패해도 어떤 값이 `null`로 저장되는가?
- SQLite, TanStack Query, Zustand가 각각 어떤 data의 원본인가?
- 자동화 통과만으로 증명할 수 없는 항목은 무엇인가?
- Android native `unavailable`은 왜 `통과`가 아니라 `스킵`인가?

## 공식 참고 문서

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo Location SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/location/)
- [Expo SQLite SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/)
- [Expo Modules API](https://docs.expo.dev/modules/module-api/)
- [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [EAS development build](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [TanStack Query v5](https://tanstack.com/query/v5/docs/framework/react/overview)
- [Axios](https://axios-http.com/docs/intro)
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [React Hook Form](https://react-hook-form.com/docs)
- [React Hook Form resolvers](https://github.com/react-hook-form/resolvers)
- [Zod 4](https://zod.dev/)
- [React Hooks](https://react.dev/reference/react/hooks)
- [Open-Meteo API](https://open-meteo.com/en/docs)

이 참고 문서는 API 전체를 외우기 위한 목록이 아니다. 먼저 FieldLog source의 실제 호출을 읽고, parameter나 lifecycle 의미를 확인할 때 해당 공식 문서의 좁은 항목으로 돌아간다.
