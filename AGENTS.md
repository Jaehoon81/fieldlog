# FieldLog 저장소 작업 지침

코드를 작성하기 전에 https://docs.expo.dev/versions/v54.0.0/ 에서 정확한 Expo SDK 54 버전 문서를 읽습니다.

## 기준 문서

- 범위, 완료 기준, 제외 범위와 검증 기록은 `docs/implementation-plan.md`를 기준으로 판단합니다.
- 번호가 있는 작업을 시작하기 전에 `docs/`의 최신 관련 handoff를 읽고 실제 저장소와 대조합니다. 목표, 완료 기준, 사용자가 할 작업, Codex가 할 작업과 제외 범위를 설명한 뒤 사용자의 명시적 시작을 기다립니다.
- 시작, routing, persistence, native module, lifecycle 또는 generated project 동작을 변경하기 전에 `docs/architecture-internals.md`를 읽습니다.
- 대화형 학습 단계에서는 `docs/learning-guide.md`와 `docs/2026-07-23-step-7-learning-progress.md`를 함께 사용합니다.

## 작업 경계

- FieldLog는 Android와 iPhone을 대상으로 합니다. `docs/implementation-plan.md`에 명시된 제외 범위를 따릅니다.
- 구현 계획에 없는 기능, dependency 또는 검증 요구사항을 추가하지 않습니다.
- Git, GitHub, EAS, account, credential과 실기기 작업은 현재 번호 단계에 대한 사용자의 명시적 승인 후에만 수행합니다.
- 스킵한 검증을 통과, 실패 또는 blocker로 바꾸어 기록하지 않습니다.
- 사용자 응답은 기본적으로 한글로 작성하고 저장소 문서는 해당 문서의 기존 언어와 문체를 유지합니다.

## 명령

- development client용 Metro: `npx expo start --dev-client`
- lint: `npm run lint`
- type check: `npm run typecheck`
- test: `npm test -- --runInBand`
- Expo 상태 검사: `npx expo-doctor@latest`
- dependency 호환성 검사: `npx expo install --check`
- 공개 Expo config 확인: `npx expo config --type public`
- native 검증 범위에 포함될 때만 Android local build: `npm run android`
- EAS는 `eas.json`의 `development` profile만 사용합니다. build와 device 등록은 사용자와 순서대로 진행하는 interactive 작업입니다.

## Source와 generated output 경계

- `app/`은 Expo Router screen과 route 구성을 담당합니다.
- `src/`는 type, schema, API, database, application state, hook과 공용 component를 담당합니다.
- `modules/proximity-sensor/android/`와 `modules/proximity-sensor/ios/`는 직접 관리하는 native source입니다.
- root `/android`, root `/ios`, `.expo/`, `modules/proximity-sensor/android/build/`는 generated 또는 ignored output입니다. source처럼 직접 수정하거나 source 조사·test 대상에 포함하지 않습니다.
- Expo Go에는 local module이 없습니다. native, dependency, plugin 또는 app config 변경 후에는 새 development build가 필요하고, JS/TS만 변경했다면 설치된 development client와 Metro로 확인할 수 있습니다.

## 검증 규칙

- 동작을 바꾸는 source, package, app config, schema 또는 native code를 수정하기 전에 실제 caller와 consumer를 조사하고 필수 Impact Review를 제시합니다.
- 가장 좁고 의미 있는 검사를 먼저 실행하고, 완료를 선언하기 전에는 변경 범위에 필요한 전체 검증을 수행합니다.
- Jest는 `@/modules/proximity-sensor`를 mock합니다. 자동화 test 통과를 native compile이나 실물 sensor 동작의 근거로 사용하지 않습니다.
- 자동화 test, native build, artifact 검사와 실기기 검증 결과를 서로 구분해 기록합니다.
- 문서만 변경했다면 경로, link, Markdown 구조, 오래된 상태 문구와 trailing whitespace를 확인하고 이유 없이 app build를 다시 실행하지 않습니다.

## 문서 관리

- 이 파일은 짧고 실행 가능한 지침으로 유지합니다. 자세한 시작, routing, data, persistence와 native lifecycle 설명은 `docs/architecture-internals.md`에 기록합니다.
- 날짜가 있는 계획·handoff 기록을 보존하고, 바뀐 사실만 수정하며 새로운 결정은 이어서 추가합니다.
