// [파일 역할] CaptureContext와 DB에서 읽은 Observation을 같은 형식으로 보여 주는 공용 UI입니다.
// [FLOW-04 / 4단계, FLOW-05 / 5단계] 작성 미리보기와 저장된 기록 상세가 이 컴포넌트를 재사용합니다.
import { StyleSheet, Text, View } from "react-native";

import type {
  CaptureContext,
  Observation,
} from "@/src/types/observation";
import {
  convertTemperature,
  type TemperatureUnit,
} from "@/src/types/weather";

// [문법] union(`A | B`)을 사용하면 두 타입에 공통으로 존재하는 snapshot 필드를 안전하게 읽을 수 있습니다.
type SnapshotSummaryProps = {
  snapshot: CaptureContext | Observation;
  temperatureUnit: TemperatureUnit;
};

// [이유] 센서 상태 코드와 사용자 표시 문구를 렌더 JSX에서 분리합니다.
// `as const`는 key와 value를 넓은 string이 아닌 정확한 리터럴로 보존합니다.
const PROXIMITY_LABELS = {
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
} as const;

// [이유] null 처리와 한국 로케일 날짜 변환을 모든 시각 필드에서 동일하게 재사용합니다.
function formatDateTime(value: number | null): string {
  // [문법] 삼항 연산자는 null일 때와 실제 숫자일 때 반환할 문자열을 나눕니다.
  return value === null ? "없음" : new Date(value).toLocaleString("ko-KR");
}

// [문법] 매개변수 자리에서 props 객체를 구조 분해해 두 값을 바로 꺼냅니다.
export function SnapshotSummary({
  snapshot,
  temperatureUnit,
}: SnapshotSummaryProps) {
  // [FLOW-06 / 3단계] 사용자가 고른 온도 설정에 맞춰 숫자 옆 단위 문자를 정합니다.
  const unitLabel = temperatureUnit === "celsius" ? "C" : "F";

  return (
    // [라이브러리] View는 배치 컨테이너이고, React Native에서는 화면 문자열을 Text 안에 넣어야 합니다.
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.heading}>근접 센서</Text>
        <Text style={styles.value}>
          {/* 상태 union 값으로 PROXIMITY_LABELS의 해당 표시 문구를 조회합니다. */}
          상태: {PROXIMITY_LABELS[snapshot.proximity.status]}
        </Text>
        <Text style={styles.value}>
          거리:{" "}
          {/* null이면 거리 정보가 없고, 숫자이면 소수 둘째 자리까지 포맷합니다. */}
          {snapshot.proximity.distanceCm === null
            ? "없음"
            : `${snapshot.proximity.distanceCm.toFixed(2)} cm`}
        </Text>
        <Text style={styles.value}>
          최대 범위:{" "}
          {snapshot.proximity.maxRangeCm === null
            ? "없음"
            : `${snapshot.proximity.maxRangeCm.toFixed(2)} cm`}
        </Text>
        <Text style={styles.value}>
          감지 시각: {formatDateTime(snapshot.proximity.observedAt)}
        </Text>
        <Text style={styles.meta}>플랫폼: {snapshot.platform}</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.heading}>위치</Text>
        {/* [문법] 조건부 렌더링: location이 있으면 여러 Text, 없으면 안내 Text를 선택합니다. */}
        {snapshot.location ? (
          <>
            <Text style={styles.value}>
              좌표: {snapshot.location.latitude.toFixed(5)},{" "}
              {snapshot.location.longitude.toFixed(5)}
            </Text>
            <Text style={styles.value}>
              정확도:{" "}
              {/* accuracyM은 위치 객체 안에서도 nullable이므로 별도로 null을 처리합니다. */}
              {snapshot.location.accuracyM === null
                ? "없음"
                : `약 ${Math.round(snapshot.location.accuracyM)} m`}
            </Text>
            <Text style={styles.meta}>
              관측 시각: {formatDateTime(snapshot.location.observedAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.empty}>저장된 위치가 없습니다.</Text>
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.heading}>날씨</Text>
        {/* 캡처 당시 날씨 객체가 있는 경우에만 온도·코드·관측 시각을 표시합니다. */}
        {snapshot.weather ? (
          <>
            <Text style={styles.value}>
              기온:{" "}
              {/* [FLOW-06 / 4단계] 저장값은 섭씨로 유지하고 렌더 순간에만 선택 단위로 변환합니다. */}
              {convertTemperature(
                snapshot.weather.temperatureC,
                temperatureUnit,
              ).toFixed(1)}
              °{unitLabel}
            </Text>
            <Text style={styles.value}>
              체감:{" "}
              {convertTemperature(
                snapshot.weather.apparentTemperatureC,
                temperatureUnit,
              ).toFixed(1)}
              °{unitLabel}
            </Text>
            <Text style={styles.value}>
              날씨 코드: {snapshot.weather.weatherCode}
            </Text>
            <Text style={styles.meta}>
              관측 시각: {formatDateTime(snapshot.weather.observedAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.empty}>저장된 날씨가 없습니다.</Text>
        )}
      </View>

      <Text style={styles.capturedAt}>
        캡처 시각: {formatDateTime(snapshot.capturedAt)}
      </Text>
    </View>
  );
}

// [라이브러리] StyleSheet.create는 스타일 객체를 React Native 규칙에 맞게 타입 검사합니다.
// 아래 반복 속성은 표시 전용이므로 snapshot 데이터 흐름에는 영향을 주지 않습니다.
const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  group: {
    gap: 5,
  },
  heading: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  value: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    color: "#64748B",
    fontSize: 14,
  },
  capturedAt: {
    paddingTop: 12,
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    color: "#475569",
    fontSize: 13,
  },
});
