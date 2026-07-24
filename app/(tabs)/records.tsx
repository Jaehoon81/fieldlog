import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useObservationsQuery } from "@/src/db/observations";
import type { Observation } from "@/src/types/observation";

const CATEGORY_LABELS = {
  experiment: "실험",
  environment: "환경",
  other: "기타",
} as const;

const PROXIMITY_LABELS = {
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
} as const;

type ObservationRowProps = {
  observation: Observation;
  onPress: () => void;
};

function ObservationRow({ observation, onPress }: ObservationRowProps) {
  return (
    <Pressable
      accessibilityHint="저장된 스냅샷의 상세 내용을 엽니다"
      accessibilityLabel={`${observation.title}, ${new Date(
        observation.capturedAt,
      ).toLocaleString("ko-KR")}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowHeader}>
        <Text numberOfLines={1} style={styles.title}>
          {observation.title}
        </Text>
        <Text style={styles.category}>
          {CATEGORY_LABELS[observation.category]}
        </Text>
      </View>
      <Text style={styles.meta}>
        근접 센서: {PROXIMITY_LABELS[observation.proximity.status]}
      </Text>
      <Text style={styles.meta}>
        {new Date(observation.capturedAt).toLocaleString("ko-KR")}
      </Text>
    </Pressable>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const observationsQuery = useObservationsQuery();

  if (observationsQuery.isPending) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View
          accessibilityLabel="기록 불러오는 중"
          accessibilityRole="progressbar"
          style={styles.centered}
        >
          <ActivityIndicator size="large" />
          <Text style={styles.message}>저장된 기록을 불러오고 있습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (observationsQuery.isError) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            기록을 불러오지 못했습니다.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void observationsQuery.refetch();
            }}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          observationsQuery.data.length === 0 && styles.emptyListContent,
        ]}
        data={observationsQuery.data}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(observation) => String(observation.id)}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              아직 저장된 기록이 없습니다
            </Text>
            <Text style={styles.message}>
              현재 상태 탭에서 센서 상태를 확인하고 첫 기록을 만들어 보세요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ObservationRow
            observation={item}
            onPress={() =>
              router.push({
                pathname: "/observations/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  row: {
    gap: 7,
    padding: 17,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  category: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#EFF6FF",
  },
  meta: {
    color: "#64748B",
    fontSize: 13,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
