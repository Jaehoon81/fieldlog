/**
 * [파일 역할]
 * Expo Router가 가장 먼저 render하는 root layout이다. Database migration,
 * Zustand hydration과 TanStack Query provider를 route보다 먼저 준비하고,
 * 초기화 중·실패·완료 UI를 서로 다른 경계로 표현한다.
 *
 * [FLOW-01]
 * ErrorBoundary → Suspense → SQLiteProvider → HydratedRoutes
 * → QueryClientProvider → Stack 순서로 바깥 provider가 안쪽 기능을 준비한다.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
// [문법] 값 import와 `type` 전용 import를 한 문장에서 함께 가져올 수 있다.
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { DATABASE_NAME, migrateDatabase } from "@/src/db/migrate";
import { queryClient } from "@/src/query-client";
import { useAppStore } from "@/src/store/app-store";

// Error boundary component가 감쌀 descendant JSX를 `children`으로 받는다.
type InitializationErrorBoundaryProps = {
  children: ReactNode;
};

// render 중 포착한 Error가 없을 때는 null이다.
type InitializationErrorBoundaryState = {
  error: Error | null;
};

/**
 * [React]
 * Error boundary는 현재 React에서 class lifecycle로 구현한다. 아래 generic 두
 * 인자는 각각 `props`와 `state` shape이며, descendant 초기화/render 오류가
 * 앱 전체를 빈 화면으로 끝내지 않도록 fallback UI로 바꾼다.
 */
class InitializationErrorBoundary extends Component<
  InitializationErrorBoundaryProps,
  InitializationErrorBoundaryState
> {
  // class field 문법으로 첫 state를 선언한다.
  state: InitializationErrorBoundaryState = {
    error: null,
  };

  // React가 descendant error를 받으면 다음 render에 사용할 state를 계산한다.
  static getDerivedStateFromError(
    error: Error,
  ): InitializationErrorBoundaryState {
    return { error };
  }

  // UI state 반영과 별개로 개발 log에 error와 component stack을 남긴다.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FieldLog initialization failed", error, info);
  }

  // [문법] class component의 `render` 반환값이 실제 React element tree가 된다.
  render() {
    if (this.state.error) {
      return (
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>
            앱을 초기화하지 못했습니다
          </Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * [FLOW-01 / 3~4단계]
 * SQLite가 준비된 뒤 호출되며, persisted Zustand 설정의 비동기 hydration까지
 * 끝나야 실제 route와 QueryClient를 노출한다.
 */
function HydratedRoutes() {
  /**
   * [Zustand]
   * selector는 전체 store object가 아니라 `hasHydrated` 값만 반환한다.
   * 이 값이 바뀔 때 component가 다시 render되어 loading gate를 통과한다.
   */
  const hasHydrated = useAppStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View
        accessibilityLabel="설정 불러오는 중"
        accessibilityRole="progressbar"
        style={styles.centered}
      >
        <ActivityIndicator size="large" />
        <Text style={styles.message}>저장된 설정을 불러오고 있습니다.</Text>
      </View>
    );
  }

  return (
    // 모든 descendant query/mutation hook이 같은 queryClient cache를 사용한다.
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack>
        {/* `(tabs)` route 자체 header는 숨기고 각 tab screen header를 사용한다. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

// Expo Router가 `app/_layout.tsx`의 default export를 root layout으로 인식한다.
export default function RootLayout() {
  return (
    <InitializationErrorBoundary>
      {/*
       * [FLOW-01 / 1단계]
       * useSuspense를 쓰는 SQLiteProvider가 준비 Promise를 suspend하는 동안
       * 이 fallback을 표시한다.
       */}
      <Suspense
        fallback={
          <View
            accessibilityLabel="앱 초기화 중"
            accessibilityRole="progressbar"
            style={styles.centered}
          >
            <ActivityIndicator size="large" />
            <Text style={styles.message}>앱을 준비하고 있습니다.</Text>
          </View>
        }
      >
        {/*
         * [FLOW-01 / 2단계]
         * database를 열고 `migrateDatabase`가 resolve된 뒤에만 children을
         * render한다. Provider 아래의 repository hook은 useSQLiteContext로
         * 같은 connection을 가져온다.
         */}
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={migrateDatabase}
          useSuspense
        >
          <HydratedRoutes />
        </SQLiteProvider>
      </Suspense>
    </InitializationErrorBoundary>
  );
}

/**
 * [React Native]
 * `StyleSheet.create`는 JavaScript style object를 React Native가 검사·재사용할
 * 수 있는 이름별 style로 묶는다. 아래 group은 초기화 상태 화면에만 쓰인다.
 */
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  title: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "#475569",
    fontSize: 15,
    textAlign: "center",
  },
});
