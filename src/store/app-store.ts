import SQLiteStorage from "expo-sqlite/kv-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CaptureContext } from "@/src/types/observation";
import type { TemperatureUnit } from "@/src/types/weather";

export type AppStore = {
  temperatureUnit: TemperatureUnit;
  captureContext: CaptureContext | null;
  hasHydrated: boolean;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setCaptureContext: (context: CaptureContext) => void;
  clearCaptureContext: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export type PersistedAppState = Pick<AppStore, "temperatureUnit">;

export function partializeAppState(state: AppStore): PersistedAppState {
  return {
    temperatureUnit: state.temperatureUnit,
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: false,
      setTemperatureUnit: (temperatureUnit) => set({ temperatureUnit }),
      setCaptureContext: (captureContext) => set({ captureContext }),
      clearCaptureContext: () => set({ captureContext: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "fieldlog-settings",
      storage: createJSONStorage<PersistedAppState>(() => SQLiteStorage),
      partialize: partializeAppState,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
