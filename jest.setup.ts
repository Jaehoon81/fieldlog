// [파일 역할] 모든 Jest suite보다 먼저 실행되어 기기에서만 존재하는 local Expo Module을 공통 mock으로 바꿉니다.
// [검증 경계] 이 객체는 JS/React test를 실행하기 위한 대역이며 native compile·센서 동작 성공의 증거가 아닙니다.
jest.mock("@/modules/proximity-sensor", () => ({
  // CommonJS가 ES module의 default export 모양으로 해석하도록 표시합니다.
  __esModule: true,
  default: {
    // 각 test가 센서 지원 Promise와 listener 반환값/호출을 원하는 시나리오대로 설정합니다.
    isAvailableAsync: jest.fn(),
    addListener: jest.fn(),
  },
}));
