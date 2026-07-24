import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SnapshotSummary } from "@/src/components/snapshot-summary";
import {
  useDeleteObservationMutation,
  useObservationQuery,
} from "@/src/db/observations";
import { useAppStore } from "@/src/store/app-store";

const CATEGORY_LABELS = {
  experiment: "실험",
  environment: "환경",
  other: "기타",
} as const;

function parseObservationId(value: string | string[] | undefined): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ObservationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = parseObservationId(params.id);
  const observationQuery = useObservationQuery(id ?? -1);
  const deleteMutation = useDeleteObservationMutation();
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);

  const confirmDeletion = () => {
    if (id === null) {
      return;
    }

    Alert.alert("기록 삭제", "이 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void deleteMutation
            .mutateAsync(id)
            .then(() => router.replace("/(tabs)/records"))
            .catch(() => undefined);
        },
      },
    ]);
  };

  if (id === null) {
    return (
      <>
        <Stack.Screen
          options={{ headerBackTitle: "기록", title: "기록 상세" }}
        />
        <MessageState
          message="올바르지 않은 기록 주소입니다."
          onGoBack={() => router.replace("/(tabs)/records")}
        />
      </>
    );
  }

  if (observationQuery.isPending) {
    return (
      <>
        <Stack.Screen
          options={{ headerBackTitle: "기록", title: "기록 상세" }}
        />
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <View
            accessibilityLabel="기록 상세 불러오는 중"
            accessibilityRole="progressbar"
            style={styles.centered}
          >
            <ActivityIndicator size="large" />
            <Text style={styles.message}>기록을 불러오고 있습니다.</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (observationQuery.isError) {
    return (
      <>
        <Stack.Screen
          options={{ headerBackTitle: "기록", title: "기록 상세" }}
        />
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <View style={styles.centered}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              기록을 불러오지 못했습니다.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void observationQuery.refetch();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (observationQuery.data === null) {
    return (
      <>
        <Stack.Screen options={{ title: "기록 상세" }} />
        <MessageState
          message="해당 기록을 찾을 수 없습니다."
          onGoBack={() => router.replace("/(tabs)/records")}
        />
      </>
    );
  }

  const observation = observationQuery.data;

  return (
    <>
      <Stack.Screen
        options={{ headerBackTitle: "기록", title: "기록 상세" }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>
              {observation.title}
            </Text>
            <Text style={styles.category}>
              {CATEGORY_LABELS[observation.category]}
            </Text>
            <Text style={styles.note}>
              {observation.note.length === 0 ? "메모 없음" : observation.note}
            </Text>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              저장된 스냅샷
            </Text>
            <SnapshotSummary
              snapshot={observation}
              temperatureUnit={temperatureUnit}
            />
          </View>

          {deleteMutation.isError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              기록을 삭제하지 못했습니다. 다시 시도해 주세요.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={deleteMutation.isPending}
            onPress={confirmDeletion}
            style={({ pressed }) => [
              styles.deleteButton,
              deleteMutation.isPending && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color="#B91C1C" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>기록 삭제</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

type MessageStateProps = {
  message: string;
  onGoBack: () => void;
};

function MessageState({ message, onGoBack }: MessageStateProps) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onGoBack}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>기록 목록으로 이동</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  card: {
    gap: 12,
    padding: 18,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  title: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },
  category: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#EFF6FF",
  },
  note: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 23,
  },
  message: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FEF2F2",
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
