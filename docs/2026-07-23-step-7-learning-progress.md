# FieldLog 대화형 학습 진행표

- 운영 결정일: 2026-07-23
- 작업 경로: `D:\Development\ReactNative\Workspaces\my-sample-app`
- 학습 기준: [learning-guide.md](./learning-guide.md)
- authoritative 계획서: [implementation-plan.md](./implementation-plan.md)
- 7번 완료 기록: [2026-07-23-step-7-handoff.md](./2026-07-23-step-7-handoff.md)
- 저장소 선행 작업 완료 기록: [2026-07-24-step-9-10-handoff.md](./2026-07-24-step-9-10-handoff.md)
- 현재 상태: **대화형 학습 진행 중, 1단원 1-1~1-4·2단원 2-1~2-3·3단원 3-1~3-4 사용자 검증 완료, 4단원 시작 대기**

이 문서는 대화 내용을 복제하지 않고 대화형 학습의 현재 위치, 사용자 source 확인 결과, 질문의 결론과 학습서 수정 필요 사항을 새 세션에서도 복원할 수 있게 기록한다.

## 실행 순서

1. `[완료]` 8번 `AGENTS.md Improver` 조사·수정안 검토와 승인된 반영을 마쳤다.
2. `[완료]` 9번 GitHub repository 조건 확정·생성·연결을 마쳤다.
3. `[완료]` 10번 현재 기준 source·문서의 의미·기능·작업별 commit과 1차 push를 마쳤다.
4. `[진행 중]` 이 진행표를 기준으로 대화형 학습과 실제 source 확인을 진행한다. 현재 1단원 1-1~1-4, 2단원 2-1~2-3과 3단원 3-1~3-4를 완료했고 4단원 시작을 기다린다.
5. 학습 중 오류·누락이 발견되면 학습서를 수정하고 필요한 문서 검증을 다시 수행한다.
6. 학습으로 생긴 수정은 기존 1차 push와 구분해 추가 commit/push한다.

정식 대화형 학습은 2026-07-24 시작했다. 형식 검토를 위해 앞부분을 대화형으로 재구성했던 기존 결과는 학습 완료 증거로 사용하지 않고, 실제 source 확인과 질의응답 뒤 사용자가 완료를 명시한 서브 스탭만 완료로 기록한다.

## 대화형 학습 계약

각 대단원은 내용의 크기와 의존 관계에 맞춰 서브 스탭으로 나눈다. 서브 스탭 하나의 대화 형식은 다음 순서를 따른다.

1. 학습 목표
2. 개념과 project 내 책임 설명
3. 실제 source 경로
4. 필요한 실제 코드
5. data·event·lifecycle 예시
6. 사용자가 직접 확인할 source 지점
7. 서브 스탭 핵심 요약

사용자는 제시된 source를 직접 읽고 대화창에서 질문한다. 질문과 확인 과정에서 해결되지 않은 오류·누락이 없어야 사용자가 해당 서브 스탭의 완료를 확인할 수 있다. 사용자의 확인 전에는 다음 서브 스탭으로 넘어가지 않는다.

## 상태 정의

| 상태 | 의미 |
| --- | --- |
| 대기 | 아직 실제 학습을 시작하지 않음 |
| 진행 중 | 현재 대화와 source 확인이 진행 중 |
| 수정 필요 | 설명이나 source 근거의 오류·누락이 발견됨 |
| 사용자 검증 완료 | source 확인과 질의응답을 마치고 사용자가 완료를 확인함 |

`수정 필요` 상태에서는 다음 서브 스탭으로 넘어가기 전에 수정 대상, 근거, 검증 결과를 기록한다. 실제 수정 시점과 묶음은 오류의 관계를 보고 결정하며, 대화 한 번마다 commit하지 않는다.

## 형식 검증 결과

| 검토 항목 | 결과 | 완료로 계산하지 않는 이유 |
| --- | --- | --- |
| 1장 `검증 경계` 대화형 재구성 | 형식 검토 완료 | 본격적인 source 학습 단락이 아니어서 분량 판단용으로만 사용 |
| 2장 전체 대화형 재구성 | 과도하게 김 | 한 대단원을 여러 서브 스탭으로 분리해야 함을 확인 |
| 2장 첫 서브 스탭 재구성 | 사용자 승인 | 목표·실제 코드·설명·핵심 요약의 적정 분량을 확인한 형식 표본 |

위 결과는 전달 형식을 확정한 근거다. 사용자가 각 source를 따라가며 질문·검증한 정식 학습 완료 기록은 아니다.

## 전체 학습 진행 상태

| 순서 | 학습 단원 | 상태 | 현재 기록 |
| --- | --- | --- | --- |
| 1 | 먼저 알아둘 검증 경계 | 사용자 검증 완료 | 1-1~1-4 사용자 검증 완료 |
| 2 | 프로젝트 구조와 책임 | 사용자 검증 완료 | 2-1~2-3 사용자 검증 완료 |
| 3 | Expo Router 화면 흐름 | 사용자 검증 완료 | 3-1~3-4 사용자 검증 완료 |
| 4 | 앱 시작, SQLite migration, Zustand hydration | 대기 |  |
| 5 | 근접 센서와 native lifecycle | 대기 |  |
| 6 | 위치, 날씨, `CaptureContext`, 저장 흐름 | 대기 |  |
| 7 | 각 library의 실제 역할 | 대기 |  |
| 8 | Expo 제공 기능과 직접 작성한 native 기능 | 대기 |  |
| 9 | 주요 TypeScript·React·Kotlin·Swift 문법 | 대기 |  |
| 10 | 자동화와 실기기 검증 구분 | 대기 |  |
| 11 | 복습 실습 | 대기 |  |

각 대단원의 서브 스탭 목록은 실제 학습 직전에 제시하고 사용자가 분량을 확인한 뒤 이 표 또는 해당 단원 아래에 추가한다. 2단원은 학습서와 실제 source를 다시 대조해 아래 3개, 3단원은 Expo SDK 54·설치된 Expo Router 계약과 실제 route source를 다시 대조해 아래 4개 서브 스탭으로 확정했다. 완료를 명시한 서브 스탭만 완료로 기록한다.

### 1단원 서브 스탭 진행 상태

| 순서 | 서브 스탭 | 상태 | 확인 범위 |
| --- | --- | --- | --- |
| 1-1 | 증거 층과 주장 범위 | 사용자 검증 완료 | source·config, 자동화, native build·artifact, 실기기와 Git 증거가 확인하는 범위를 구분 |
| 1-2 | Jest mock과 실제 native code의 경계 | 사용자 검증 완료 | `jest.setup.ts`, TypeScript native 계약, hook·화면 test |
| 1-3 | Native build·artifact와 실기기 증거 | 사용자 검증 완료 | module metadata, Kotlin·Swift source, EAS development build와 지원 실기기 결과 |
| 1-4 | 결과 상태와 남은 제한사항 | 사용자 검증 완료 | `통과`, `확인`, `미검증`, `스킵`, platform·시점별 제한 |

### 2단원 서브 스탭 진행 상태

| 순서 | 서브 스탭 | 상태 | 확인 범위 |
| --- | --- | --- | --- |
| 2-1 | 저장소 지도와 source/generated 경계 | 사용자 검증 완료 | `app/`, `src/`, local module source, config·test와 root native project·`.expo/`·module build output 경계 |
| 2-2 | 계층별 책임과 공용 코드 분리 기준 | 사용자 검증 완료 | route 화면, 공용 TypeScript 계층과 실제 재사용을 기준으로 한 component 분리 |
| 2-3 | 하나의 기록을 따라가는 source 읽기 순서 | 사용자 검증 완료 | 관측 기록의 type, capture, form, SQLite, 목록·상세 연결 순서 |

### 3단원 서브 스탭 진행 상태

| 순서 | 서브 스탭 | 상태 | 확인 범위 |
| --- | --- | --- | --- |
| 3-1 | Root Stack, Tabs와 파일 기반 route | 사용자 검증 완료 | `expo-router/entry`, Root Stack·Tabs navigator 계층, route group·index·동적 segment와 화면·URL 대응 |
| 3-2 | 현재 상태에서 새 기록 화면으로 | 사용자 검증 완료 | `CaptureContext`를 navigation 전제로만 확인하고 생성 route의 `push`·`back`·`replace`와 이탈 경로 추적 |
| 3-3 | 기록 목록에서 동적 상세 화면으로 | 사용자 검증 완료 | 목록 row의 ID 전달, 동적 route parameter 검증과 상세 상태별 navigation 결과 |
| 3-4 | URL·memory state, navigation history와 platform header 경계 | 사용자 검증 완료 | URL 식별자와 memory-only 상태, `push`·`back`·`replace`, 공통 navigator와 iOS header 표시 차이 |

### 3~11단원 서브 스탭 예정안

아래 목록은 2026-07-24 기준 전체 학습량과 흐름을 파악하기 위한 비확정 예정안이다. 2단원과 3단원은 위 목록으로 확정했으며, 아래 예정안만으로 나머지 단원의 `대기` 상태를 바꾸거나 학습 완료 증거로 사용하지 않는다. 아래 3단원 행은 최초 예정안을 보존한 이력이고 현재 범위와 상태는 위 확정 목록을 따른다.

각 단원을 시작하기 직전에 `docs/learning-guide.md`와 실제 source를 다시 읽고 의존 관계와 분량을 확인한 뒤 사용자와 최종 목록을 확정한다. 이 과정에서 제목·개수·경계가 조정될 수 있으며, 확정된 목록만 해당 단원의 진행 상태로 기록한다.

3단원은 기존 4개 순서와 3-1~3-3 제목을 유지했다. 3-4는 별도의 platform별 navigator가 있는 것으로 오해하거나 6단원의 `CaptureContext` 구현을 침범하지 않도록 `URL·memory state, navigation history와 platform header 경계`로 제목과 범위를 좁혀 확정했다.

| 단원 | 예상 개수 | 예정 서브 스탭 | 간략 범위 |
| --- | ---: | --- | --- |
| 3. Expo Router 화면 흐름 | 4개 | `3-1` Root Stack, Tabs와 파일 기반 route<br>`3-2` 현재 상태에서 새 기록 화면으로<br>`3-3` 기록 목록에서 동적 상세 화면으로<br>`3-4` URL state, `CaptureContext`와 platform별 navigation | route group·동적 segment, 생성·상세 이동, 임시 상태와 iOS back title |
| 4. 앱 시작, SQLite migration, Zustand hydration | 4개 | `4-1` Root 초기화 tree와 화면 표시 gate<br>`4-2` SQLite migration과 schema version<br>`4-3` Zustand persist와 hydration<br>`4-4` 초기화 완료와 QueryClient 동작 정책 | DB와 설정 복원 순서, migration transaction, persisted state와 route 노출 조건 |
| 5. 근접 센서와 native lifecycle | 5개 | `5-1` 공통 TypeScript bridge 계약<br>`5-2` Android `SensorManager` lifecycle<br>`5-3` iOS `UIDevice` lifecycle<br>`5-4` `useProximity` 상태와 cleanup<br>`5-5` Android·iOS 차이와 공통 상태 정규화 | JS 계약부터 Kotlin·Swift resource lifecycle, hook 상태와 platform 차이 |
| 6. 위치, 날씨, `CaptureContext`, 저장 흐름 | 6개 | `6-1` Foreground 위치 권한과 위치 서비스<br>`6-2` 날씨 API, schema와 재시도<br>`6-3` `CaptureContext` snapshot<br>`6-4` React Hook Form과 Zod<br>`6-5` SQLite 저장과 TanStack Query cache<br>`6-6` 저장 단위와 표시 설정 분리 | 사용자 요청부터 위치·날씨 조회, snapshot·form·DB 저장과 섭씨/화씨 표시까지의 end-to-end 흐름 |
| 7. 각 library의 실제 역할 | 2개 | `7-1` Library 책임 지도<br>`7-2` 자주 혼동하는 상태 경계 | Expo/RN library별 실제 책임과 TypeScript·Zod, Axios·Query, DB·store·form 경계 |
| 8. Expo 제공 기능과 직접 작성한 native 기능 | 4개 | `8-1` Expo SDK package와 local Expo Module<br>`8-2` App config, config plugin과 권한<br>`8-3` Autolinking, Prebuild와 CNG<br>`8-4` Expo Go, development build, EAS와 Metro | SDK 기능과 custom native code, generated project, build·반복 개발 경계 |
| 9. 주요 TypeScript·React·Kotlin·Swift 문법 | 6개 | `9-1` TypeScript union과 type derivation<br>`9-2` Nullable 값의 platform 정규화<br>`9-3` React callback, ref와 effect lifecycle<br>`9-4` SQL binding과 비동기 문법<br>`9-5` Kotlin 문법과 Expo Module DSL<br>`9-6` Swift 문법과 lifecycle | 실제 FieldLog source에 등장하는 type, hook, SQL, 비동기와 native 언어 문법 |
| 10. 자동화와 실기기 검증 구분 | 4개 | `10-1` 질문에 맞는 증거와 자동화 범위<br>`10-2` Native build·autolink·artifact 증거<br>`10-3` 실기기 runtime과 남은 제한<br>`10-4` 재현 명령과 결과 기록법 | Jest mock, native build, artifact, 실기기 증거와 과장 없는 결과 표현 |
| 11. 복습 실습 | 4개 | `11-1` Type·초기화·native 흐름 추적<br>`11-2` 위치·DB·cache·store 흐름 추적<br>`11-3` 작은 test-first 변경 실습<br>`11-4` 최종 source 질의와 학습 종료 점검 | 주요 source를 다시 연결하고 원복 가능한 작은 실습과 최종 완료 기준 확인 |

## 질문·결론 기록

정식 학습을 시작했다. 모든 대화 내용을 옮기지 않고 source 확인 중 나온 핵심 판단과 해결된 결론만 기록한다.

| 단원·서브 스탭 | 확인한 source | 질문 또는 발견 | 결론 | 상태 |
| --- | --- | --- | --- | --- |
| 1-1 증거 층과 주장 범위 | `package.json`, `app.json`, `modules/proximity-sensor/src/ProximitySensorModule.ts`, `docs/learning-guide.md` 1장, `docs/implementation-plan.md` 9.4절 | command 선언만으로 실행 성공을 증명할 수 없고, `requireNativeModule("ProximitySensor")`는 JS 계약이지 Kotlin·Swift compile 근거가 아니며, 지원 Android 성공을 native `unavailable` 성공으로 확대할 수 없음을 확인 | 실행 주체가 사용자일 필요는 없지만 해당 checkout·환경의 실제 실행 기록이 필요하다. Native compile은 build log·artifact, 센서 없는 Android 경로는 해당 조건의 실물 기기 또는 emulator 증거가 필요하며 현재는 `스킵`이다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 1-2 Jest mock과 실제 native code의 경계 | `package.json`, `jest.setup.ts`, `modules/proximity-sensor/index.ts`, `modules/proximity-sensor/src/ProximitySensorModule.ts`, `modules/proximity-sensor/src/ProximitySensor.types.ts`, `src/hooks/use-proximity.ts`, `src/hooks/use-proximity.test.tsx`, `app-tests/current-status-screen.test.tsx` | hook test는 실제 `useProximity`에 mocked native module을 주입하고, 화면 test는 `useProximity` 자체를 mock한다. `near/far` event와 listener 등록 실패는 test가 callback과 반환값을 직접 주입함을 확인 | `addListenerMock.mockImplementation`이 callback을 보관하고 test가 `emit`으로 event를 호출한다. `remove()` assertion은 hook의 mock subscription 호출만 증명하며 native resource 해제를 증명하지 않는다. 두 `mockResolvedValueOnce`는 실제 Android 실패가 아닌 hook 분기 simulation이다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 1-3 Native build·artifact와 실기기 증거 | `modules/proximity-sensor/expo-module.config.json`, `modules/proximity-sensor/src/ProximitySensorModule.ts`, `modules/proximity-sensor/android/build.gradle`, `modules/proximity-sensor/ProximitySensor.podspec`, Kotlin·Swift module source, `docs/2026-07-22-step-4-handoff.md`, `docs/2026-07-23-step-5-handoff.md` | JS runtime 이름은 Kotlin·Swift의 `Name("ProximitySensor")`와 일치하고 autolinking class 이름은 별도 역할임을 확인했다. Artifact marker, 실기기 증거와 native·JS 변경의 rebuild 경계를 구분함 | DEX·IPA marker는 compile된 module이 최종 binary에 포함됐음을 추가로 증명하지만 설치·runtime·센서 동작은 증명하지 않는다. 실제 `near/far`와 수행한 lifecycle 시나리오는 지원 실기기 증거다. Swift와 module metadata 변경은 development rebuild, TSX 문구 변경은 기존 client와 Metro로 확인한다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 1-4 결과 상태와 남은 제한사항 | `docs/learning-guide.md` 1장, `docs/implementation-plan.md` 9.4절·현재 진행 상태, Android `ProximitySensorModule.kt`, `src/hooks/use-proximity.ts`, observation route의 `headerBackTitle`, 설치된 navigation type | 날짜별 `미검증` 이력과 최신 판정, `스킵` 범위 결정, source 분기와 native runtime 증거, platform·artifact 시점별 제한을 구분했다. 비날짜 문서에 대화형 학습 `대기` 문구가 남은 상태 누락도 확인 | 과거 행은 당시 증거 상태를 보존하고 현재 판정은 최신 행을 따른다. `스킵`은 runtime 성공이 아니며, iPhone UI 영속화는 sandbox DB 직접 조회가 아니고 `headerBackTitle` 수정 후 Android 실기기는 재실행하지 않았으며 날씨 코드는 고정값이 아니다. 승인에 따라 비날짜 상태 문구를 현재 진행 상태와 진행표 기준으로 갱신 | 사용자 검증 완료 |
| 2-1 저장소 지도와 source/generated 경계 | `.gitignore`, `package.json`, `app/(tabs)/index.tsx`, `modules/proximity-sensor/expo-module.config.json`, TypeScript bridge와 Kotlin·Swift module source, 현재 Git tracked·ignored 상태 | root `android/`와 module의 Android source, app 수준 native 설정과 근접 센서 구현 기준, route·공용 TypeScript·화면 test 위치, `.expo/`의 성격을 구분함 | 앱 수준 native 설정은 `app.json`, 근접 센서 구현은 `modules/proximity-sensor/`가 기준이다. Route는 `app/`, 여러 화면에서 쓰는 TypeScript 기능은 `src/`, 화면 test는 `app-tests/`에 둔다. `.expo/`는 Expo CLI·개발 서버·build inspection 등이 만드는 재생성 가능하고 오래될 수 있는 ignored output이므로 구현 source의 기준이 아니다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 2-2 계층별 책임과 공용 코드 분리 기준 | `app/observations/new.tsx`, `app/observations/[id].tsx`, `src/components/snapshot-summary.tsx`, `src/types/observation.ts`, `src/schemas/observation.ts`, `src/api/weather.ts`, `src/db/observations.ts`, `src/hooks/use-proximity.ts`, `src/store/app-store.ts` | Route가 하위 기능을 조합하는 구조, `SnapshotSummary`와 route 전용 `MessageState`의 분리 기준, API·schema·DB·store의 책임을 구분했다. 임시 캡처 상태를 처음에는 `src/components/`로 분류해 실제 소유 위치를 다시 확인함 | `SnapshotSummary`는 생성·상세 화면에서 같은 props 계약으로 사용하므로 공용 component이고, `MessageState`와 한 화면 전용 helper·style은 route에 남긴다. Open-Meteo 호출은 `src/api/`, runtime 검증은 `src/schemas/`, SQLite query는 `src/db/`가 맡는다. `captureContext`는 `src/store/app-store.ts`가 소유하며 `SnapshotSummary`는 상태를 저장하지 않고 props로 전달받아 표시한다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 2-3 하나의 기록을 따라가는 source 읽기 순서 | `src/types/observation.ts`, `app/(tabs)/index.tsx`, `src/store/app-store.ts`, `app/observations/new.tsx`, `src/db/observations.ts`, `app/(tabs)/records.tsx`, `app/observations/[id].tsx` | `CaptureContext`·`CreateObservationInput`·`Observation`의 변화, 사용자 입력과 snapshot의 결합 지점, 저장 함수가 반환한 ID와 상세 route에 전달되는 ID의 경로를 구분함 | `CaptureContext`의 근접 센서·위치·날씨·platform·`capturedAt`에 form의 `title`·`note`·`category`가 `new.tsx`의 `mutateAsync({ ...values, captureContext })`에서 결합된다. DB 저장·조회 뒤에는 ID가 포함되고 snapshot 필드가 펼쳐진 `Observation`이 된다. 새 기록 화면은 저장 반환 ID를 route에 사용하지 않으며, 기록 목록의 `renderItem`이 선택한 `item.id`를 상세 route에 전달한다. 학습서 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 3-1 Root Stack, Tabs와 파일 기반 route | `package.json`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/records.tsx`, `app/(tabs)/settings.tsx`, `app/observations/new.tsx`, `app/observations/[id].tsx` | `expo-router/entry`부터 Root Stack·Tabs와 route 파일의 대응을 확인했다. `(tabs)`가 URL에서 빠지는 route group이고 `[id]`가 동적 segment이며, root layout에 observation용 `Stack.Screen`을 명시하지 않아도 파일 route가 자동 연결되는 점을 확인한 뒤 추가 질문 없이 완료를 명시함 | 파일이 route를 만들고 `_layout.tsx`가 navigator 관계를 정한다. Root Stack의 `(tabs)` 아래에 세 tab이 있고 observation route는 Tabs 바깥의 Root Stack에 있다. Root는 `(tabs)` header를 숨기고 각 tab header는 Tabs가 담당한다. 학습서와 source의 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 3-2 현재 상태에서 새 기록 화면으로 | `app/(tabs)/index.tsx`, `src/store/app-store.ts`, `app/observations/new.tsx` | 현재 상태 화면이 `setCaptureContext`를 먼저 호출한 뒤 `/observations/new`를 `push`하고, 작성 화면이 context 유무에 따라 form과 방어 화면을 선택하는 흐름을 확인했다. 취소·system/gesture back·저장 성공·실패·context 없는 직접 접근의 navigation 결과를 대조한 뒤 추가 질문 없이 완료를 명시함 | 취소는 context를 지우고 `back`, 저장 성공은 context를 지우고 기록 tab으로 `replace`, 저장 실패는 현재 route와 context를 유지한다. system/gesture back 등 기타 이탈은 `useFocusEffect` cleanup이 context를 제거하며, 직접 접근 방어 화면은 이전 history를 신뢰하지 않고 현재 상태 tab으로 `replace`한다. `CaptureContext`의 생성·저장 구현은 6단원에 남겼고 학습서와 source의 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 3-3 기록 목록에서 동적 상세 화면으로 | `package.json`, `app.json`, 설치된 Expo Router type, `app/(tabs)/records.tsx`, `app/observations/[id].tsx`, `src/db/observations.ts` | 목록 row의 숫자 `item.id`가 URL 문자열로 변환되어 `/observations/[id]`의 `params.id`로 전달되고, 상세 화면이 local parameter를 양의 정수로 다시 검증하는 경계를 확인했다. invalid·pending·error·not-found·success 상태와 삭제 취소·처리 중·실패·성공의 navigation 결과를 대조한 뒤 추가 질문 없이 완료를 명시함 | `typedRoutes`의 source 작성 시점 검사는 외부 URL의 runtime 유효성을 대신하지 않는다. 형식이 잘못된 ID는 SQL을 실행하지 않고, 형식은 유효하지만 행이 없는 ID와 조회 오류는 별도 상태로 처리한다. 목록에서 상세로는 `push`, invalid·not-found 복귀 버튼과 삭제 성공은 기록 tab으로 `replace`하며 나머지 처리 중·오류·취소 상태는 상세 route를 유지한다. SQL·cache 구현 상세는 6·7단원에 남겼고 학습서와 source의 오류·누락은 발견되지 않음 | 사용자 검증 완료 |
| 3-4 URL·memory state, navigation history와 platform header 경계 | `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/records.tsx`, `app/observations/new.tsx`, `app/observations/[id].tsx`, `src/store/app-store.ts`, 설치된 Expo Router·native-stack type | URL·route state, runtime navigation history와 memory-only `captureContext`를 구분하고 현재 source의 모든 `push`·`back`·`replace` 결과를 대조했다. 공통 Root Stack의 `title`·`headerBackTitle` option과 iOS·Android 표시 계약을 확인한 뒤 추가 질문 없이 완료를 명시함 | 기록 ID는 다시 조회 가능한 URL 식별자지만 `captureContext`는 영속 대상에서 제외되고 작성 route 이탈 시 제거된다. `push`는 이전 화면을 남기고, `back`은 실제 이전 history로 돌아가며, `replace`는 이전 history를 신뢰할 수 없거나 현재 route를 남기지 않을 때 명시적 목적지로 교체한다. `headerBackTitle`은 iOS·Web의 표시 후보일 뿐 back 목적지를 바꾸지 않고 Android는 icon 중심이다. 앱 초기화는 4단원, `CaptureContext` 생성·form·저장과 cache는 6단원에 남겼다. 학습서와 source의 오류·누락은 발견되지 않았으며 detail not-found 보완 뒤 iPhone runtime 미재검증 한계는 유지한다. | 사용자 검증 완료 |

## 학습서 수정 대기 목록

현재 수정 대기 항목은 없다. 1-4에서 발견한 상태 문구 누락, 2단원 시작 전 전체 source 대조에서 발견한 학습 주석 오류, 3단원 시작 전 상세 화면 header option 누락과 docs·repository 진입 문서 정합성 보완을 아래와 같이 반영했다. 단원 시작 전 보완은 해당 단원의 학습 시작이나 완료로 계산하지 않는다.

| 단원·서브 스탭 | 수정 대상 | 근거 | 검증 방법 | 반영 상태 |
| --- | --- | --- | --- | --- |
| 1-4 | `docs/learning-guide.md`, `docs/implementation-plan.md`, 이 진행표 | 실제 학습이 진행 중인데 비날짜 상태 문구 일부가 `대기`로 남아 있었음 | 경로·link·Markdown 구조·오래된 상태 문구·trailing whitespace 확인 | 반영 완료 |
| 2단원 시작 전 source 대조 | `modules/proximity-sensor/` bridge·native source의 학습 주석, `src/hooks/use-proximity.ts`, `src/api/weather.ts`, `src/components/snapshot-summary.tsx`, `src/db/observations.ts`, 이 진행표 | `docs/source-commentary-guide.md`의 `FLOW-02`·`FLOW-03`·`FLOW-04`·`FLOW-05`·`FLOW-06` 단계 정의와 일부 source 표식이 어긋났고, 생성된 ID를 상세 route에 사용한다는 주석이 실제 기록 탭 이동과 달랐음 | 실제 caller·consumer와 중앙 `FLOW` 정의 재대조, source executable line 비변경 확인, `git diff --check`, Markdown 구조·trailing whitespace 확인 | 반영 완료 |
| 3단원 시작 전 source 대조 | `app/observations/[id].tsx`, 설치된 Expo Router·React Navigation option 처리, 이 진행표 | 상세 화면의 invalid·pending·error·success 분기는 iOS `headerBackTitle: "기록"`을 명시하지만 not-found 분기만 title만 설정했다. 기존 option의 얕은 병합으로 일반적인 전환에서는 누락이 가려질 수 있으나 해당 분기가 원하는 문구를 독립적으로 선언하지 않았고, 상세 화면 전용 자동화 test도 없음 | 모든 상세 상태 분기의 option 재대조, not-found 분기에 동일한 `headerBackTitle` 적용, `npm run lint`, `npm run typecheck`, `npm test -- --runInBand` 9 suites·33 tests, `git diff --check`, Markdown 구조·link·trailing whitespace 확인. iPhone runtime은 다시 실행하지 않아 source·type·기존 자동화 회귀 검증으로 한정 | 반영 완료 |
| 3단원 시작 전 docs 전체 정합성 대조 | `docs/implementation-plan.md`, `docs/learning-guide.md`, `docs/architecture-internals.md`, `docs/2026-07-23-step-5-handoff.md`, `docs/2026-07-20-implementation-handoff.md`, 이 진행표 | 계획서가 완료 단원을 중복 기록해 다음 단원에서 stale될 구조였고, 2026-07-28 header 보완이 일부 문서에 반영되지 않았다. 구조 지도에는 `src/query-client.ts`와 일부 공용 component가 빠졌고 schema 책임은 외부 API 응답 검증을 포함하지 않았으며, 과거 APK link는 Git에 없는 ignored output을 가리켰음 | 현재 source·config와 전체 docs 재대조, local link·경로·Markdown table·code fence·상태 문구·trailing whitespace 확인, `git diff --check`. 문서 전용 변경이므로 test·build는 실행하지 않음 | 반영 완료 |
| 3단원 시작 전 repository 진입 문서 대조 | `AGENTS.md`, `README.md`, `docs/architecture-internals.md`, 이 진행표 | source 주석 안내서와 app-wide query 정책이 `AGENTS.md`·`README.md`에 연결되지 않았고, 1~10번 완료 뒤에도 외부 작업 승인 기준이 `현재 번호 단계`로 한정돼 있었다. 내부 구조 문서는 module Android source와 그 아래 ignored Gradle `build/` output의 예외를 명시하지 않았음 | 최신 source·config·docs와 책임·경계 재대조, local link·경로·Markdown table·code fence·상태 문구·trailing whitespace 확인, `git diff --check`. 문서 전용 변경이므로 test·build는 실행하지 않음 | 반영 완료 |
| 2026-07-29 FLOW 표식 정정 | `docs/source-commentary-guide.md`, FLOW 관련 주석이 있던 source 23개, 이 진행표 | FLOW 전체 요약의 누락·오용, 범위·복수 단계 표식과 동일 단계 중복 때문에 keyword 검색 결과가 하나의 실행 흐름과 일대일로 대응하지 않았음 | inline 주석 관리 대상 37개와 실제 caller·consumer 재대조, 전체 요약 6/6·단계 67/67의 각 1회 사용, 범위·복수 단계와 보조 주석의 FLOW 번호 0건, source 실행문 비변경, `npm run lint`, `npm run typecheck`, local link·Markdown 구조·trailing whitespace, `git diff --check` 확인 | 반영 완료 |
| 2026-07-29 관련 코드 소속·설명 원복 | `docs/source-commentary-guide.md`, FLOW 관련 주석이 있던 source 23개, 이 진행표 | 직전 정정에서 단계가 아닌 설명을 plain `[관련 코드]`로 바꾸면서 keyword 검색만으로 소속 FLOW를 알 수 없었고, 일부 기존 설명이 새 단계 문구로 대체되며 축약됐음 | plain `[관련 코드]` 0건, `[FLOW-번호 / 관련 코드]` 57건의 단일 FLOW 소속, 전체 요약 6/6·단계 67/67 유지, `HEAD` 대비 기존 주석 본문 누락 0건, source 실행문 비변경, `npm run lint`, `npm run typecheck`, local link·Markdown 구조·trailing whitespace, `git diff --check` 확인 | 반영 완료 |
| 2026-07-30 FLOW-02 사용자 검증 보완 | `docs/source-commentary-guide.md`, `app/(tabs)/index.tsx`, `src/hooks/use-proximity.ts`, Android·iOS `ProximitySensorModule`, 이 진행표 | 시작·중지 버튼의 사용자 동작, React UI 반영, `OnStartObserving`·`OnStopObserving`이 정식 단계에서 빠졌고 Android·iOS 구현과 수동 중지·unmount cleanup이 순차 단계처럼 분리되어 실제 분기 관계가 드러나지 않았음 | 실제 caller·consumer와 Expo SDK 54 observing 계약을 재대조하고 platform 경로는 A/B, JS cleanup 진입점은 14-A/14-B로 구분했다. FLOW-02 단계 표식 22/22의 각 1회 사용, 전체 FLOW 단계 표식 74/74, source 실행문 비변경, `npm run lint`, `npm run typecheck`, local link·Markdown 구조·trailing whitespace와 `git diff --check` 확인 | 반영 완료 |
| 2026-07-30 FLOW-01~06 사용자 검증 통합 반영 | `docs/source-commentary-guide.md`, `docs/learning-guide.md`, FLOW-03~06 관련 source, 이 진행표 | FLOW-01의 import·store/queryClient 생성 시점과 FLOW-02의 사용자 동작·observing·cleanup 설명을 관련 문서에 반영하고, 같은 기준으로 FLOW-03~06의 권한 prompt, 병렬 consumer, form·query·mutation UI 상태, 취소·실패·성공·cleanup 경로를 각각 한 단계로 분리할 필요가 있었음 | 기존 주석 본문을 삭제·축소하지 않고 표식 변경과 설명 추가로 반영했다. FLOW별 단계 표식 8/22/15/19/22/13, 전체 99/99와 전체 요약 6/6의 각 1회 사용, 복수·범위 단계와 plain `[관련 코드]` 0건, `HEAD` 대비 기존 주석 본문 누락 0건, FLOW-01/02 보강 문구 유지, source 실행문 비변경, `npm run lint`, `npm run typecheck`, local link·code fence·Markdown 구조·trailing whitespace와 `git diff --check` 확인 | 반영 완료 |
| 2026-07-31 FLOW-01~06 주석 흐름 사용자 검증 마무리 | `docs/source-commentary-guide.md`, FLOW-01~06 관련 source, 이 진행표 | 사용자가 각 FLOW의 단계 표식을 따라 source 호출·분기·UI 반영·cleanup 흐름을 직접 확인하고 FLOW-04·05·06까지 적절하다고 최종 확인함 | FLOW-01~06 주석 작업은 추가 수정 없이 마무리한다. 이 검증은 대화형 학습 3단원 완료와 구분하며, 이번 문서 변경은 의도적으로 commit/push하지 않고 새 세션의 3단원 진행 중 생기는 문서 변경과 함께 Git에 반영한다. | 사용자 검증 완료 |

학습 중 수정이 생기면 source·package·build·app config 변경과 문서 전용 변경을 구분한다. 문서 보완은 좁은 link·snippet·Markdown 검증을 수행하고, 동작 변경이 필요할 때는 별도 Impact Review와 해당 범위의 자동화·build·실기기 검증을 먼저 정한다.

## 최종 완료 기준

- 모든 대단원의 모든 서브 스탭이 `사용자 검증 완료`다.
- 각 서브 스탭에서 사용자가 실제 source를 확인하고 질문을 마쳤다.
- 발견된 오류·누락이 학습서에 반영됐거나 명시적인 비수정 결론으로 해결됐다.
- 학습서 local link, code snippet, 상태 표현과 Markdown 구조를 최종 검증했다.
- 학습으로 생긴 수정이 있다면 추가 commit/push를 완료했다.
- 수정이 없다면 추가 commit/push가 불필요하다는 결론을 기록했다.

이 기준을 모두 충족한 뒤에만 대화형 학습을 최종 완료로 기록한다.
