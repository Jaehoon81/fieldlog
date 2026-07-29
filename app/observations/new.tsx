// [파일 역할] 홈에서 고정한 CaptureContext에 제목·메모·카테고리를 입력해 SQLite 기록으로 저장하는 화면입니다.
// [FLOW-04 / 관련 코드] Zustand 임시값 → React Hook Form → Zod → mutation → records route 순서로 흐릅니다.
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SnapshotSummary } from "@/src/components/snapshot-summary";
import { useCreateObservationMutation } from "@/src/db/observations";
import {
  observationFormSchema,
  type ObservationFormInput,
  type ObservationFormValues,
} from "@/src/schemas/observation";
import { useAppStore } from "@/src/store/app-store";
import type {
  CaptureContext,
  ObservationCategory,
} from "@/src/types/observation";

// [문법] `{ value; label }[]`는 같은 모양의 객체가 여러 개 들어가는 배열 타입입니다.
// value는 DB에 저장할 코드, label은 사용자에게 보여 줄 한국어입니다.
const CATEGORIES: {
  value: ObservationCategory;
  label: string;
}[] = [
  { value: "experiment", label: "실험" },
  { value: "environment", label: "환경" },
  { value: "other", label: "기타" },
];

// 부모가 유효한 captureContext를 확인한 뒤 실제 form에 넘기는 props 계약입니다.
type ObservationFormProps = {
  captureContext: CaptureContext;
};

// [문법] props 매개변수에서 captureContext를 바로 구조 분해합니다.
function ObservationForm({ captureContext }: ObservationFormProps) {
  const router = useRouter();
  // [라이브러리] 각 selector는 Zustand store 전체가 아닌 필요한 값/함수만 구독합니다.
  const clearCaptureContext = useAppStore(
    (state) => state.clearCaptureContext,
  );
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);
  // SQLite INSERT와 성공 후 Query cache 무효화 상태를 제공하는 TanStack Query mutation입니다.
  const createMutation = useCreateObservationMutation();
  // [FLOW-04 / 관련 코드] useForm이 입력값, validation 오류와 제출 절차를 소유합니다.
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ObservationFormInput, unknown, ObservationFormValues>({
    // [문법] 세 제네릭은 입력 전 타입, form context(미사용), Zod 변환 후 제출 타입 순서입니다.
    // [라이브러리] zodResolver가 submit 시 observationFormSchema를 실행하고 오류를 errors에 연결합니다.
    resolver: zodResolver(observationFormSchema),
    // controlled input은 처음부터 문자열 값이 있어야 하므로 모든 필드의 초기값을 명시합니다.
    defaultValues: {
      title: "",
      note: "",
      category: "experiment",
    },
  });
  // useWatch는 note 한 필드만 구독하여 현재 글자 수를 즉시 렌더합니다.
  const note = useWatch({ control, name: "note" });

  // [라이브러리] useFocusEffect가 반환받는 cleanup은 이 화면이 blur/unmount될 때 실행됩니다.
  useFocusEffect(
    useCallback(
      () => () => {
        // [FLOW-04 / 관련 코드] 뒤로 가기 등 어떤 이탈 경로에서도 일회용 CaptureContext가 남지 않게 합니다.
        clearCaptureContext();
      },
      [clearCaptureContext],
    ),
  );

  // 명시적 취소는 임시 snapshot을 지운 뒤 이전 route로 돌아갑니다.
  const cancel = useCallback(() => {
    clearCaptureContext();
    router.back();
  }, [clearCaptureContext, router]);

  // [FLOW-04 / 관련 코드] Zod를 통과한 값만 captureContext와 합쳐 INSERT mutation에 전달합니다.
  const submit = useCallback(
    async (values: ObservationFormValues) => {
      try {
        // [문법] 스프레드로 title/note/category를 복사하고 captureContext 필드를 더한 새 입력 객체입니다.
        // [FLOW-04 / 7단계] 검증된 form 값과 고정한 CaptureContext를 mutation 입력으로 합칩니다.
        await createMutation.mutateAsync({
          ...values,
          captureContext,
        });
        // 저장이 확정된 뒤에만 임시값을 지우고, replace로 작성 화면을 navigation history에서 제거합니다.
        // [FLOW-04 / 11단계] 저장 성공 뒤 일회용 CaptureContext를 제거합니다.
        clearCaptureContext();
        // [FLOW-04 / 12단계] 작성 route를 history에서 제거하고 기록 tab으로 이동합니다.
        router.replace("/(tabs)/records");
      } catch {
        // [이유] mutation이 error 상태를 보존하므로 여기서 별도 state를 만들지 않고 아래 UI가 안내합니다.
      }
    },
    [captureContext, clearCaptureContext, createMutation, router],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        // [라이브러리] iOS에서는 키보드 높이만큼 padding을 더하고 Android는 기본 resize 동작을 사용합니다.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          // 키보드가 열린 상태에서도 버튼/입력처럼 처리되는 터치를 먼저 전달합니다.
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              기록 내용
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>제목</Text>
              {/* [라이브러리] Controller가 React Hook Form 값과 React Native TextInput을 연결합니다. */}
              <Controller
                control={control}
                name="title"
                // field 객체에서 TextInput에 필요한 blur/change/value만 구조 분해합니다.
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    accessibilityLabel="기록 제목"
                    autoCapitalize="sentences"
                    maxLength={60}
                    onBlur={onBlur}
                    // React Native의 새 문자열을 Hook Form의 해당 필드 setter에 전달합니다.
                    onChangeText={onChange}
                    placeholder="관찰 내용을 짧게 입력하세요"
                    // errors.title이 있을 때만 빨간 테두리 스타일이 배열 끝에 추가됩니다.
                    style={[
                      styles.input,
                      errors.title && styles.inputWithError,
                    ]}
                    value={value}
                  />
                )}
              />
              {/* Zod가 만든 필드 오류가 있을 때만 접근성 alert 문구를 표시합니다. */}
              {errors.title ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errors.title.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>메모</Text>
              {/* note도 같은 연결 구조이며 multiline과 최대 500자 UI만 다릅니다. */}
              <Controller
                control={control}
                name="note"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    accessibilityLabel="기록 메모"
                    maxLength={500}
                    multiline
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="선택 사항"
                    style={[
                      styles.input,
                      styles.noteInput,
                      errors.note && styles.inputWithError,
                    ]}
                    textAlignVertical="top"
                    value={value}
                  />
                )}
              />
              {/* useWatch로 받은 현재 문자열 길이를 렌더하므로 입력할 때마다 숫자가 갱신됩니다. */}
              <Text style={styles.counter}>{note.length}/500</Text>
              {errors.note ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errors.note.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>카테고리</Text>
              {/* TextInput이 아닌 세 개의 Pressable도 Controller의 onChange/value로 radio group이 됩니다. */}
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <View
                    accessibilityLabel="기록 카테고리"
                    accessibilityRole="radiogroup"
                    style={styles.segmentedGroup}
                  >
                    {/* [문법] map은 각 category를 하나의 Pressable JSX로 변환합니다. */}
                    {CATEGORIES.map((category) => {
                      const isSelected = value === category.value;

                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          // key는 React가 배열 항목의 동일성을 추적할 수 있는 고유하고 안정적인 값입니다.
                          key={category.value}
                          // 선택한 category.value를 Controller에 전달하면 form의 category가 갱신됩니다.
                          onPress={() => onChange(category.value)}
                          style={({ pressed }) => [
                            styles.segment,
                            isSelected && styles.selectedSegment,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              isSelected && styles.selectedSegmentText,
                            ]}
                          >
                            {category.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
              {errors.category ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errors.category.message}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              저장할 스냅샷
            </Text>
            {/* 홈에서 고정한 값은 폼 입력 중 바뀌지 않으며 저장될 내용을 그대로 미리 보여 줍니다. */}
            <SnapshotSummary
              snapshot={captureContext}
              temperatureUnit={temperatureUnit}
            />
          </View>

          {/* mutation 실패는 입력값과 snapshot을 유지한 채 재시도 가능한 오류로 표시합니다. */}
          {createMutation.isError ? (
            <Text accessibilityRole="alert" style={styles.submitError}>
              기록을 저장하지 못했습니다. 다시 시도해 주세요.
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              // INSERT가 진행 중일 때 취소와 저장을 모두 잠가 중복 동작을 막습니다.
              disabled={createMutation.isPending}
              onPress={cancel}
              style={({ pressed }) => [
                styles.cancelButton,
                createMutation.isPending && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={createMutation.isPending}
              onPress={() => {
                // [FLOW-04 / 6단계] handleSubmit이 Zod resolver를 거쳐 유효할 때만 submit을 호출합니다.
                // handleSubmit(submit)은 validation을 수행할 새 함수를 돌려주므로 마지막 `()`로 실행합니다.
                // 반환 Promise를 Pressable이 사용하지 않으므로 void로 명시합니다.
                void handleSubmit(submit)();
              }}
              style={({ pressed }) => [
                styles.saveButton,
                createMutation.isPending && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {/* 저장 중에는 같은 자리의 문구를 spinner로 바꿉니다. */}
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// [FLOW-04 / 관련 코드] deep link나 새로고침으로 임시 CaptureContext 없이 들어온 경우의 대체 화면입니다.
function MissingCaptureContext() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.missingContainer}>
        <Text accessibilityRole="header" style={styles.missingTitle}>
          저장할 현재 상태가 없습니다
        </Text>
        <Text style={styles.missingText}>
          현재 상태 탭에서 센서 상태를 확인한 뒤 기록 만들기를 눌러 주세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [
            styles.saveButton,
            styles.missingButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveButtonText}>현재 상태로 이동</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function NewObservationScreen() {
  // [FLOW-04 / 5단계] 임시 captureContext를 읽어 실제 form 또는 방어 화면을 선택합니다.
  // Zustand의 임시 captureContext 존재 여부가 실제 form 렌더 여부를 결정합니다.
  const captureContext = useAppStore((state) => state.captureContext);

  return (
    <>
      {/* 파일 기반 route의 header title과 iOS back button 문구를 이 화면에서 설정합니다. */}
      <Stack.Screen
        options={{ headerBackTitle: "현재 상태", title: "새 기록" }}
      />
      {/* [문법] truthy이면 타입이 CaptureContext로 좁혀져 form에 안전하게 전달할 수 있습니다. */}
      {captureContext ? (
        <ObservationForm captureContext={captureContext} />
      ) : (
        <MissingCaptureContext />
      )}
    </>
  );
}

// [라이브러리] StyleSheet.create가 form/card/input/button별 React Native 스타일을 타입 검사합니다.
// 아래 값은 표시 전용이므로 폼 검증·저장 데이터 흐름과 분리해서 읽습니다.
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    gap: 18,
    padding: 18,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },
  field: {
    gap: 7,
  },
  label: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  noteInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  inputWithError: {
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
  },
  counter: {
    alignSelf: "flex-end",
    color: "#64748B",
    fontSize: 12,
  },
  segmentedGroup: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  selectedSegment: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  segmentText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedSegmentText: {
    color: "#1D4ED8",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  submitError: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  missingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  missingTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  missingText: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  missingButton: {
    flex: 0,
    marginTop: 8,
    paddingHorizontal: 22,
  },
});
