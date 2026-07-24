import { StyleSheet, Text, View } from "react-native";

import type {
  CaptureContext,
  Observation,
} from "@/src/types/observation";
import {
  convertTemperature,
  type TemperatureUnit,
} from "@/src/types/weather";

type SnapshotSummaryProps = {
  snapshot: CaptureContext | Observation;
  temperatureUnit: TemperatureUnit;
};

const PROXIMITY_LABELS = {
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
} as const;

function formatDateTime(value: number | null): string {
  return value === null ? "없음" : new Date(value).toLocaleString("ko-KR");
}

export function SnapshotSummary({
  snapshot,
  temperatureUnit,
}: SnapshotSummaryProps) {
  const unitLabel = temperatureUnit === "celsius" ? "C" : "F";

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.heading}>근접 센서</Text>
        <Text style={styles.value}>
          상태: {PROXIMITY_LABELS[snapshot.proximity.status]}
        </Text>
        <Text style={styles.value}>
          거리:{" "}
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
        {snapshot.location ? (
          <>
            <Text style={styles.value}>
              좌표: {snapshot.location.latitude.toFixed(5)},{" "}
              {snapshot.location.longitude.toFixed(5)}
            </Text>
            <Text style={styles.value}>
              정확도:{" "}
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
        {snapshot.weather ? (
          <>
            <Text style={styles.value}>
              기온:{" "}
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
