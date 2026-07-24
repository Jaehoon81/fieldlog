import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#F8FAFC" },
        headerTitleStyle: { color: "#0F172A", fontWeight: "700" },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: { borderTopColor: "#E2E8F0" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "현재 상태",
          tabBarAccessibilityLabel: "현재 상태 탭",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="pulse-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "기록",
          tabBarAccessibilityLabel: "기록 탭",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="list-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarAccessibilityLabel: "설정 탭",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="settings-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
