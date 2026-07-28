// [파일 역할] observationFormSchema의 trim 변환, 오류 경계와 정확한 최대 길이를 검증합니다.
// [검증 경계] 화면이나 DB가 아니라 Zod 입력/출력 계약만 확인하는 순수 단위 test입니다.
import { observationFormSchema } from "@/src/schemas/observation";

describe("observationFormSchema", () => {
  it("trims a valid title", () => {
    // parse는 유효하면 변환된 값을 반환하므로 앞뒤 공백이 제거된 전체 객체를 비교합니다.
    expect(
      observationFormSchema.parse({
        title: "  센서 확인  ",
        note: "",
        category: "experiment",
      }),
    ).toEqual({
      title: "센서 확인",
      note: "",
      category: "experiment",
    });
  });

  // [Jest 문법] it.each의 각 row는 test 이름, 입력 객체 한 쌍이며 같은 거부 assertion을 반복합니다.
  it.each([
    ["빈 제목", { title: "   ", note: "", category: "experiment" }],
    [
      "61자 제목",
      { title: "가".repeat(61), note: "", category: "environment" },
    ],
    [
      "501자 메모",
      { title: "제목", note: "가".repeat(501), category: "other" },
    ],
    ["허용되지 않은 카테고리", { title: "제목", note: "", category: "work" }],
  ])("%s를 거부한다", (_, input) => {
    // `_`는 test 이름에만 쓰인 첫 값을 callback 본문에서 사용하지 않는다는 관례입니다.
    // safeParse는 예외 대신 success boolean을 주어 여러 invalid case를 간단히 비교할 수 있습니다.
    expect(observationFormSchema.safeParse(input).success).toBe(false);
  });

  it("제목 60자와 메모 500자를 허용한다", () => {
    // repeat로 정확한 boundary 길이를 만들어 59/499 같은 느슨한 검증이 되지 않게 합니다.
    expect(
      observationFormSchema.safeParse({
        title: "가".repeat(60),
        note: "나".repeat(500),
        category: "other",
      }).success,
    ).toBe(true);
  });
});
