import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStore } from "@/src/store/app-store";
import type { TemperatureUnit } from "@/src/types/weather";

const TEMPERATURE_UNITS: {
  value: TemperatureUnit;
  label: string;
  description: string;
}[] = [
  { value: "celsius", label: "섭씨", description: "°C" },
  { value: "fahrenheit", label: "화씨", description: "°F" },
];

export default function SettingsScreen() {
  const temperatureUnit = useAppStore((state) => state.temperatureUnit);
  const setTemperatureUnit = useAppStore(
    (state) => state.setTemperatureUnit,
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            온도 표시 단위
          </Text>
          <View
            accessibilityLabel="온도 표시 단위"
            accessibilityRole="radiogroup"
            style={styles.segmentedGroup}
          >
            {TEMPERATURE_UNITS.map((unit) => {
              const isSelected = temperatureUnit === unit.value;

              return (
                <Pressable
                  accessibilityLabel={`${unit.label} ${unit.description}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={unit.value}
                  onPress={() => setTemperatureUnit(unit.value)}
                  style={({ pressed }) => [
                    styles.segment,
                    isSelected && styles.selectedSegment,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      isSelected && styles.selectedSegmentText,
                    ]}
                  >
                    {unit.label}
                  </Text>
                  <Text
                    style={[
                      styles.segmentDescription,
                      isSelected && styles.selectedSegmentText,
                    ]}
                  >
                    {unit.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helpText}>
            날씨는 섭씨로 저장하며 화면에 표시할 때 선택한 단위로 변환합니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            날씨 데이터
          </Text>
          <Text style={styles.bodyText}>
            Weather data by Open-Meteo.com
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL("https://open-meteo.com/");
            }}
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.linkText}>Open-Meteo 웹사이트 열기</Text>
          </Pressable>
          <Text style={styles.helpText}>
            FieldLog는 비상업 학습용 샘플이며 상업적 서비스로 제공하지
            않습니다.
          </Text>
        </View>
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
    gap: 14,
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
  segmentedGroup: {
    flexDirection: "row",
    gap: 10,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: 14,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  selectedSegment: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  segmentLabel: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
  },
  segmentDescription: {
    color: "#64748B",
    fontSize: 13,
  },
  selectedSegmentText: {
    color: "#1D4ED8",
  },
  bodyText: {
    color: "#334155",
    fontSize: 15,
  },
  helpText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  linkText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.7,
  },
});
