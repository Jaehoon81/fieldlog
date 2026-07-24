import { observationFormSchema } from "@/src/schemas/observation";

describe("observationFormSchema", () => {
  it("trims a valid title", () => {
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
    expect(observationFormSchema.safeParse(input).success).toBe(false);
  });

  it("제목 60자와 메모 500자를 허용한다", () => {
    expect(
      observationFormSchema.safeParse({
        title: "가".repeat(60),
        note: "나".repeat(500),
        category: "other",
      }).success,
    ).toBe(true);
  });
});
