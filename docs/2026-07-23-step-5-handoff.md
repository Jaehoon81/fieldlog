# FieldLog 5번 완료 Handoff

> 최신 후속 문서: [2026-07-23-step-6-handoff.md](./2026-07-23-step-6-handoff.md)
> 이 문서 본문은 5번 완료 당시 상태를 보존합니다. 계획서 최종 정합성 반영 결과와 이후 재개 지점은 최신 후속 문서를 따릅니다.

- 기준일·완료일: 2026-07-23
- 작업 경로: `D:\Development\ReactNative\Workspaces\my-sample-app`
- 최종 구현 범위: [implementation-plan.md](./implementation-plan.md)
- 이전 기준점: [2026-07-22-step-4-handoff.md](./2026-07-22-step-4-handoff.md)
- 검증 기기: 사용자의 iPhone 11
- 현재 결론: **1~5번 완료, iOS EAS development build 설치와 iPhone 실기기 기능 검증 완료, Android native `unavailable` 검증은 사용자 결정으로 스킵, 다음 작업은 계획서 결과 표 최종 정합성 점검**

이 문서는 4번에서 생성한 iOS development build를 iPhone 11에 설치해 실제 동작을 검증한 과정과 결과를 기록합니다. 기능 범위는 계속 `implementation-plan.md`가 기준입니다. 다만 계획서의 iOS build·실기기 상태와 Android native `unavailable` 요구사항은 아직 이번 결과 및 사용자의 최신 결정과 동기화되지 않았으므로, 다음 번호에서 결과 표와 관련 문구를 정합하게 갱신해야 합니다.

## 새 세션 시작 규칙

새 세션에서는 다음 순서로 시작합니다.

1. 저장소의 `AGENTS.md`를 읽습니다.
2. [implementation-plan.md](./implementation-plan.md)와 이 문서를 끝까지 읽습니다.
3. Git, EAS 계정·프로젝트·build, 연결 기기와 실행 환경을 다시 확인합니다. 이 문서의 외부 상태를 현재 상태로 그대로 가정하지 않습니다.
4. 5번을 반복하지 않고 6번인 계획서 결과 표 최종 정합성 점검의 목표, 구체적인 완료 기준, 사용자가 직접 할 작업, Codex가 자동으로 할 작업, 제외 범위를 먼저 설명합니다.
5. 사용자가 `6번 시작`이라고 명시하기 전에는 계획서나 다른 파일을 변경하지 않습니다.
6. 한 번에 한 번호만 진행하고 다음 번호를 자동으로 시작하지 않습니다.

새 세션에 전달할 권장 요청문은 다음과 같습니다.

```text
D:\Development\ReactNative\Workspaces\my-sample-app에서 AGENTS.md,
docs/implementation-plan.md, docs/2026-07-23-step-5-handoff.md를 끝까지 읽고
6번 목표·완료 기준·내가 할 작업·네가 할 작업·제외 범위를 먼저 설명해줘.
아직 시작하지 말고 내가 "6번 시작"이라고 할 때까지 기다려.
```

## 번호별 진행 상태

| 번호 | 작업 | 상태 | 확인 결과 |
|---:|---|---|---|
| 1 | EAS 로그인 및 프로젝트 연결 | 완료 | 개인 계정 `jungjh0519`, 프로젝트 `@jungjh0519/fieldlog`, project ID `f64a7e95-7255-4a34-a502-13d615271efa` 확인 |
| 2 | Android EAS development build | 완료 | build `f9f2f11a-d340-4c40-b64d-e087e105ee02`가 `FINISHED`; development client·internal distribution artifact 확보 및 독립 검사 완료 |
| 3 | Android 실기기 통합 검증과 발견된 UI 수정 | 완료 | `LM-V500N`에서 센서·lifecycle, 위치·날씨, SQLite, 온도 설정과 후속 회귀를 검증. 미지원 Android native `unavailable` 검증은 2026-07-23 사용자 결정으로 별도 스킵 |
| 4 | iOS 기기 등록 및 EAS development build | 완료 | build `5585528e-f84a-4da1-9796-bcdf774afe16`이 `FINISHED`; Swift local module compile·pod autolink, signing과 IPA 독립 검사 완료 |
| 5 | iPhone 실기기 통합 검증과 발견된 header 수정 | 완료 | iPhone 11에서 설치·기동, 센서·lifecycle, 위치·날씨, SQLite, 온도 설정 hydration과 iOS back title 수정까지 검증 |

## 5번 작업 계약

### 목표

4번에서 생성한 iOS development build를 등록된 iPhone 11에 설치하고 최신 Metro source를 실행해, build 검증만으로는 확인할 수 없었던 iOS runtime 기능을 실제 기기에서 검증합니다.

### 완료 기준

1. iPhone 11에 FieldLog를 설치하고 development client에서 최신 source를 기동합니다.
2. 근접 센서의 `far`와 `near` event를 확인하고 iOS 거리값 부재, 화면 꺼짐·복귀와 마지막 `near` 시각을 확인합니다.
3. 수동 중지, tab 이탈, background 진입 시 monitoring 정리와 필요한 foreground 재개를 확인합니다.
4. 위치 권한 거부·재요청 불가·설정 복원, 위치 서비스 꺼짐·복원, 날씨 성공·offline 실패·재시도를 확인합니다.
5. 전체 snapshot과 선택 데이터가 없는 최소 snapshot을 SQLite에 저장하고 목록·상세·최신순·삭제·재실행 영속화를 확인합니다.
6. 섭씨·화씨 전환과 앱 재실행 후 Zustand hydration을 확인합니다.
7. 발견된 문제를 범위 안에서 최소 수정한 경우 자동화와 iPhone에서 다시 검증합니다.
8. 실제 확인 결과와 남은 제한을 새 handoff에 기록합니다.

### 사용자가 직접 수행한 작업

- iPhone에서 build 설치와 FieldLog 실행
- iOS가 요구하는 기기 보안·개발 환경 확인
- 근접 센서 가림·해제, 홈 이동, tab 이동과 모니터링 버튼 조작
- 위치 권한 거부, 기기 설정에서 권한 허용, 위치 서비스 끄기·복원
- Wi-Fi·셀룰러 연결을 끊고 복원해 날씨 실패·재시도 조작
- 기록 form 입력, 목록·상세·삭제와 앱 강제 종료·재실행
- 온도 단위 변경과 재실행 결과 확인

비밀번호, 기기 암호, 인증 코드, token, UDID와 좌표는 채팅이나 문서에 기록하지 않았습니다.

### Codex가 수행한 작업

- 계획서·handoff·현재 source와 runtime 계약 재확인
- EAS 계정·프로젝트·iOS build·로컬 IPA와 Expo SDK 54 설치 절차 preflight
- 자동화 검사와 LAN Metro 실행
- 단계별 실기기 검증 시나리오, 기대 결과와 판정 경계 안내
- 발견된 iOS header back title 오류의 영향 범위 조사·최소 수정·회귀 검사
- 사용자 관찰 결과를 성공, 스킵, 미검증 제한으로 분리해 기록
- 완료 후 Metro 종료

### 5번에서 제외한 작업

- Android 재빌드·재검증
- 미지원 Android 실물 기기 또는 emulator의 native `unavailable` 검증
- 새 기능과 dependency 추가
- `implementation-plan.md` 결과 표 최종 정합성 갱신
- `learning-guide.md`, `AGENTS.md`, architecture 문서 변경
- Git commit, remote 연결, GitHub repository 생성과 push
- 6번 이후 작업 자동 진행

## 사전 점검

| 항목 | 확인 결과 |
|---|---|
| EAS 계정 | `jungjh0519` |
| EAS 프로젝트 | `@jungjh0519/fieldlog` |
| project ID | `f64a7e95-7255-4a34-a502-13d615271efa` |
| iOS build ID | `5585528e-f84a-4da1-9796-bcdf774afe16` |
| EAS 상태 | `FINISHED` 재확인 |
| profile / distribution | `development` / `internal` |
| SDK / 앱 버전 | Expo SDK `54.0.0`, `1.0.0 (1)` |
| bundle identifier | `com.jaehoon.fieldlog` |
| artifact 만료 예정 | 2026-08-06 14:44 KST |
| 로컬 IPA | `.expo\eas-builds\fieldlog-ios-development-5585528e.ipa` |
| IPA 크기 | `17,397,936 bytes` |
| IPA SHA-256 | `0F3F6F168782170467CB97BC7DD7BC2B7FF4F2BA30F6EBAEBDF0440BE486CD50` |
| 사전 자동화 | 9 suites / 33 tests, lint, typecheck, Expo Doctor 18/18, dependency 호환 검사 통과 |

## iPhone 11 실기기 검증 결과

아래 runtime 결과는 사용자가 iPhone 11 화면과 물리 동작을 직접 확인해 보고한 결과입니다. build log나 Jest 결과와 혼동하지 않습니다.

### 설치·기동과 근접 센서

| 검증 항목 | 결과 | 확인 내용 |
|---|---|---|
| 설치·기동 | 통과 | EAS internal distribution build 설치 후 development client가 LAN Metro의 최신 source를 열어 `현재 상태` 화면 표시 |
| 초기 availability | 통과 | 초기 확인 후 `대기 중` 표시 |
| iOS 사전 안내 | 통과 | 모니터링 시작 시 센서를 가리면 화면이 꺼질 수 있다는 안내와 `시작` 선택 표시 |
| `far` | 통과 | 센서를 가리지 않은 상태에서 `멀리 있음` 표시 |
| `near`와 화면 동작 | 통과 | iPhone 상단 센서를 가리면 화면이 꺼지고 해제하면 복귀 |
| 마지막 `near` 시각 | 통과 | 화면 복귀 후 `마지막 가까움 감지`가 최근 시각으로 갱신 |
| iOS 거리값 부재 | 통과 | 현재 화면의 iOS 안내와 저장 snapshot에서 거리·최대 범위가 `없음`; `distanceCm`·`maxRangeCm`의 `null` 계약 확인 |

화면이 꺼진 동안 `가까움` 문구를 직접 읽을 수는 없지만, 화면 꺼짐과 복귀 후 마지막 가까움 시각 갱신을 함께 확인해 `near` event 수신 근거로 사용했습니다.

### lifecycle과 monitoring 정리

| 검증 항목 | 결과 | 확인 내용 |
|---|---|---|
| background 정리 | 통과 | 모니터링 중 홈으로 이동한 상태에서 센서를 가려도 화면이 꺼지지 않음 |
| foreground 재개 | 통과 | FieldLog 복귀 후 센서를 다시 가리면 화면 꺼짐·복귀가 동작 |
| tab 이탈 정리 | 통과 | 모니터링 중 `기록` tab으로 이동한 상태에서 센서를 가려도 화면이 꺼지지 않음 |
| focus 복귀 | 통과 | `현재 상태` tab으로 돌아오면 `대기 중`으로 복귀 |
| 수동 중지 | 통과 | `모니터링 중지` 후 `대기 중`, 기록 만들기 비활성화와 안내 문구 표시, 센서를 가려도 화면 유지 |

### 위치 권한·서비스와 날씨

| 검증 항목 | 결과 | 확인 내용 |
|---|---|---|
| 최초 위치 권한 거부 | 통과 | `위치 권한을 다시 요청할 수 없습니다. 기기 설정에서 권한을 확인해 주세요.` 표시 |
| 재요청 불가 | 통과 | 두 번째 조회에서 시스템 권한 창이 다시 나타나지 않고 같은 설정 안내 유지 |
| 설정에서 권한 복원 | 통과 | iOS 설정에서 `앱을 사용하는 동안`으로 변경 후 위치와 날씨 조회 성공 |
| 위치 서비스 꺼짐 | 통과 | `기기의 위치 서비스가 꺼져 있습니다.`로 권한 문제와 구분 |
| 위치 서비스 복원 | 통과 | 다시 켠 뒤 위치와 날씨 조회 성공 |
| 날씨 정상 조회 | 통과 | 기온·체감온도와 실제 WMO weather code 표시. 이번 iPhone 조회의 `53`은 이전 Android 시점의 `2`와 달라도 오류가 아닌 시점·위치별 관측 결과 |
| offline 날씨 실패 | 통과 | Wi-Fi·셀룰러를 끈 상태에서도 위치 획득 성공, 날씨 실패 안내와 `날씨 다시 시도` 표시 |
| 위치 유지·날씨 재시도 | 통과 | online 복원 후 기존 위치가 유지된 상태로 날씨 재시도 성공 |

최초 거부 직후 설정 안내가 표시된 것은 iOS permission 응답의 `canAskAgain: false`에 대응하는 현재 구현과 일치합니다. 두 번째 조회에서는 기존 permission을 먼저 읽고 재요청 불가 상태이면 system prompt를 다시 호출하지 않습니다.

### SQLite 기록 흐름

| 검증 항목 | 결과 | 확인 내용 |
|---|---|---|
| 전체 snapshot | 통과 | `멀리 있음`, iOS 거리·최대 범위 없음, platform `ios`, 위치와 날씨가 포함된 snapshot 확인 |
| form validation | 통과 | 빈 제목 저장 시 `제목을 입력해 주세요.` 표시 |
| 첫 기록 저장 | 통과 | `iPhone 전체 기록`, 메모 `iOS 실기기 검증`, 환경 category 저장 후 목록·상세에서 확인 |
| 재실행 영속화 | 통과 | 앱 강제 종료·재실행 후 첫 기록 유지 |
| 최소 snapshot | 통과 | 재실행 후 위치·날씨를 조회하지 않고 `iPhone 최소 기록`, 빈 메모, 기타 category 저장. 위치·날씨 없음과 platform `ios` 확인 |
| 최신순 목록 | 통과 | 나중에 만든 최소 기록이 전체 기록보다 위에 표시 |
| 삭제 취소 | 통과 | 삭제 확인 창에서 취소 후 상세와 기록 유지 |
| 삭제 확정 | 통과 | 최소 기록 삭제 후 목록으로 이동하고 전체 기록만 유지 |
| 삭제 영속화 | 통과 | 앱 강제 종료·재실행 후 삭제한 최소 기록은 복원되지 않고 전체 기록만 유지 |

Windows에서 iPhone app sandbox의 SQLite 파일을 직접 꺼내 row 수나 `user_version`을 조회하지는 않았습니다. 이번 iOS SQLite 근거는 앱 UI의 생성·조회·삭제와 여러 차례의 강제 종료·재실행 결과입니다.

### 온도 단위와 hydration

| 검증 항목 | 결과 | 확인 내용 |
|---|---|---|
| 초기 섭씨 | 통과 | 설정과 저장 기록 상세에서 `°C` 표시 |
| 화씨 전환 | 통과 | 설정 변경 후 같은 저장 기록의 기온·체감온도가 `°F`로 변환 |
| 화씨 hydration | 통과 | 앱 강제 종료·재실행 후 화씨 선택과 상세 `°F` 유지 |
| 섭씨 복원 hydration | 통과 | 섭씨로 되돌린 뒤 다시 강제 종료·재실행해 섭씨 선택과 상세 `°C` 유지 |

최종 기기 상태는 섭씨 선택입니다.

## 검증 중 발견한 iOS header 표시 오류와 수정

### 현상

`새 기록`과 `기록 상세` 화면의 iOS 뒤로가기 chevron 오른쪽에 사용자용 제목이 아닌 Expo Router 내부 route group 이름 `(tabs)`가 표시됐습니다.

### 수정

- [app/observations/new.tsx](../app/observations/new.tsx): `headerBackTitle: "현재 상태"` 추가
- [app/observations/[id].tsx](../app/observations/[id].tsx): 모든 detail render 상태의 `Stack.Screen`에 `headerBackTitle: "기록"` 추가

Expo Router의 Stack이 사용하는 native-stack에서 `headerBackTitle`은 iOS용 옵션입니다. route 이동, 화면 제목, Android 뒤로가기 아이콘에는 변경을 주지 않습니다. Android 실기기 재검증은 이번 범위에서 수행하지 않았고, 설치된 `react-native-screens` 타입의 iOS 전용 계약과 자동화 검사로 영향 경계를 확인했습니다.

### 수정 검증

| 검증 항목 | 결과 |
|---|---|
| `새 기록` 뒤로가기 | `< 현재 상태` 실기기 확인 |
| `기록 상세` 뒤로가기 | `< 기록` 실기기 확인 |
| full Jest | 9 suites, 33 tests, snapshot 0개 통과 |
| lint | 통과, 경고·오류 없음 |
| typecheck | 통과 |
| Expo Doctor | 18/18 통과 |
| dependency 호환 | `npx expo install --check` 통과 |

순수 JS/TS header option 변경이므로 iOS EAS build를 다시 만들지 않고 기존 development client와 Metro로 검증했습니다.

## Android native `unavailable` 검증 스킵 결정

2026-07-23 사용자는 다음 이유로 미지원 Android 환경의 native `unavailable` 검증을 스킵하기로 결정했습니다.

- 근접 센서가 없는 Android 실물 기기를 보유하지 않음
- emulator 검증을 선호하지 않음
- 이 샘플에서 해당 경로의 검증 중요도가 낮다고 판단함

따라서 이 항목은 성공으로 기록하지 않고 **사용자 결정에 따른 스킵**으로 기록합니다. 향후 FieldLog 번호별 작업의 완료 차단 요인이나 필수 후속 순서로 취급하지 않으며, 기기 구입·대여나 emulator 구성으로 범위를 확대하지 않습니다.

## 변경 사항과 보존 artifact

### source 변경

- `app/observations/new.tsx`
- `app/observations/[id].tsx`

변경 내용은 iOS header back title 문자열뿐이며 package, app config, build config, native module과 database schema에는 변경이 없습니다.

### 문서 변경

- 이 `docs/2026-07-23-step-5-handoff.md`를 새로 작성했습니다.
- 이전 [2026-07-22-step-4-handoff.md](./2026-07-22-step-4-handoff.md) 상단에 최신 후속 문서 링크만 추가하고 4번 당시 본문은 보존했습니다.
- `implementation-plan.md` 결과 표와 완료 요약은 5번 제외 범위에 따라 아직 변경하지 않았습니다.

### artifact와 임시 상태

- 최종 iOS IPA는 ignored `.expo/eas-builds/` 아래에 보존했습니다.
- 실기기 좌표, UDID, 인증 정보와 device screenshot은 저장하지 않았습니다.
- 검증에 사용한 Metro는 완료 후 종료했습니다.
- Git commit, remote 연결과 push는 수행하지 않았습니다.

## 남은 제한

- iPhone 11의 iOS version은 별도로 수집하지 않았습니다.
- Windows에서 iPhone device console의 native crash log나 app sandbox SQLite를 직접 검사하지 않았습니다.
- 이번 runtime 판정은 사용자의 실기기 관찰 결과이며 별도 XCTest나 E2E framework 결과가 아닙니다.
- 검증 과정에서 보고된 crash·freeze는 없었지만, 이를 iOS device diagnostic log 검증으로 확대하지 않습니다.
- iOS header 수정 후 Android 실기기 runtime을 다시 실행하지 않았습니다. 옵션의 iOS 전용 계약과 자동화 검사로 영향 범위를 확인했습니다.
- `implementation-plan.md`의 iOS build·실기기 행, 완료 요약과 Android `unavailable` 문구는 아직 최신 상태가 아닙니다.

## 다음 전체 순서

5번 이후에도 한 번에 하나씩만 진행합니다.

1. 5번: iPhone 실기기 통합 검증 — 완료
2. 6번: iOS build·실기기 결과와 Android `unavailable` 스킵 결정을 포함한 `implementation-plan.md` 결과 표·완료 요약 최종 정합성 점검
3. 최신 source 기반 `learning-guide.md` 확장
4. `AGENTS.md Improver` 조사와 수정안 제시, 사용자 승인 후 반영
5. GitHub repository 조건 확정·생성·연결
6. 의미·기능·작업별 commit과 최종 push
