// [파일 역할] 저장 기준인 섭씨를 선택한 표시 단위로 변환하는 순수 함수의 두 분기를 검증합니다.
import { convertTemperature } from "@/src/types/weather";

describe("convertTemperature", () => {
  it("섭씨 값은 그대로 반환한다", () => {
    // celsius 분기는 원본 number를 변경하지 않아야 합니다.
    expect(convertTemperature(21.5, "celsius")).toBe(21.5);
  });

  it("섭씨를 화씨로 변환한다", () => {
    // 물의 어는점과 끓는점이라는 알려진 기준값으로 `C * 9 / 5 + 32` 공식을 확인합니다.
    expect(convertTemperature(0, "fahrenheit")).toBe(32);
    expect(convertTemperature(100, "fahrenheit")).toBe(212);
  });
});
