// [파일 역할] SQLite에 저장된 Observation 목록을 최신순으로 보여 주고 동적 상세 route로 연결합니다.
// [FLOW-05] 목록 Query → SQLite row 변환 → 동적 상세 route → 단건 Query → 삭제·cache 정리 → 기록 tab 복귀 순서입니다.
// 목록·상세 상태와 삭제 취소·확정·실패·성공 경로는 각 단계에서 따로 확인합니다.
// [FLOW-05 / 관련 코드] Query 조회 → 행 렌더 → 사용자가 누른 id를 URL parameter로 전달합니다.
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

// 저장 코드와 표시 문구를 분리합니다. `as const`는 key/value 리터럴을 정확하게 보존합니다.
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

// [문법] 콜백 prop `() => void`는 자식이 navigation 세부사항을 몰라도 누름을 부모에게 알리게 합니다.
type ObservationRowProps = {
  observation: Observation;
  onPress: () => void;
};

// 한 기록의 표시만 담당하는 작은 presentational component입니다.
function ObservationRow({ observation, onPress }: ObservationRowProps) {
  return (
    <Pressable
      // 제목과 캡처 시각을 accessibility label에 포함해 행의 의미를 음성으로 전달합니다.
      accessibilityHint="저장된 스냅샷의 상세 내용을 엽니다"
      accessibilityLabel={`${observation.title}, ${new Date(
        observation.capturedAt,
      ).toLocaleString("ko-KR")}`}
      accessibilityRole="button"
      // [FLOW-05 / 6단계] 사용자가 목록 행을 누르면 부모가 전달한 상세 이동 callback을 호출합니다.
      onPress={onPress}
      // Pressable의 pressed 상태 동안 opacity 스타일을 추가합니다.
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowHeader}>
        {/* 긴 제목은 한 줄까지만 표시하여 목록 행 높이를 안정적으로 유지합니다. */}
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

// [FLOW-05 / 1단계] 사용자가 기록 tab을 열어 route가 렌더되면 목록 화면 흐름이 시작됩니다.
export default function RecordsScreen() {
  const router = useRouter();
  // [FLOW-05 / 2단계] 기록 화면이 목록 Query Hook에 최신 Observation 목록을 요청합니다.
  // [FLOW-05 / 관련 코드] Hook이 SQLite SELECT와 TanStack Query의 pending/error/data 상태를 제공합니다.
  const observationsQuery = useObservationsQuery();

  // [FLOW-05 / 5단계] Query 결과에 따라 pending·error·empty·data 목록 중 현재 UI를 표시합니다.
  // [문법] early return으로 각 비동기 상태의 JSX를 분리하면 성공 화면의 중첩을 줄일 수 있습니다.
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
              // refetch Promise는 버튼 handler가 소비하지 않으므로 void로 의도적으로 버립니다.
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
      {/* [라이브러리] FlatList는 보이는 행 중심으로 렌더하여 긴 배열에서 ScrollView보다 효율적입니다. */}
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          observationsQuery.data.length === 0 && styles.emptyListContent,
        ]}
        // query 성공 이후이므로 data는 Observation[]로 좁혀져 있습니다.
        data={observationsQuery.data}
        // 행 사이 여백을 별도 컴포넌트로 넣어 각 행 스타일과 분리합니다.
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        // React key 자체는 number도 허용하지만 FlatList keyExtractor는 string 반환 계약입니다.
        // 따라서 숫자 DB id를 안정적인 문자열 key로 변환합니다.
        keyExtractor={(observation) => String(observation.id)}
        // 배열 길이가 0일 때만 첫 기록 안내를 렌더합니다.
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
        // [FLOW-05 / 관련 코드] FlatList가 넘긴 item을 행으로 만들고 누르면 id가 있는 동적 route로 이동합니다.
        renderItem={({ item }) => (
          <ObservationRow
            observation={item}
            onPress={() =>
              // [FLOW-05 / 7단계] 선택한 기록 id를 URL parameter에 넣어 동적 상세 route를 엽니다.
              router.push({
                // pathname의 `[id]` 자리와 params.id가 Expo Router에서 결합됩니다.
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

// [라이브러리] StyleSheet.create가 목록·빈 상태·오류·행 스타일을 타입 검사합니다.
// 아래 속성은 표시 전용이며 Query 또는 navigation 데이터 흐름을 바꾸지 않습니다.
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
