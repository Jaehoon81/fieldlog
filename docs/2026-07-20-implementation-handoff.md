# FieldLog 구현 Handoff

> 최신 재개 문서: [2026-07-22-step-4-handoff.md](./2026-07-22-step-4-handoff.md)
> 이 문서의 본문은 2026-07-20 당시 상태를 보존합니다. 이후 완료된 EAS·Android 실기기 검증과 4번 재개 기준은 최신 문서를 따릅니다.

- 기준일: 2026-07-20
- 최종 구현 기준: [implementation-plan.md](./implementation-plan.md)

현재 상태는 **`implementation-plan.md` 기준 구현과 로컬 검증은 완료**, **EAS 원격 빌드와 실제 Android/iPhone 검증만 남은 상태**입니다. 계획서 밖의 기능이나 Git 작업은 진행하지 않았습니다.

## 현재까지 구현한 작업

| 영역 | 구현 내용 | 상태 |
|---|---|---|
| 프로젝트 설정 | Expo SDK 54, React Native 0.81.5, Expo Router 6 기반 구성 | 완료 |
| 앱 식별 정보 | `FieldLog`, Android/iOS 전용, scheme·package·bundle identifier 설정 | 완료 |
| 플랫폼 범위 | Web·태블릿 지원 제외, 라이트 테마 고정 | 완료 |
| 권한 구성 | 포그라운드 위치 권한만 사용. 백그라운드 위치·foreground service·저장소·진동·overlay 권한 제외 | 완료 |
| 네이티브 근접 센서 | Android Kotlin 및 iOS Swift 기반 로컬 Expo Module 구현 | 완료 |
| 센서 상태 모델 | `idle`, `pending`, `near`, `far`, `unavailable` 상태와 시작·중지 처리 | 완료 |
| 생명주기 정리 | listener 제거, 화면 이탈, 앱 background 전환, 모듈 종료 시 센서 감시 정리 | 완료 |
| 현재 상태 탭 | 근접 상태, Android 거리·최대 거리, iOS 제한 안내, 마지막 `near` 시각 표시 | 완료 |
| 위치 수집 | 사용자가 직접 누를 때만 일회성 현재 위치 수집 | 완료 |
| 날씨 조회 | Open-Meteo 현재 날씨 조회, 실패 표시와 명시적 재시도 제공 | 완료 |
| 관찰 기록 생성 | 센서·위치·날씨를 동결한 `CaptureContext`로 작성 화면 진입 | 완료 |
| 입력 검증 | 제목 trim 후 1–60자, 메모 최대 500자, 고정 category enum 검증 | 완료 |
| 캡처 방어 | 센서 상태가 불확실하거나 위치·날씨가 처리 중일 때 캡처 비활성화 | 완료 |
| 임시 상태 정리 | 저장·취소·뒤로 가기·화면 이탈 시 `CaptureContext` 제거 | 완료 |
| 직접 경로 접근 | 캡처 문맥 없이 작성 경로에 접근할 때 별도 안내 UI 제공 | 완료 |
| 기록 목록 | SQLite 데이터를 `captured_at DESC, id DESC` 순서로 표시 | 완료 |
| 기록 상세/삭제 | 상세 조회 및 확인 대화상자를 거친 삭제 지원 | 완료 |
| 설정 | 섭씨/화씨 설정 저장 및 Open-Meteo 출처·비상업 범위 표시 | 완료 |
| 데이터 계층 | SQLite migration, `user_version`, WAL, index, bound parameters 적용 | 완료 |
| 서버 상태 | TanStack Query 조회·mutation·저장/삭제 후 cache invalidation 구성 | 완료 |
| 클라이언트 상태 | Zustand로 임시 캡처 상태 관리, 온도 단위만 영속화, hydration gate 적용 | 완료 |
| API 방어 | Axios 10초 timeout, Zod 응답 검증, 네트워크/5xx에만 1회 재시도 | 완료 |
| 학습 문서 | 현재 소스 구조와 흐름을 설명하는 `learning-guide.md` 작성 | 완료 |

## 검증 결과

| 검증 항목 | 결과 | 구체적인 확인 내용 |
|---|---|---|
| Lint | 통과 | 정적 분석 오류 없음 |
| TypeScript | 통과 | 타입 검사 오류 없음 |
| Jest | 통과 | **9개 suite, 30개 test** 전체 통과 |
| Expo Doctor | 통과 | **18/18 checks passed** |
| Expo 의존성 검사 | 통과 | SDK 54 호환 의존성 확인 |
| Android Hermes export | 통과 | Android JS bundle 생성, 1,231 modules 처리 |
| Android 네이티브 모듈 compile | 통과 | `:proximity-sensor:compileDebugKotlin` |
| Android 앱 assemble | 통과 | `:app:assembleDebug` |
| Android release manifest | 통과 | 계획 외 민감 권한이 포함되지 않음을 확인 |
| 로컬 모듈 autolink | 통과 | `proximity-sensor` 연결 확인 |
| Android EAS build | 미검증 | EAS 계정에 로그인되지 않음 |
| iOS EAS/Swift compile | 미검증 | EAS 미로그인으로 실제 Swift 빌드 불가 |
| Android 실제 기기 | 미검증 | 연결된 ADB 기기 및 AVD 없음 |
| iPhone 실제 기기 | 미검증 | iOS 빌드 및 등록된 기기 없음 |

생성된 Android 개발 APK는 [app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk)입니다.

- 크기: `169,182,874 bytes`
- SHA-256: `0C46D64F5BCD3412C2E02385B54DD9CA70D94CCB81CA4BF183B6CECBE73ED73B`

## 현재 상황

현재 저장소의 소스·package·app config·네이티브 모듈·테스트·문서는 계획서 범위대로 구현되어 있습니다.

Android 쪽은 Kotlin 네이티브 모듈을 포함한 로컬 Gradle 빌드와 APK 생성까지 성공했으므로, 최소한 **JavaScript bundle과 Android 네이티브 코드가 함께 컴파일되는 상태**는 확인됐습니다.

다만 다음 두 가지는 구분해야 합니다.

- **Android:** 빌드까지 완료됐지만 실제 기기의 proximity sensor, 위치 권한, 앱 background 전환 동작은 아직 확인하지 못했습니다.
- **iOS:** Swift 구현 파일은 있지만 Windows 로컬 환경에서는 컴파일할 수 없었으므로, iOS EAS build가 성공하기 전까지는 컴파일 완료로 간주할 수 없습니다.

현재 확인된 추가 기능 구현 누락은 없습니다. 남은 것은 주로 외부 빌드 환경과 실기기에서 계획서의 수용 기준을 확인하는 일입니다.

기준 문서는 다음 두 파일입니다.

- [implementation-plan.md](./implementation-plan.md)
- [learning-guide.md](./learning-guide.md)

## 남은 작업

| 우선순위 | 남은 작업 | 완료 기준 |
|---:|---|---|
| 1 | EAS 로그인 및 프로젝트 연결 | `eas whoami` 성공, 현재 앱이 올바른 Expo 프로젝트에 연결됨 |
| 2 | Android EAS development build | 원격 development build 성공 및 설치 가능한 artifact 확보 |
| 3 | iOS 기기 등록 및 EAS development build | iOS build 성공으로 Swift 모듈 compile 확인 |
| 4 | Android 실기기 센서 검증 | `near/far`, 거리 값, 감시 중지, 화면 이탈·background 정리가 정상 동작 |
| 5 | Android 권한·날씨 검증 | 권한 허용·거부·서비스 꺼짐, 날씨 성공·실패·재시도 UI 확인 |
| 6 | Android 저장소 검증 | 생성·목록·상세·삭제·재실행 후 데이터 유지 확인 |
| 7 | iPhone 실기기 검증 | `near/far`, `distance: null`, 화면 꺼짐 안내, 마지막 `near` 시각 확인 |
| 8 | 온도 설정 검증 | 섭씨/화씨 변경과 앱 재실행 후 hydration 확인 |
| 9 | 계획서 결과 갱신 | 실기기 및 EAS 결과를 검증 표에 기록 |
| 10 | 최신 소스 기반 학습서 확장·보완 | React Native 초보자가 실제 구현을 따라갈 수 있도록 소스 발췌·링크, React Native 문법, 사용 library의 문법·구조·데이터 흐름을 `learning-guide.md`에 보강 |
| 11 | `AGENTS.md Improver` 실행 | 최신 소스·설정·명령·문서를 근거로 품질 보고서와 구체적인 수정안을 먼저 작성하고, 상세 핵심 사항은 별도 `docs/architecture-internals.md`에 기록해 `AGENTS.md`에서 참조하도록 제안한 뒤 사용자 승인 후 갱신·검증 |
| 12 | GitHub Repo 생성·연결 및 최종 푸시 | 저장소 생성 조건을 사용자와 확정한 뒤 remote를 연결하고, 변경을 의미·기능·작업 단위로 나누어 검증하며 커밋한 후 최종 push와 원격 상태 확인 |

### 후속 작업 상세 기준

#### 최신 소스 기반 학습서 확장·보완

- 대상 독자는 React Native를 처음 개발하는 초보자로 명시합니다. 용어를 처음 사용할 때 뜻을 풀어 쓰고, 코드가 “무엇을 하는지”뿐 아니라 “왜 이 구조를 사용했는지”까지 설명합니다.
- EAS build와 Android/iPhone 실기기 검증을 마친 최신 소스를 기준으로 [learning-guide.md](./learning-guide.md)를 갱신합니다. 검증 전 예상 동작과 검증된 실제 동작을 혼동하지 않습니다.
- 각 주요 설명에는 해당 설명과 직접 연결되는 실제 소스의 상대 경로 링크와 필요한 최소 범위의 코드 발췌를 함께 제공합니다. 발췌 코드의 입력, 출력, 상태 변경, 호출자·소비자, platform 차이를 순서대로 해설하고 generated/build 산출물은 학습 대상으로 사용하지 않습니다.
- React Native와 TypeScript의 기본 문법·구조를 실제 사용처와 연결해 설명합니다. 최소 범위는 component와 JSX/TSX, props, state, `useEffect`, `useRef`, `useCallback`, cleanup, 비동기 처리, 조건부 렌더링, event handler, file-based routing, route parameter, type·interface·union·nullable 값, Android/iOS 분기입니다.
- 이 프로젝트에서 실제 사용한 Expo Router, Expo Location, Expo SQLite, TanStack Query, Axios, Zustand, React Hook Form, Zod, Expo Modules API, Jest, React Native Testing Library를 대상으로 핵심 API 문법과 역할, 서로 연결되는 구조, 이 프로젝트에서 해당 library가 필요한 이유를 설명합니다.
- 다음 end-to-end 흐름을 파일 단위 설명과 코드 발췌로 추적할 수 있게 구성합니다.
  - 앱 시작 → SQLite migration → Zustand hydration → 화면 렌더링
  - Android/iOS proximity native module → TypeScript 계약 → React hook → 현재 상태 UI
  - 위치 수집 → Open-Meteo 조회·Zod 검증 → `CaptureContext` 동결
  - React Hook Form 입력·검증 → SQLite 저장 → TanStack Query cache invalidation
  - 기록 목록 → 상세 조회 → 삭제 → 목록 갱신
  - 섭씨/화씨 설정 변경 → Zustand 영속화 → 앱 재실행 후 복원
  - 단위·hook·화면 테스트가 각각 어떤 회귀를 방지하는지
- 문법이나 library 동작 설명은 Expo SDK 54와 현재 설치된 library 버전에 맞는 공식 문서를 우선 근거로 삼습니다. 일반적인 설명과 이 프로젝트에만 해당하는 구현 결정을 구분합니다.
- 완료 시 모든 소스 링크의 존재 여부, 발췌 코드와 최신 원본의 일치 여부, 설명된 명령의 실행 가능 여부를 확인합니다. 초보자가 한 기능의 UI 진입부터 native/API/DB 처리와 테스트까지 독립적으로 추적할 수 있어야 완료로 간주합니다.

#### `AGENTS.md Improver` 실행

- 확장된 학습서까지 포함한 최신 저장소를 대상으로 `AGENTS.md`, package/build 설정, app config, scripts, source layout, native module, 테스트, 문서를 먼저 조사합니다.
- 조사 결과를 바탕으로 명령·workflow, architecture, Codex 작업 규칙, 프로젝트 고유 주의점, 최신성, 간결성·실행 가능성을 평가한 품질 보고서를 작성합니다.
- `AGENTS.md`에는 작업 명령, 검증 기준, 편집 제약, 핵심 진입점과 다른 문서를 읽어야 하는 조건처럼 짧고 직접 실행할 수 있는 프로젝트 지침만 유지합니다.
- 프로젝트 디렉터리 구조처럼 `AGENTS.md`에 모두 넣으면 지나치게 길어지는 필수·핵심 사항은 별도 `docs/architecture-internals.md`를 새로 만들어 기록합니다. 이 문서는 generated/build 산출물을 제외한 실제 디렉터리 구조, 앱 진입점과 Expo Router 화면 흐름, 모듈 책임과 의존 관계, Android/iOS native module 경계와 lifecycle, 위치·날씨·상태·검증·SQLite·query cache의 데이터 흐름, platform/config/permission 차이, 테스트 및 변경 시 주의할 경계를 최신 소스에 근거해 설명합니다.
- `AGENTS.md`에는 `docs/architecture-internals.md`의 정확한 상대 경로와 함께 구조·흐름·native 경계·data lifecycle에 영향을 주는 작업 전에 이 문서를 참조하라는 짧은 안내를 추가합니다. 상세 설명을 양쪽 문서에 중복하지 않습니다.
- 변경 대상 `AGENTS.md`와 `docs/architecture-internals.md`, 삽입 위치 또는 문서 구조, 실제 제안 문구나 diff, 변경 이유, 변경 후 검증 방법을 포함한 최소 수정안을 먼저 제시합니다.
- **사용자의 명시적 승인 전에는 `AGENTS.md`를 수정하거나 `docs/architecture-internals.md`를 생성하지 않습니다.** 승인 후에는 승인된 범위만 적용하고, 두 문서가 참조하는 source path·symbol·명령과 상호 링크를 가장 좁은 범위로 재검증합니다.

#### GitHub Repo 생성·연결, 작업별 커밋, 최종 푸시

- 외부 상태를 변경하기 전에 사용할 GitHub 계정 또는 organization, repository 이름, 공개 범위를 사용자와 확정합니다.
- 실제 Git 상태와 전체 변경 목록을 먼저 확인하고, secret·개인정보·로컬 환경 파일·build/generated 산출물이 포함되지 않도록 `.gitignore`와 커밋 대상을 검토합니다.
- GitHub repository를 생성하고 현재 로컬 repository에 올바른 remote를 연결합니다.
- 실제 변경 의존성을 기준으로 project/config·dependencies, native proximity module, data/API/state, 화면·사용자 흐름, tests, docs·`AGENTS.md`처럼 의미와 기능·작업이 응집된 단위로 커밋합니다. 서로 의존해 분리할 수 없는 변경은 억지로 나누지 않으며, 각 커밋 경계에서 가능한 가장 좁고 의미 있는 검증을 실행합니다.
- 최종 push 후 원격 branch와 commit 순서, 누락 파일, 민감 정보 포함 여부를 확인합니다. GitHub Actions, 배포 자동화, release 생성 등 계획에 없는 기능은 추가하지 않습니다.

전체 후속 진행 순서는 **EAS 로그인 → Android EAS build → Android 실기기 검증 → iOS EAS build → iPhone 검증 → 최신 소스 기반 학습서 확장·보완 → `AGENTS.md Improver` 실행 → GitHub Repo 생성 및 연결 → 의미·기능·작업별 커밋 → 최종 push**입니다. EAS 로그인과 실기기가 준비되면 추가 기능 구현 없이 검증 단계부터 이어가고, 검증 결과를 계획서에 반영한 뒤 문서·저장소 정리 단계로 넘어갑니다.
