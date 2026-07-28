// [파일 역할] 첫 번째 탭 화면입니다. 근접 센서·현재 위치·날씨를 모아 하나의 임시 CaptureContext를 만듭니다.
// [FLOW-02, FLOW-03, FLOW-04 / 1~3단계] 세 기능 흐름이 만나는 화면이므로 아래 FLOW 표식을 순서대로 따라가면 됩니다.
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

// [문법] 문자열 리터럴 union은 아래 네 값 외의 오타가 상태에 들어가는 것을 막습니다.
type LocationErrorKind =
  | "permission-denied"
  | "permission-blocked"
  | "services-disabled"
  | "unavailable";

// [문법] Record<K, V>는 ProximityUiStatus의 모든 key마다 string 문구가 있어야 함을 검사합니다.
const STATUS_LABELS: Record<ProximityUiStatus, string> = {
  idle: "대기 중",
  pending: "확인 중",
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
};

// 위치 실패 원인과 사용자 문구를 분리해 렌더 분기를 짧게 유지합니다.
const LOCATION_ERROR_MESSAGES: Record<LocationErrorKind, string> = {
  "permission-denied": "위치 권한이 허용되지 않았습니다.",
  "permission-blocked":
    "위치 권한을 다시 요청할 수 없습니다. 기기 설정에서 권한을 확인해 주세요.",
  "services-disabled": "기기의 위치 서비스가 꺼져 있습니다.",
  unavailable: "현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

// nullable 숫자 시각을 화면 표시용 한국 날짜 문자열로 바꾸는 작은 순수 함수입니다.
function formatDateTime(value: number | null): string {
  return value === null ? "없음" : new Date(value).toLocaleString("ko-KR");
}

export default function CurrentStatusScreen() {
  // [라이브러리] useRouter가 반환한 router는 파일 기반 route로 push/back/replace할 수 있습니다.
  const router = useRouter();
  // [문법] Hook 결과 객체를 구조 분해합니다. 이름 충돌을 피하려고 startMonitoring만 beginMonitoring으로 별칭 지정합니다.
  const {
    status: proximityStatus,
    event: proximityEvent,
    lastNearAt,
    isMonitoring,
    checkAvailability,
    startMonitoring: beginMonitoring,
    stopMonitoring,
  } = useProximity();
  // [라이브러리] Zustand selector는 필요한 store 조각만 구독하여 관련 값이 바뀔 때만 재렌더합니다.
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);
  const setCaptureContext = useAppStore((state) => state.setCaptureContext);
  // 위치·위치 오류·진행 여부는 이 화면 안에서만 필요한 지역 state입니다.
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [locationError, setLocationError] =
    useState<LocationErrorKind | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  // [FLOW-03 / 4단계] 위치 전체 객체 중 날씨 query key와 요청에 필요한 좌표만 파생합니다.
  // useMemo는 location 참조가 같으면 같은 결과 객체를 재사용해 불필요한 query key 변화를 피합니다.
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
  // coordinates가 null이면 Query는 비활성이고, 좌표가 생기는 순간 Open-Meteo 조회가 시작됩니다.
  const weatherQuery = useWeatherQuery(coordinates);

  // [FLOW-02 / 1, 7단계] 이 탭에 focus될 때 센서 지원 여부를 확인하고 focus를 잃을 때 monitoring을 중지합니다.
  useFocusEffect(
    useCallback(() => {
      // 이벤트 handler는 Promise를 기다릴 곳이 없으므로 `void`로 의도적으로 반환값을 버립니다.
      void checkAvailability();

      // useFocusEffect callback이 반환한 함수는 blur 또는 unmount 시 cleanup으로 호출됩니다.
      return stopMonitoring;
    }, [checkAvailability, stopMonitoring]),
  );

  // [FLOW-03 / 1~3단계] 버튼 한 번으로 service → permission → 현재 좌표를 순차 확인합니다.
  const requestLocationAndWeather = useCallback(async () => {
    // 새 요청이 시작되면 이전 성공값과 오류를 지워 화면 상태를 이번 요청 기준으로 맞춥니다.
    setLocation(null);
    setLocationError(null);
    setIsLocating(true);

    try {
      // [라이브러리] expo-location으로 기기 전체 위치 서비스가 켜져 있는지 먼저 확인합니다.
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationError("services-disabled");
        return;
      }

      // [문법] 이후 재요청 결과를 다시 대입하므로 const가 아니라 let을 사용합니다.
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        // canAskAgain이 false이면 앱에서 재요청해도 시스템 prompt가 열리지 않으므로 설정 안내로 끝냅니다.
        if (!permission.canAskAgain) {
          setLocationError("permission-blocked");
          return;
        }

        // 아직 요청 가능한 경우에만 foreground 권한 prompt를 띄웁니다.
        permission = await Location.requestForegroundPermissionsAsync();
      }

      // 사용자가 방금 거절했는지 영구 차단했는지를 canAskAgain으로 나누어 기록합니다.
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationError(
          permission.canAskAgain ? "permission-denied" : "permission-blocked",
        );
        return;
      }

      // [FLOW-03 / 3단계] 권한이 있을 때만 현재 좌표를 한 번 요청합니다.
      const position = await Location.getCurrentPositionAsync({
        // Balanced는 최고 정밀도보다 배터리·응답 시간 부담을 낮춘 위치 정확도 옵션입니다.
        accuracy: Location.Accuracy.Balanced,
      });

      // 외부 라이브러리 결과에서 앱이 보존할 필드만 LocationSnapshot으로 복사합니다.
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        observedAt: position.timestamp,
      });
    } catch {
      // service/permission 이외의 native 위치 오류는 하나의 재시도 가능한 상태로 표시합니다.
      setLocationError("unavailable");
    } finally {
      // [문법] finally는 성공·return·예외 어느 경로에서도 실행되므로 loading을 반드시 종료합니다.
      setIsLocating(false);
    }
  }, []);

  // [FLOW-02 / 2단계] 플랫폼 차이를 사용자에게 알린 뒤 실제 Hook 함수를 호출합니다.
  const startMonitoring = useCallback(() => {
    // Android는 별도 경고 없이 즉시 시작합니다.
    if (Platform.OS !== "ios") {
      void beginMonitoring();
      return;
    }

    // [주의] iOS 근접 monitoring은 화면을 꺼뜨릴 수 있으므로 명시적인 확인 Alert를 먼저 보여 줍니다.
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

  // 좌표가 실제로 있는 요청의 pending/fetching만 날씨 진행 상태로 취급합니다.
  const weatherIsPending =
    coordinates !== null &&
    (weatherQuery.isPending || weatherQuery.isFetching);
  // [FLOW-04 / 1단계] 센서 결과가 확정되고 위치·날씨 작업이 끝난 순간에만 snapshot을 고정할 수 있습니다.
  const canCreateObservation =
    (proximityStatus === "near" ||
      proximityStatus === "far" ||
      proximityStatus === "unavailable") &&
    !isLocating &&
    !weatherIsPending;
  // [문법] 중첩 삼항식으로 비활성 원인을 현재 센서 단계에 맞는 안내 문구로 바꿉니다.
  const captureHelpText = canCreateObservation
    ? null
    : proximityStatus === "idle"
      ? "모니터링을 시작해 센서 상태를 확인해 주세요."
      : proximityStatus === "pending"
        ? "센서 상태를 확인하고 있습니다."
        : "위치·날씨 요청이 끝나면 기록할 수 있습니다.";

  // [FLOW-04 / 1~3단계] 현재 표시값을 불변 snapshot으로 복사하고 작성 route로 이동합니다.
  const createObservation = useCallback(() => {
    // disabled UI와 별개로 함수 안에서도 조건을 확인하는 방어 절입니다.
    if (!canCreateObservation) {
      return;
    }

    // 아래 if/else 각 분기에서 값을 넣기 때문에 재대입 가능한 let으로 선언합니다.
    let proximitySnapshot: ProximitySnapshot;

    // 센서 미지원 또는 이벤트가 없으면 거리·시각이 없는 명시적 unavailable snapshot을 만듭니다.
    if (proximityStatus === "unavailable" || proximityEvent === null) {
      proximitySnapshot = {
        status: "unavailable",
        distanceCm: null,
        maxRangeCm: null,
        observedAt: null,
      };
    } else {
      // 이벤트 객체를 펼쳐 새 객체로 복사하므로 이후 이벤트가 현재 캡처값을 바꾸지 않습니다.
      proximitySnapshot = { ...proximityEvent };
    }

    // [FLOW-04 / 2단계] 센서·위치·날씨·플랫폼·캡처 시각을 Zustand의 임시 context에 한 번에 저장합니다.
    setCaptureContext({
      proximity: proximitySnapshot,
      location,
      // 날씨 요청이 실패했거나 없으면 undefined 대신 도메인 계약의 null로 통일합니다.
      weather: weatherQuery.data ?? null,
      // Platform.OS는 더 많은 값일 수 있으므로 이 앱의 지원 union인 ios/android로 좁힙니다.
      platform: Platform.OS === "ios" ? "ios" : "android",
      capturedAt: Date.now(),
    });
    // [FLOW-04 / 3단계] 새 기록 화면이 방금 store에 넣은 captureContext를 읽습니다.
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
    // SafeAreaView는 기기 하단 home indicator 영역과 내용이 겹치지 않게 합니다.
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
            // 접근성 도구에는 색만이 아니라 현재 상태 문구까지 하나의 label로 전달합니다.
            accessibilityLabel={`근접 센서 상태 ${STATUS_LABELS[proximityStatus]}`}
            // [문법] 스타일 배열의 false 값은 무시되므로 near/far일 때만 해당 색을 추가합니다.
            style={[
              styles.statusBadge,
              proximityStatus === "near" && styles.nearBadge,
              proximityStatus === "far" && styles.farBadge,
            ]}
          >
            {/* pending일 때만 작은 진행 indicator를 조건부 렌더링합니다. */}
            {proximityStatus === "pending" ? (
              <ActivityIndicator color="#475569" size="small" />
            ) : null}
            <Text style={styles.statusText}>
              {STATUS_LABELS[proximityStatus]}
            </Text>
          </View>

          {/* Android는 거리값을 제공하지만 iOS API는 근접 여부만 제공하므로 UI도 분기합니다. */}
          {Platform.OS === "android" ? (
            <>
              <Text style={styles.detailText}>
                거리:{" "}
                {/* optional chaining 결과가 null 또는 undefined인 두 경우를 모두 '없음'으로 표시합니다. */}
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
              // Pressable의 style 함수는 누르는 동안 pressed=true를 받아 즉각적인 시각 피드백을 더합니다.
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
          {/* [FLOW-03 / 7단계] 위치는 loading → 원인별 error → success → 미요청 순으로 한 분기만 표시합니다. */}
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

          {/* 날씨 실패는 위치 성공과 별개입니다. 오류여도 위치 정보와 재시도 버튼을 유지합니다. */}
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
                  // refetch Promise는 버튼 handler가 반환할 필요가 없어 의도적으로 void 처리합니다.
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
                {/* [FLOW-06 / 5단계] API·DB의 섭씨 원본은 두고 표시할 때만 설정 단위로 변환합니다. */}
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
            // 위치 또는 뒤이어 시작된 날씨 요청 중에는 중복 요청 버튼을 잠급니다.
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
          // disabled와 accessibilityHint가 현재 값을 언제 고정할 수 있는지 사용자와 보조기기에 알려 줍니다.
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

// [라이브러리] StyleSheet.create가 화면별 React Native 스타일을 타입 검사합니다.
// 레이아웃·색·타이포그래피 속성은 반복 설명 대신 의미 단위(card/button/status)로 묶어 읽습니다.
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
