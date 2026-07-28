# FieldLog

FieldLog는 Android와 iPhone에서 근접 센서, 현재 위치와 날씨 snapshot을 확인하고 SQLite에 기록하는 개인 학습용 Expo SDK 54 샘플 앱이다.

## 주요 기능

- 근접 센서 상태와 마지막 가까움 시각 표시
- foreground 위치 권한을 사용한 현재 위치 조회
- 현재 위치를 기준으로 한 날씨 조회
- 근접·위치·날씨 snapshot과 제목·메모·분류 저장
- SQLite 기록 목록·상세·삭제와 app 재실행 후 영속성
- 섭씨·화씨 설정 저장
- Android·iOS local `ProximitySensor` Expo Module

구현 범위, 제외 항목과 검증 결과는 [구현 계획](./docs/implementation-plan.md)을 기준으로 판단한다.

## 실행 전제

- Node.js와 npm이 필요하다.
- 이 앱은 local native module을 사용하므로 **Expo Go에서 실행할 수 없다**.
- 호환되는 development build를 Android 또는 iPhone에 먼저 설치해야 한다.
- web은 구현·검증 대상이 아니다.
- Windows에서 iOS native build를 직접 만들 수 없으므로 iPhone용 development build는 EAS Build를 사용한다.

Expo API나 설정을 변경하기 전에는 [Expo SDK 54 버전 문서](https://docs.expo.dev/versions/v54.0.0/)를 확인한다.

## 설치와 실행

dependency를 설치한다.

```powershell
npm install
```

설치된 development client가 불러올 Metro를 시작한다.

```powershell
npx expo start --dev-client
```

Android local development build가 필요하고 native 검증이 현재 작업 범위에 포함돼 있다면 다음 명령을 사용한다.

```powershell
npm run android
```

macOS에서 iOS local development build가 필요한 경우 `npm run ios`를 사용할 수 있다. EAS build, account login, credential과 device 등록은 사용자와 순서대로 진행하는 interactive 작업이며 자동으로 실행하지 않는다. EAS 설정은 [`eas.json`](./eas.json)의 `development` profile을 사용한다.

native code, dependency, Expo plugin 또는 `app.json`을 변경했다면 development build를 다시 만들어야 한다. JS/TS만 변경했다면 설치된 development client와 Metro로 확인할 수 있다.

## 검사 명령

```powershell
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor@latest
npx expo install --check
npx expo config --type public
```

Jest는 local `ProximitySensor` module을 mock한다. 따라서 test 통과는 JavaScript 동작의 근거이며 Kotlin·Swift compile이나 실물 sensor 동작의 근거가 아니다. 자동화 test, native build, artifact 검사와 실기기 검증 결과는 구분해서 판단한다.

## 주요 경로

| 경로 | 내용 |
| --- | --- |
| [`app/`](./app) | Expo Router layout과 screen |
| [`src/`](./src) | API, database, query cache 정책, store, hook, schema, type과 공용 component |
| [`modules/proximity-sensor/`](./modules/proximity-sensor) | TypeScript bridge와 Android·iOS native source |
| [`app-tests/`](./app-tests) | screen test |
| [`docs/`](./docs) | 구현 계획, handoff, 내부 구조와 학습서 |

root `/android`, root `/ios`, `.expo/`와 `modules/proximity-sensor/android/build/`는 generated 또는 ignored output이다. 직접 관리하는 native source는 `modules/proximity-sensor/android/`와 `modules/proximity-sensor/ios/`다.

## 문서

- [구현 계획](./docs/implementation-plan.md): authoritative 범위, 완료 기준, 제외 범위와 검증 기록
- [내부 구조와 동작](./docs/architecture-internals.md): 시작, routing, data, persistence와 native lifecycle
- [학습서](./docs/learning-guide.md): 실제 source를 바탕으로 한 단계별 학습 자료
- [대화형 학습 진행표](./docs/2026-07-23-step-7-learning-progress.md): 단원별 현재 위치, source 확인 결론과 보완 기록
- [소스 주석 읽기 안내서](./docs/source-commentary-guide.md): source 주석 표식과 파일 간 `FLOW` 읽기 순서
- [`docs/`의 날짜별 handoff](./docs): 번호별 작업 과정, 결과, 제한과 다음 작업
