import { convertTemperature } from "@/src/types/weather";

describe("convertTemperature", () => {
  it("섭씨 값은 그대로 반환한다", () => {
    expect(convertTemperature(21.5, "celsius")).toBe(21.5);
  });

  it("섭씨를 화씨로 변환한다", () => {
    expect(convertTemperature(0, "fahrenheit")).toBe(32);
    expect(convertTemperature(100, "fahrenheit")).toBe(212);
  });
});
