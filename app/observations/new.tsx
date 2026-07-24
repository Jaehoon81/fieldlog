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

const CATEGORIES: {
  value: ObservationCategory;
  label: string;
}[] = [
  { value: "experiment", label: "실험" },
  { value: "environment", label: "환경" },
  { value: "other", label: "기타" },
];

type ObservationFormProps = {
  captureContext: CaptureContext;
};

function ObservationForm({ captureContext }: ObservationFormProps) {
  const router = useRouter();
  const clearCaptureContext = useAppStore(
    (state) => state.clearCaptureContext,
  );
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);
  const createMutation = useCreateObservationMutation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ObservationFormInput, unknown, ObservationFormValues>({
    resolver: zodResolver(observationFormSchema),
    defaultValues: {
      title: "",
      note: "",
      category: "experiment",
    },
  });
  const note = useWatch({ control, name: "note" });

  useFocusEffect(
    useCallback(
      () => () => {
        clearCaptureContext();
      },
      [clearCaptureContext],
    ),
  );

  const cancel = useCallback(() => {
    clearCaptureContext();
    router.back();
  }, [clearCaptureContext, router]);

  const submit = useCallback(
    async (values: ObservationFormValues) => {
      try {
        await createMutation.mutateAsync({
          ...values,
          captureContext,
        });
        clearCaptureContext();
        router.replace("/(tabs)/records");
      } catch {
        // Mutation state renders the actionable error below the form.
      }
    },
    [captureContext, clearCaptureContext, createMutation, router],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              기록 내용
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>제목</Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    accessibilityLabel="기록 제목"
                    autoCapitalize="sentences"
                    maxLength={60}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="관찰 내용을 짧게 입력하세요"
                    style={[
                      styles.input,
                      errors.title && styles.inputWithError,
                    ]}
                    value={value}
                  />
                )}
              />
              {errors.title ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errors.title.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>메모</Text>
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
              <Text style={styles.counter}>{note.length}/500</Text>
              {errors.note ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errors.note.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>카테고리</Text>
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <View
                    accessibilityLabel="기록 카테고리"
                    accessibilityRole="radiogroup"
                    style={styles.segmentedGroup}
                  >
                    {CATEGORIES.map((category) => {
                      const isSelected = value === category.value;

                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          key={category.value}
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
            <SnapshotSummary
              snapshot={captureContext}
              temperatureUnit={temperatureUnit}
            />
          </View>

          {createMutation.isError ? (
            <Text accessibilityRole="alert" style={styles.submitError}>
              기록을 저장하지 못했습니다. 다시 시도해 주세요.
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
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
                void handleSubmit(submit)();
              }}
              style={({ pressed }) => [
                styles.saveButton,
                createMutation.isPending && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
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
  const captureContext = useAppStore((state) => state.captureContext);

  return (
    <>
      <Stack.Screen
        options={{ headerBackTitle: "현재 상태", title: "새 기록" }}
      />
      {captureContext ? (
        <ObservationForm captureContext={captureContext} />
      ) : (
        <MissingCaptureContext />
      )}
    </>
  );
}

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
