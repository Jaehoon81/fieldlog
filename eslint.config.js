// [파일 역할] `npm run lint`가 Expo/React Native 권장 규칙과 이 저장소의 ignore 범위를 읽는 flat config입니다.
// 참고 문서: https://docs.expo.dev/guides/using-eslint/
// [문법] 이 설정 파일은 TypeScript import가 아니라 Node.js CommonJS의 require/module.exports를 사용합니다.
const { defineConfig } = require('eslint/config');
// Expo가 SDK·React·React Native에 맞춰 제공하는 공통 flat config 배열입니다.
const expoConfig = require('eslint-config-expo/flat');

// defineConfig가 config 항목 배열의 모양을 확인하고 editor/CLI가 같은 설정을 사용하게 합니다.
module.exports = defineConfig([
  expoConfig,
  {
    // 빌드 산출물 dist는 사람이 관리하는 source가 아니므로 lint 대상에서 제외합니다.
    ignores: ['dist/*'],
  },
]);
