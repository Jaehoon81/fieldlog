// [파일 역할] `/observations/[id]` URL의 id로 기록 한 건을 조회하고, 상세 표시와 삭제를 제공합니다.
// [FLOW-05 / 4~6단계] parameter 검증 → SQLite 조회 → 삭제 확인/mutation → 기록 탭 복귀 순서입니다.
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

// DB의 category 코드와 화면용 문구를 연결하는 읽기 전용 lookup 객체입니다.
const CATEGORY_LABELS = {
  experiment: "실험",
  environment: "환경",
  other: "기타",
} as const;

// [이유] URL parameter는 외부 입력이므로 바로 SQL id로 사용하지 않고 양의 정수만 통과시킵니다.
function parseObservationId(value: string | string[] | undefined): number | null {
  // [문법] 같은 query key가 반복되면 string[]일 수 있어 첫 값만 사용합니다.
  const rawValue = Array.isArray(value) ? value[0] : value;
  // Number(undefined)는 NaN이 되고 아래 정수 검사에서 안전하게 탈락합니다.
  const parsed = Number(rawValue);

  // 정상 양의 정수면 number, 아니면 명시적인 null을 반환합니다.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ObservationDetailScreen() {
  const router = useRouter();
  // [라이브러리] 제네릭은 이 route에서 기대하는 local search parameter 모양을 TypeScript에 알려 줍니다.
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  // [FLOW-05 / 4단계] URL 문자열을 DB 조회에 쓸 수 있는 id로 좁힙니다.
  const id = parseObservationId(params.id);
  // id가 null이면 -1을 넘기고 Hook의 enabled 조건이 SQL 실행을 막습니다.
  const observationQuery = useObservationQuery(id ?? -1);
  const deleteMutation = useDeleteObservationMutation();
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);

  // [FLOW-05 / 5단계] destructive 작업은 Alert에서 한 번 더 명시적으로 확인합니다.
  const confirmDeletion = () => {
    // 잘못된 route에서는 삭제 mutation을 시작하지 않는 방어 절입니다.
    if (id === null) {
      return;
    }

    Alert.alert("기록 삭제", "이 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          // Promise chain: 삭제 성공 시 목록으로 replace, 실패 시 mutation의 isError UI가 처리합니다.
          void deleteMutation
            .mutateAsync(id)
            .then(() => router.replace("/(tabs)/records"))
            // undefined를 반환해 unhandled rejection을 막고 화면의 오류 상태는 유지합니다.
            .catch(() => undefined);
        },
      },
    ]);
  };

  // [문법] 아래 early return들은 invalid → loading → error → not found를 성공 UI보다 먼저 분리합니다.
  if (id === null) {
    return (
      <>
        <Stack.Screen
          options={{ headerBackTitle: "기록", title: "기록 상세" }}
        />
        {/* 잘못된 URL은 DB 오류와 구분해 목록 복귀 경로를 제공합니다. */}
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
              // refetch 결과는 Query state로 렌더되므로 버튼 handler에서는 void 처리합니다.
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

  // SQL은 정상 수행됐지만 해당 id 행이 없는 상태입니다.
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

  // 위 분기들을 모두 통과했으므로 data가 null이 아닌 Observation으로 타입이 좁혀집니다.
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
              {/* 빈 문자열 메모는 빈 공간 대신 명시적인 안내를 보여 줍니다. */}
              {observation.note.length === 0 ? "메모 없음" : observation.note}
            </Text>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              저장된 스냅샷
            </Text>
            {/* DB에서 복원한 중첩 sensor/location/weather 값을 공용 컴포넌트에 전달합니다. */}
            <SnapshotSummary
              snapshot={observation}
              temperatureUnit={temperatureUnit}
            />
          </View>

          {/* mutation 실패 시 상세 정보는 유지하고 같은 삭제 버튼으로 재시도할 수 있습니다. */}
          {deleteMutation.isError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              기록을 삭제하지 못했습니다. 다시 시도해 주세요.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            // pending 중 중복 DELETE를 막습니다.
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

// invalid/not-found 상태가 공유하는 안내 UI의 props 계약입니다.
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

// [라이브러리] StyleSheet.create가 상세·상태·삭제 버튼 스타일을 타입 검사합니다.
// 표시 속성은 DB 조회·삭제 로직과 독립적입니다.
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
