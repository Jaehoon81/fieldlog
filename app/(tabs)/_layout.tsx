/**
 * [파일 역할]
 * `(tabs)` route group 아래 세 screen을 React Navigation 기반 하단 tab으로
 * 구성한다. 괄호로 감싼 group 이름은 URL segment가 아니며 화면 분류용이다.
 *
 * [FLOW-01 / 8단계]
 * Root Stack이 `(tabs)`를 열면 이 layout이 index, records, settings file을
 * 각각 현재 상태, 기록, 설정 tab으로 등록한다.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      // 모든 tab screen에 공통으로 적용되는 header와 tab bar option이다.
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
        // file `index.tsx`는 group의 기본 route `/(tabs)`가 된다.
        name="index"
        options={{
          title: "현재 상태",
          tabBarAccessibilityLabel: "현재 상태 탭",
          /**
           * [문법]
           * `tabBarIcon`은 navigation이 `color`와 `size`를 인자로 호출하는
           * render function이다. 구조 분해로 두 property만 바로 꺼낸다.
           */
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="pulse-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        // file 이름과 `name`이 일치해 `/records` route를 tab에 연결한다.
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
        // 설정 tab도 같은 group 안에 있어 tab bar와 공통 header를 유지한다.
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
