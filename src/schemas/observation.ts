/**
 * [파일 역할]
 * 새 기록 form의 runtime 입력 규칙을 Zod로 정의한다. TypeScript type은 compile
 * 이후 사라지지만 Zod schema는 앱 실행 중에도 사용자 값을 실제로 검사한다.
 * 같은 schema를 form resolver와 SQLite 저장 경계가 함께 사용한다.
 */

import { z } from "zod";

// [라이브러리] `z.object`는 세 property를 가진 object validation schema를 만든다.
export const observationFormSchema = z.object({
  title: z
    // 입력이 string인지 먼저 검사한다.
    .string()
    // [FLOW-04] 저장 전에 앞뒤 공백을 제거하므로 output은 input과 달라질 수 있다.
    .trim()
    // 공백 제거 후 빈 제목을 거부한다.
    .min(1, { message: "제목을 입력해 주세요." })
    .max(60, { message: "제목은 60자 이하로 입력해 주세요." }),
  note: z
    .string()
    // 메모는 선택 사항이라 빈 문자열은 허용하고 최대 길이만 제한한다.
    .max(500, { message: "메모는 500자 이하로 입력해 주세요." }),
  // [문법] enum schema는 세 literal 중 하나만 runtime에서 허용한다.
  category: z.enum(["experiment", "environment", "other"], {
    message: "카테고리를 선택해 주세요.",
  }),
});

/**
 * [문법]
 * `z.input`은 parse 전 입력 type, `z.output`은 trim 같은 변환이 끝난 결과 type을
 * schema에서 추론한다. 규칙과 type을 따로 작성하지 않아 둘의 drift를 막는다.
 */
export type ObservationFormInput = z.input<typeof observationFormSchema>;
export type ObservationFormValues = z.output<typeof observationFormSchema>;
