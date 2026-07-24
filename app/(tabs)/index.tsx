import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useWeatherQuery } from "@/src/api/weather";
import { useProximity } from "@/src/hooks/use-proximity";
import { useAppStore } from "@/src/store/app-store";
import type {
  LocationSnapshot,
  ProximitySnapshot,
  ProximityUiStatus,
} from "@/src/types/observation";
import { convertTemperature } from "@/src/types/weather";

type LocationErrorKind =
  | "permission-denied"
  | "permission-blocked"
  | "services-disabled"
  | "unavailable";

const STATUS_LABELS: Record<ProximityUiStatus, string> = {
  idle: "대기 중",
  pending: "확인 중",
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
};

const LOCATION_ERROR_MESSAGES: Record<LocationErrorKind, string> = {
  "permission-denied": "위치 권한이 허용되지 않았습니다.",
  "permission-blocked":
    "위치 권한을 다시 요청할 수 없습니다. 기기 설정에서 권한을 확인해 주세요.",
  "services-disabled": "기기의 위치 서비스가 꺼져 있습니다.",
  unavailable: "현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

function formatDateTime(value: number | null): string {
  return value === null ? "없음" : new Date(value).toLocaleString("ko-KR");
}

export default function CurrentStatusScreen() {
  const router = useRouter();
  const {
    status: proximityStatus,
    event: proximityEvent,
    lastNearAt,
    isMonitoring,
    checkAvailability,
    startMonitoring: beginMonitoring,
    stopMonitoring,
  } = useProximity();
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);
  const setCaptureContext = useAppStore((state) => state.setCaptureContext);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [locationError, setLocationError] =
    useState<LocationErrorKind | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const coordinates = useMemo(
    () =>
      location === null
        ? null
        : {
            latitude: location.latitude,
            longitude: location.longitude,
          },
    [location],
  );
  const weatherQuery = useWeatherQuery(coordinates);

  useFocusEffect(
    useCallback(() => {
      void checkAvailability();

      return stopMonitoring;
    }, [checkAvailability, stopMonitoring]),
  );

  const requestLocationAndWeather = useCallback(async () => {
    setLocation(null);
    setLocationError(null);
    setIsLocating(true);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationError("services-disabled");
        return;
      }

      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (!permission.canAskAgain) {
          setLocationError("permission-blocked");
          return;
        }

        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationError(
          permission.canAskAgain ? "permission-denied" : "permission-blocked",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        observedAt: position.timestamp,
      });
    } catch {
      setLocationError("unavailable");
    } finally {
      setIsLocating(false);
    }
  }, []);

  const startMonitoring = useCallback(() => {
    if (Platform.OS !== "ios") {
      void beginMonitoring();
      return;
    }

    Alert.alert(
      "iPhone 근접 센서 안내",
      "모니터링 중 센서를 가리면 화면이 꺼질 수 있습니다. 화면이 다시 켜진 뒤 마지막 감지 시각을 확인할 수 있습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "시작",
          onPress: () => {
            void beginMonitoring();
          },
        },
      ],
    );
  }, [beginMonitoring]);

  const weatherIsPending =
    coordinates !== null &&
    (weatherQuery.isPending || weatherQuery.isFetching);
  const canCreateObservation =
    (proximityStatus === "near" ||
      proximityStatus === "far" ||
      proximityStatus === "unavailable") &&
    !isLocating &&
    !weatherIsPending;
  const captureHelpText = canCreateObservation
    ? null
    : proximityStatus === "idle"
      ? "모니터링을 시작해 센서 상태를 확인해 주세요."
      : proximityStatus === "pending"
        ? "센서 상태를 확인하고 있습니다."
        : "위치·날씨 요청이 끝나면 기록할 수 있습니다.";

  const createObservation = useCallback(() => {
    if (!canCreateObservation) {
      return;
    }

    let proximitySnapshot: ProximitySnapshot;

    if (proximityStatus === "unavailable" || proximityEvent === null) {
      proximitySnapshot = {
        status: "unavailable",
        distanceCm: null,
        maxRangeCm: null,
        observedAt: null,
      };
    } else {
      proximitySnapshot = { ...proximityEvent };
    }

    setCaptureContext({
      proximity: proximitySnapshot,
      location,
      weather: weatherQuery.data ?? null,
      platform: Platform.OS === "ios" ? "ios" : "android",
      capturedAt: Date.now(),
    });
    router.push("/observations/new");
  }, [
    canCreateObservation,
    location,
    proximityEvent,
    proximityStatus,
    router,
    setCaptureContext,
    weatherQuery.data,
  ]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            근접 센서
          </Text>
          <View
            accessibilityLabel={`근접 센서 상태 ${STATUS_LABELS[proximityStatus]}`}
            style={[
              styles.statusBadge,
              proximityStatus === "near" && styles.nearBadge,
              proximityStatus === "far" && styles.farBadge,
            ]}
          >
            {proximityStatus === "pending" ? (
              <ActivityIndicator color="#475569" size="small" />
            ) : null}
            <Text style={styles.statusText}>
              {STATUS_LABELS[proximityStatus]}
            </Text>
          </View>

          {Platform.OS === "android" ? (
            <>
              <Text style={styles.detailText}>
                거리:{" "}
                {proximityEvent?.distanceCm === null ||
                proximityEvent?.distanceCm === undefined
                  ? "없음"
                  : `${proximityEvent.distanceCm.toFixed(2)} cm`}
              </Text>
              <Text style={styles.detailText}>
                최대 범위:{" "}
                {proximityEvent?.maxRangeCm === null ||
                proximityEvent?.maxRangeCm === undefined
                  ? "없음"
                  : `${proximityEvent.maxRangeCm.toFixed(2)} cm`}
              </Text>
            </>
          ) : (
            <Text style={styles.helpText}>
              iOS는 근접 여부만 제공하므로 거리와 최대 범위는 저장하지 않습니다.
            </Text>
          )}
          <Text style={styles.detailText}>
            마지막 가까움 감지: {formatDateTime(lastNearAt)}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              disabled={proximityStatus !== "idle" || isMonitoring}
              onPress={startMonitoring}
              style={({ pressed }) => [
                styles.primaryButton,
                (proximityStatus !== "idle" || isMonitoring) &&
                  styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>모니터링 시작</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!isMonitoring}
              onPress={stopMonitoring}
              style={({ pressed }) => [
                styles.secondaryButton,
                !isMonitoring && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>모니터링 중지</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            위치와 날씨
          </Text>
          {isLocating ? (
            <View accessibilityRole="progressbar" style={styles.inlineStatus}>
              <ActivityIndicator size="small" />
              <Text style={styles.detailText}>현재 위치를 확인하고 있습니다.</Text>
            </View>
          ) : locationError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {LOCATION_ERROR_MESSAGES[locationError]}
            </Text>
          ) : location ? (
            <>
              <Text style={styles.detailText}>
                좌표: {location.latitude.toFixed(5)},{" "}
                {location.longitude.toFixed(5)}
              </Text>
              <Text style={styles.detailText}>
                정확도:{" "}
                {location.accuracyM === null
                  ? "없음"
                  : `약 ${Math.round(location.accuracyM)} m`}
              </Text>
            </>
          ) : (
            <Text style={styles.helpText}>아직 위치를 조회하지 않았습니다.</Text>
          )}

          {weatherIsPending ? (
            <View accessibilityRole="progressbar" style={styles.inlineStatus}>
              <ActivityIndicator size="small" />
              <Text style={styles.detailText}>현재 날씨를 확인하고 있습니다.</Text>
            </View>
          ) : weatherQuery.isError ? (
            <View style={styles.errorGroup}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                날씨를 가져오지 못했습니다. 위치 정보는 그대로 사용할 수
                있습니다.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void weatherQuery.refetch();
                }}
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.textButtonText}>날씨 다시 시도</Text>
              </Pressable>
            </View>
          ) : weatherQuery.data ? (
            <>
              <Text style={styles.detailText}>
                기온:{" "}
                {convertTemperature(
                  weatherQuery.data.temperatureC,
                  temperatureUnit,
                ).toFixed(1)}
                °{temperatureUnit === "celsius" ? "C" : "F"}
              </Text>
              <Text style={styles.detailText}>
                체감:{" "}
                {convertTemperature(
                  weatherQuery.data.apparentTemperatureC,
                  temperatureUnit,
                ).toFixed(1)}
                °{temperatureUnit === "celsius" ? "C" : "F"}
              </Text>
              <Text style={styles.detailText}>
                날씨 코드: {weatherQuery.data.weatherCode}
              </Text>
            </>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLocating || weatherIsPending}
            onPress={() => {
              void requestLocationAndWeather();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              (isLocating || weatherIsPending) && styles.disabledButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>위치 및 날씨 조회</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityHint="현재 값을 고정하고 기록 입력 화면으로 이동합니다"
          accessibilityRole="button"
          disabled={!canCreateObservation}
          onPress={createObservation}
          style={({ pressed }) => [
            styles.captureButton,
            !canCreateObservation && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.captureButtonText}>기록 만들기</Text>
        </Pressable>
        {captureHelpText ? (
          <Text style={styles.captureHelp}>{captureHelpText}</Text>
        ) : null}
      </ScrollView>
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
  card: {
    gap: 12,
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
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  nearBadge: {
    backgroundColor: "#FEE2E2",
  },
  farBadge: {
    backgroundColor: "#DCFCE7",
  },
  statusText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
  },
  detailText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 22,
  },
  helpText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 21,
  },
  errorGroup: {
    gap: 8,
  },
  inlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
  },
  textButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  textButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#0F172A",
  },
  captureButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  captureHelp: {
    marginTop: -8,
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.7,
  },
});
