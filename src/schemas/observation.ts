import { z } from "zod";

export const observationFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "제목을 입력해 주세요." })
    .max(60, { message: "제목은 60자 이하로 입력해 주세요." }),
  note: z
    .string()
    .max(500, { message: "메모는 500자 이하로 입력해 주세요." }),
  category: z.enum(["experiment", "environment", "other"], {
    message: "카테고리를 선택해 주세요.",
  }),
});

export type ObservationFormInput = z.input<typeof observationFormSchema>;
export type ObservationFormValues = z.output<typeof observationFormSchema>;
