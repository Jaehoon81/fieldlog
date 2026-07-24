# FieldLog 4번 재개 Handoff

> 최신 후속 문서: [2026-07-23-step-5-handoff.md](./2026-07-23-step-5-handoff.md)
> 이 문서 본문은 4번 완료 당시 상태를 보존합니다. iPhone 실기기 검증과 이후 재개 지점은 최신 후속 문서를 따릅니다.

- 기준일: 2026-07-22
- 4번 완료일: 2026-07-23
- 작업 경로: `D:\Development\ReactNative\Workspaces\my-sample-app`
- 최종 구현 범위: [implementation-plan.md](./implementation-plan.md)
- 이전 기준점: [2026-07-20-implementation-handoff.md](./2026-07-20-implementation-handoff.md)
- 현재 결론: **1~4번 완료(3번은 native `unavailable` 미검증 제한 있음), iOS EAS development build와 Swift local module compile·autolink 검증 완료, 다음 작업은 iPhone 실기기 검증**

이 문서는 2026-07-20 handoff 이후 달라진 **진행 상태와 다음 재개 지점**을 기록합니다. 기능 범위는 계속 `implementation-plan.md`가 기준이며, 기존 handoff와 계획서의 2026-07-20 검증 표는 당시 기록으로 보존합니다. 1~3번의 EAS·Android 실기기·후속 회귀 결과는 계획서에 2026-07-22 행으로 추가했고, 4번 iOS EAS build 결과는 이 문서에 2026-07-23 기록으로 추가했습니다. 계획서 결과 표 갱신은 4번 제외 범위에 따라 수행하지 않았습니다.

## 새 세션 시작 규칙

> 아래 규칙과 권장 요청문은 4번을 시작하기 전의 재개 계약으로 보존합니다. 4번은 2026-07-23에 완료했으며, 이후 세션에서는 이 문서의 `4번 결과`와 남은 제한을 확인한 뒤 iPhone 실기기 검증의 별도 작업 계약부터 정합니다.

새 세션에서는 다음 순서로 시작합니다.

1. 저장소의 `AGENTS.md`를 읽습니다.
2. [implementation-plan.md](./implementation-plan.md)와 이 문서를 끝까지 읽습니다.
3. Git, EAS 계정·프로젝트, build, 연결 기기와 실행 환경을 다시 확인합니다. 이 문서의 외부 상태를 그대로 가정하지 않습니다.
4. 4번의 목표, 구체적인 완료 기준, 사용자가 직접 할 작업, Codex가 자동으로 할 작업, 제외 범위를 먼저 설명합니다.
5. 사용자가 `4번 시작`이라고 명시하기 전에는 build, credential, device 등록이나 파일 변경을 시작하지 않습니다.
6. 4번 완료 시에는 결과와 증거, 변경 사항, artifact, 남은 제한만 보고하고 다음 번호로 넘어가지 않습니다.

새 세션에 전달할 권장 요청문은 다음과 같습니다.

```text
D:\Development\ReactNative\Workspaces\my-sample-app에서 AGENTS.md,
docs/implementation-plan.md, docs/2026-07-22-step-4-handoff.md를 끝까지 읽고
4번 목표·완료 기준·내가 할 작업·네가 할 작업·제외 범위를 먼저 설명해줘.
아직 시작하지 말고 내가 "4번 시작"이라고 할 때까지 기다려.
```

## 번호별 진행 상태

| 번호 | 작업 | 상태 | 확인 결과 |
|---:|---|---|---|
| 1 | EAS 로그인 및 프로젝트 연결 | 완료 | 개인 계정 `jungjh0519`, 프로젝트 `@jungjh0519/fieldlog`, project ID `f64a7e95-7255-4a34-a502-13d615271efa` 확인 |
| 2 | Android EAS development build | 완료 | build `f9f2f11a-d340-4c40-b64d-e087e105ee02`가 `FINISHED`; development client·internal distribution artifact 확보 및 독립 검사 완료 |
| 3 | Android 실기기 통합 검증과 발견된 UI 수정 | 완료(제한 있음) | 센서·lifecycle, 위치 권한·서비스, 날씨 네트워크 실패·복구, SQLite 생성·상세·삭제·재실행, 온도 설정 hydration과 후속 UI·hook 회귀 수정까지 검증. 미지원 기기 또는 emulator의 native `unavailable` 상태는 미검증 |
| 4 | iOS 기기 등록 및 EAS development build | 완료 | build `5585528e-f84a-4da1-9796-bcdf774afe16`이 `FINISHED`; Swift `ProximitySensorModule.swift` compile·pod autolink, bundle identifier와 설치 가능한 IPA 독립 검사 완료 |

## 1번 결과: EAS 계정과 프로젝트

2026-07-22에 다시 조회한 현재 외부 상태는 다음과 같습니다.

| 항목 | 확인값 |
|---|---|
| `eas whoami` | `jungjh0519` |
| 계정 역할 | `jungjh0519` owner |
| 프로젝트 | `@jungjh0519/fieldlog` |
| project ID | `f64a7e95-7255-4a34-a502-13d615271efa` |
| 앱 owner | `app.json`의 `jungjh0519` |
| Android package | `com.jaehoon.fieldlog` |
| iOS bundle identifier | `com.jaehoon.fieldlog` |

EAS 로그인은 유지되어 있지만 새 세션의 4번 preflight에서 `whoami`와 project ID를 다시 확인합니다.

연결 과정에서 `app.json`에 `owner`와 `extra.eas.projectId`를 추가했습니다. EAS CLI가 중복된 `android.permissions` 항목과 빈 `extra.router`를 정리한 뒤 `npx expo-doctor@latest` 18/18 및 `npx expo install --check`를 통과했습니다.

## 2번 결과: Android EAS development build

| 항목 | 확인값 |
|---|---|
| EAS build ID | `f9f2f11a-d340-4c40-b64d-e087e105ee02` |
| 결과 | `FINISHED` |
| profile / distribution | `development` / `internal` |
| SDK / 앱 버전 | Expo SDK `54.0.0`, `1.0.0 (1)` |
| 완료 시각 | 2026-07-22 12:56 KST |
| EAS fingerprint | `b1ed3d47ab0b3421a33b8e9908af8b03638a5a2b` |
| 원격 artifact | internal distribution APK. EAS dashboard에서 위 build ID로 조회하며 직접 다운로드 URL은 공개 문서에서 생략 |
| 로컬 artifact | `.expo\eas-builds\fieldlog-android-development-f9f2f11a.apk` |
| 로컬 APK 크기 | `169,182,934 bytes` |
| 로컬 APK SHA-256 | `13C126731ED80D48ED05B16A732BE4E4696A97D49A4C5CBFE301DB30A23E5DCF` |
| 원격 artifact 만료 예정 | 2026-08-05 |

최초 build inspect archive는 212 files였으며, 이 중 133개는 local Gradle build 산출물이었습니다. `.gitignore`에 `/modules/proximity-sensor/android/build/`를 추가한 뒤 최종 build 입력을 79 files / 1,282,785 bytes로 줄였고, 민감한 이름의 파일이 포함되지 않았음을 확인했습니다.

APK에 대해 v2 서명, package·version, min SDK 24·target SDK 36, development launcher manifest와 Android `ProximitySensor` native module DEX 포함 여부를 독립적으로 확인했습니다. 로컬 artifact는 `.expo/` 아래의 ignored 검증 산출물이며 Git에 포함하지 않습니다.

## 3번 결과: Android 실기기 검증

검증 기기는 `LM-V500N`, Android 12, API 31입니다. EAS development APK `com.jaehoon.fieldlog` `1.0.0 (1)`을 사용했습니다.

### 실기기에서 확인한 항목

| 영역 | 상태 | 확인 결과 |
|---|---|---|
| 설치·기동 | 통과 | EAS development APK 설치와 cold start, development client의 Metro source 연결을 확인 |
| 근접 센서 | 통과 | 모니터링 시작, 센서 가림·해제에 따른 `near/far`, Android 거리·최대 범위, 마지막 가까움 시각 확인 |
| 센서 중지·lifecycle | 통과 | 모니터링 중지 후 `idle` 복귀와 기록 만들기 비활성화를 확인. 화면 이탈 시 listener 3→2, background 진입 시 3→2, foreground 복귀 시 2→3, 최종 중지 cleanup을 확인 |
| 위치 권한 | 통과 | 최초 거부, 허용, 운영체제 설정에서 차단, 재요청 거부, 권한 복원 흐름 확인 |
| 위치 서비스 | 통과 | 기기 위치 서비스가 꺼진 상태를 권한 거부와 구분해 표시하는지 확인 |
| 날씨 네트워크 | 통과 | 첫 번째 offline 시도는 위치 획득 단계에서 실패해 날씨 실패 근거로 채택하지 않음. online 기준 상태를 복원한 뒤 두 번째 offline 시도에서 위치를 유지한 채 날씨만 실패하고 재시도 버튼이 나타나는지 확인했으며, 최종 복구·재시도도 성공 |
| 기록 validation·저장 | 통과 | 빈 제목 차단, 위치·날씨와 센서 snapshot을 포함한 첫 번째 기록, 위치·날씨 조회 없이 만든 두 번째 최소 기록, 최신순 목록·상세·빈 메모와 삭제 확인 창을 확인 |
| SQLite·재실행 영속화 | 통과 | DB 직접 조회로 `user_version=1`, 두 기록 생성 후 rows 2, 두 번째 기록 삭제 후 rows 1을 확인. 앱 재실행 후 첫 번째 기록이 남아 있음을 확인 |
| 선택 데이터 부재 | 통과(범위 한정) | 위치·날씨 조회를 하지 않은 상태에서 두 번째 기록을 생성해 선택 데이터가 없어도 저장됨을 확인. 날씨 실패 직후 센서 상태가 확정된 상태로 기록 생성까지 이어가는 별도 시나리오는 수행하지 않았으므로 그 결과로 확대하지 않음 |
| 온도 단위·hydration | 통과 | 초기 섭씨 선택, 화씨 전환과 기록 상세의 `°F` 표시, 강제 종료·재실행 후 화씨 선택 복원을 확인. 이후 섭씨로 되돌려 다시 강제 종료·재실행한 뒤 섭씨 선택 복원 확인 |
| 안정성 | 통과 | 검증 후 exit history와 logcat에서 crash·ANR이 없음을 확인 |
| native `unavailable` | 미검증 | `LM-V500N`은 근접 센서 지원 기기이고 사용할 수 있는 AVD가 없어 미지원 기기 또는 emulator의 native `unavailable` 경로는 확인하지 못함. Jest mock 기반 UI·hook 검증과 구분 |

### 실기기 검증 중 발견해 수정한 항목

| 발견 사항 | 수정 내용 | 검증 |
|---|---|---|
| 상단에 route group 이름 `(tabs)` 노출 | [app/_layout.tsx](../app/_layout.tsx)에서 `(tabs)` root header 숨김 | 실기기에서 `(tabs)` 미노출, 탭 및 기록 상세 header 유지 확인 |
| Fast Refresh 후 센서 상태가 `확인 중`에 고착 | [use-proximity.ts](../src/hooks/use-proximity.ts)의 effect 재시작 시 `mountedRef` 복원 | cold restart와 Fast Refresh 후 `대기 중`, 시작→event→중지 확인 |
| 기록 만들기 안내가 실제 활성 조건과 불일치 | [현재 상태 화면](<../app/(tabs)/index.tsx>)에서 `idle`, `pending`, 위치·날씨 요청 중 문구 분리 | 실기기와 화면 테스트에서 상태별 노출 확인 |

위 Android EAS APK의 build 입력은 다음 후속 변경보다 앞선 상태입니다.

- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `src/hooks/use-proximity.ts`
- `app-tests/current-status-screen.test.tsx`
- `src/hooks/use-proximity.test.tsx`

후속 변경은 native module이나 app config를 바꾸지 않은 JS/TS 및 test 수정이므로 Android native rebuild 없이 설치된 development client와 Metro의 최신 source로 실기기 검증했습니다. 따라서 위 EAS APK artifact 자체가 이 후속 source를 포함한다고 주장하지 않으며, standalone build 입력과 Metro 회귀 검증을 구분합니다.

현재 기록 만들기 버튼의 의도된 규칙은 다음과 같습니다.

- 센서 상태가 `near`, `far`, `unavailable` 중 하나로 확정돼야 합니다.
- 위치·날씨 데이터 자체는 선택 사항입니다.
- 위치·날씨 요청이 진행 중일 때만 일시적으로 비활성화됩니다.
- 모니터링 중지 후 `idle`에서는 센서 snapshot이 없으므로 비활성화됩니다.

상태별 안내 문구는 다음과 같습니다.

- `idle`: `모니터링을 시작해 센서 상태를 확인해 주세요.`
- `pending`: `센서 상태를 확인하고 있습니다.`
- 위치·날씨 요청 중: 첫 줄 `위치·날씨 요청이 끝나면`, 다음 줄 `기록할 수 있습니다.`

### 최종 자동화 검증

UI와 hook 수정 후 다음 결과를 다시 확인했습니다.

| 검증 | 결과 |
|---|---|
| 기본 Jest (`npm test -- --runInBand`) | **9 suites, 33 tests 통과**. `package.json`에서 `.expo/`의 EAS inspect source 복제본을 module path와 test path 모두 제외 |
| `npm run lint` | 통과, 경고·오류 없음 |
| `npm run typecheck` | 통과 |
| 근접 센서 회귀 테스트 | effect cleanup→setup 재실행 후 `pending` 고착 방지 확인 |
| 현재 상태 화면 테스트 | `idle`, `pending`, `near`, `far`, `unavailable` 및 위치·날씨 요청 중 문구·버튼 상태 확인 |

정리 전 기본 Jest가 18 suites/63 tests를 실행한 것은 현재 9 suites/33 tests와 `.expo/eas-inspect/android-development`에 남은 이전 복제본 9 suites/30 tests를 함께 수집했기 때문입니다. 명시적으로 `.expo/`를 제외한 실행에서 현재 source의 9 suites/33 tests를 먼저 확인했고, 이후 위 ignore 설정을 기본값으로 반영했습니다.

## 현재 저장소와 실행 환경

2026-07-22 종료 시점의 상태입니다.

| 항목 | 현재 상태 |
|---|---|
| Git | `master`, 아직 commit 없음. 초기 reset 변경과 FieldLog 구현이 staged·modified·untracked 상태로 함께 존재 |
| Git 작업 원칙 | reset, commit, remote 연결, push를 지금 수행하지 않음. 기존 사용자 변경을 그대로 보존 |
| Android 검증 기기 | 3번 검증에는 `LM-V500N`을 사용함. 이후 USB 연결 기기 변화는 4번 iOS build의 입력이나 결과가 아니므로 현재 상태로 기록하지 않음 |
| 검증 기기 설치 앱 | 3번 종료 시 `com.jaehoon.fieldlog` `1.0.0 (1)`이 user 0에 설치된 상태였음 |
| 검증 기기 앱 프로세스 | 3번 종료 시 package 상태 `stopped=true`였음 |
| 검증 기기 앱 데이터 | clear 또는 uninstall 명령을 실행하지 않음. 검증 중 남긴 기록과 설정을 의도적으로 삭제하지 않음 |
| Metro / Expo | 종료됨 |
| ADB reverse | `tcp:8081` 제거됨 |
| 포트 8081 | Metro listener 없음 |
| EAS | `jungjh0519` 로그인 유지, Android와 iOS development build 및 artifact 유지 |
| 임시 산출물 | Android·iOS EAS inspect source 복제본, build 검사 log, `.expo/device-validation`, 추출 DEX, Metro runtime log와 검증 스크린샷은 삭제. SHA-256으로 재확인한 Android EAS APK와 iOS EAS IPA만 `.expo/eas-builds/`에 보존 |

새 세션은 4번을 반복하지 않고 iPhone 실기기 검증의 목표·완료 기준·사용자 작업·Codex 작업·제외 범위를 먼저 정하면 됩니다. 앱 설치와 실행은 아직 수행하지 않았으며 Metro도 종료 상태로 유지합니다.

## 아직 완료로 간주하지 않는 항목

- iPhone 설치·실기기 근접 센서 동작
- iOS의 `distanceCm: null`, 화면 꺼짐 안내와 마지막 `near` 시각
- 미지원 Android 기기 또는 emulator의 native `unavailable` 상태
- iOS 실기기 검증 후 `implementation-plan.md` 결과 표의 최종 정합성 점검
- 최신 소스 기반 `learning-guide.md` 확장
- `AGENTS.md Improver` 조사·제안·승인 후 반영
- GitHub repository 생성·연결, 작업 단위 commit과 최종 push

## GitHub 공개 문서와 민감 정보 경계

다음 값은 인증 수단이 아니라 프로젝트 식별 또는 artifact 무결성 확인용 metadata이므로 공개 문서에 유지합니다.

- Expo owner와 project slug·project ID
- EAS build ID와 fingerprint
- Android package와 iOS bundle identifier
- 로컬 Android APK와 iOS IPA 크기 및 SHA-256

owner는 Expo 계정과 이 저장소의 관계를 공개하는 식별 정보이므로 익명성 요구가 있다면 별도 판단이 필요합니다. 다만 `owner`와 project ID는 `app.json`에도 포함되는 프로젝트 설정이므로 문서에서만 가리는 것으로 프로젝트를 익명화할 수는 없습니다.

internal distribution artifact의 직접 다운로드 URL은 URL을 아는 사람이 접근할 수 있는 공유 링크이므로 이 공개용 문서에서 제거했습니다. build ID와 만료 예정일은 남겨 EAS dashboard에서 소유자가 다시 찾을 수 있게 했습니다.

판단 근거는 Expo의 [app configuration 안내](https://docs.expo.dev/workflow/configuration/), [EAS build 환경 metadata 안내](https://docs.expo.dev/eas/environment-variables/usage/), [internal distribution 안내](https://docs.expo.dev/build/internal-distribution/)입니다. Expo는 app config의 대부분이 runtime에서 접근 가능하므로 민감값을 넣지 말라고 안내하며, internal distribution URL은 기본적으로 그 URL을 아는 사람이 접근할 수 있다고 설명합니다.

다음 값과 파일은 Git에 올리지 않습니다.

- Expo·Apple access token, 인증 코드, EAS secret 값
- Android keystore, Apple certificate·provisioning private key와 각 password
- 실기기 serial·UDID, 실제 위치 좌표, 검증 DB·log·스크린샷
- `.expo/` 아래 build archive, APK와 기타 임시 산출물

## 4번 작업 정의

### 목표

iOS development build를 EAS에서 성공시켜 Windows에서 직접 확인할 수 없던 Swift local Expo Module의 compile과 autolink를 검증하고, 등록된 iPhone에 설치할 수 있는 artifact를 확보합니다.

### 완료 기준

- 현재 EAS 계정과 `@jungjh0519/fieldlog` 연결을 재확인합니다.
- iOS development/internal distribution에 필요한 Apple Developer 계정과 device 등록 상태를 확인합니다.
- EAS iOS development build가 `FINISHED`여야 합니다.
- build log에서 Swift `ProximitySensor` module compile과 Expo autolink 성공을 확인합니다.
- iOS bundle identifier가 `com.jaehoon.fieldlog`인지 확인합니다.
- build ID, artifact, profile, 앱 버전과 남은 제한사항을 기록합니다.

### 사용자가 직접 처리할 수 있는 작업

- Apple 계정 인증이나 device 등록처럼 interactive prompt가 필요한 단계
- Apple Developer 약관·인증 코드·credential 선택에 대한 본인 확인
- 필요 시 iPhone에서 device 등록용 profile 또는 안내 페이지 승인

비밀번호, 인증 코드, token, 인증서 private key나 provisioning secret은 채팅에 붙여 넣지 않습니다. 4번 시작 후 Codex가 화면에 나타날 수 있는 선택지와 안전한 응답을 단계별로 먼저 안내합니다.

### Codex가 처리할 작업

- 저장소, EAS 계정·프로젝트, iOS config와 `development` profile preflight
- iOS local module·autolink·권한 범위와 build 입력 archive 점검
- 사용자가 실행해야 하는 interactive 명령과 응답 안내
- 원격 build 상태 모니터링
- build log, artifact, bundle identifier와 Swift compile 결과 독립 검증
- 완료 결과와 iPhone 실기기에서 아직 확인하지 않은 항목 분리 보고

### 4번에서 제외할 작업

- iPhone 센서·화면 꺼짐·위치·저장소 기능 검증
- Android 재빌드 또는 추가 기능 구현
- 계획서 결과 표와 학습서 갱신
- `AGENTS.md` 또는 architecture 문서 변경
- Git commit, remote 연결, GitHub repository 생성, push
- 5번 이후 작업 자동 진행

## 4번 결과: iOS EAS development build

2026-07-23에 실제 계정·프로젝트·build 입력을 다시 확인하고 사용자 interactive Apple 인증과 device 선택 후 iOS build를 제출했습니다.

### 결과와 artifact

| 항목 | 확인값 |
|---|---|
| EAS 계정·프로젝트 | 개인 계정 `jungjh0519`, `@jungjh0519/fieldlog`, project ID `f64a7e95-7255-4a34-a502-13d615271efa` 재확인 |
| EAS build ID | `5585528e-f84a-4da1-9796-bcdf774afe16` |
| 결과 | `FINISHED` |
| profile / distribution | `development` / `internal` |
| SDK / 앱 버전 | Expo SDK `54.0.0`, `1.0.0 (1)` |
| bundle identifier | `com.jaehoon.fieldlog` |
| EAS fingerprint | `4a424a46e487dfc836ce736790d6288a0a3c01c1` |
| 생성·완료 시각 | 2026-07-23 14:44 KST / 14:48 KST |
| 원격 artifact | internal distribution IPA. EAS dashboard에서 위 build ID로 조회하며 직접 다운로드 URL은 공개 문서에서 생략 |
| 원격 artifact 만료 예정 | 2026-08-06 14:44 KST |
| 로컬 artifact | `.expo\eas-builds\fieldlog-ios-development-5585528e.ipa` |
| 로컬 IPA 크기 | `17,397,936 bytes` |
| 로컬 IPA SHA-256 | `0F3F6F168782170467CB97BC7DD7BC2B7FF4F2BA30F6EBAEBDF0440BE486CD50` |

### build 입력과 native 통합 검증

- Expo Doctor 18/18과 `npx expo install --check`를 통과했고 resolved config에서 Android/iOS 전용 범위, `newArchEnabled: true`, `com.jaehoon.fieldlog`을 재확인했습니다.
- EAS archive stage는 80 files / 1,310,928 bytes였습니다. `ProximitySensorModule.swift`, podspec과 `expo-module.config.json`이 원본과 같은 SHA-256으로 포함됐고 credential·private key 후보, `node_modules`, generated `ios/`, local Gradle build file은 포함되지 않았습니다.
- Expo autolinking resolve 결과에 `proximity-sensor`, pod `ProximitySensor`, Swift module `ProximitySensor`, module class `ProximitySensorModule`이 포함됐습니다.
- EAS log에서 `Installing ProximitySensor (1.0.0)`, `ProximitySensor` pod dependency, `SwiftCompile normal arm64 ... ProximitySensorModule.swift`, `libProximitySensor.a` packaging과 `** ARCHIVE SUCCEEDED **`를 확인했습니다.
- IPA ZIP 무결성 검사를 통과했고 `Payload/FieldLog.app/Info.plist`에서 bundle identifier `com.jaehoon.fieldlog`, 앱 버전 `1.0.0 (1)`, minimum iOS `15.1`, `ITSAppUsesNonExemptEncryption=false`를 확인했습니다.
- 실행 파일에서 `ProximitySensor`, `ProximitySensorModule`, `onProximityChange`와 development client marker를 확인했습니다.
- Apple Developer Portal에 이미 있던 iPhone 4대가 EAS device 목록으로 import됐지만, ad hoc provisioning profile에는 사용자가 build에서 선택한 iPhone 11 한 대만 포함됐습니다. UDID는 출력하거나 문서에 기록하지 않았습니다.

### 변경 사항

- source, app config, build config, package와 Git에는 변경이 없습니다.
- 외부 상태로는 Apple Developer Portal의 기존 device 4대를 EAS device 목록에 import했고, iPhone 11 한 대를 포함한 `com.jaehoon.fieldlog` ad hoc provisioning profile과 iOS EAS build를 생성했습니다.
- 이 문서에 4번 결과만 추가했습니다. 계획서 결과 표, 학습서, `AGENTS.md`, architecture 문서는 변경하지 않았습니다.
- EAS inspect 복제본과 build 검사 log는 검증 후 삭제하고 최종 IPA만 ignored `.expo/eas-builds/`에 보존했습니다.

### 남은 제한

- IPA가 iPhone 11에 실제로 설치·기동되는지는 아직 확인하지 않았습니다.
- iOS 근접 센서의 `near/far`, `distanceCm: null`, 화면 꺼짐 안내와 마지막 `near` 시각, foreground/background cleanup은 아직 실기기 미검증입니다.
- iOS 위치 권한·서비스, 날씨 실패·복구, SQLite 생성·상세·삭제·재실행, 온도 단위 hydration도 아직 실기기 미검증입니다.
- 이번 결과는 iOS build, Swift compile, autolink, signing과 artifact 구조의 검증 근거이며 iPhone runtime 기능 성공 근거로 확대하지 않습니다.

## 다음 전체 순서

4번 이후에도 한 번에 하나씩만 진행합니다.

1. 4번: iOS 기기 등록 및 EAS development build — 완료
2. 다음 작업: iPhone 실기기 검증
3. 가능한 미지원 Android 기기 또는 emulator에서 native `unavailable` 상태 검증
4. iOS 실기기와 남은 `unavailable` 결과를 포함한 계획서 결과 표 최종 정합성 점검
5. 최신 소스 기반 `learning-guide.md` 확장
6. `AGENTS.md Improver` 조사와 수정안 제시, 사용자 승인 후 반영
7. GitHub repository 조건 확정·생성·연결
8. 의미·기능·작업별 commit과 최종 push
