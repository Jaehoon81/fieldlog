import { QueryClientProvider } from "@tanstack/react-query";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { DATABASE_NAME, migrateDatabase } from "@/src/db/migrate";
import { queryClient } from "@/src/query-client";
import { useAppStore } from "@/src/store/app-store";

type InitializationErrorBoundaryProps = {
  children: ReactNode;
};

type InitializationErrorBoundaryState = {
  error: Error | null;
};

class InitializationErrorBoundary extends Component<
  InitializationErrorBoundaryProps,
  InitializationErrorBoundaryState
> {
  state: InitializationErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(
    error: Error,
  ): InitializationErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FieldLog initialization failed", error, info);
  }

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

function HydratedRoutes() {
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
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <InitializationErrorBoundary>
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
