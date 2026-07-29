/**
 * [파일 역할]
 * 여러 screen이 공유하는 application state와 온도 설정 영속화를 담당한다.
 * `temperatureUnit`만 SQLite key-value storage에 저장하고, 새 기록 화면에
 * 전달하는 `captureContext`는 현재 실행의 memory에만 둔다.
 */

// [라이브러리] AsyncStorage 대신 Expo SQLite가 제공하는 key-value adapter를 쓴다.
import SQLiteStorage from "expo-sqlite/kv-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CaptureContext } from "@/src/types/observation";
import type { TemperatureUnit } from "@/src/types/weather";

/**
 * [문법]
 * Zustand store는 state 값과 그 값을 바꾸는 action을 하나의 object type으로
 * 표현한다. 각 action의 `(인자) => 반환값` 표기는 함수 type이다.
 */
export type AppStore = {
  temperatureUnit: TemperatureUnit;
  captureContext: CaptureContext | null;
  // [FLOW-01 / 관련 코드] persisted 설정 복원이 끝났는지 화면에 알리는 runtime flag다.
  hasHydrated: boolean;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setCaptureContext: (context: CaptureContext) => void;
  clearCaptureContext: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

/**
 * [문법]
 * `Pick<AppStore, "temperatureUnit">`은 큰 store type에서 영속 대상 property만
 * 골라 새 type을 만든다. 이 선언이 `captureContext`의 accidental persistence를
 * type 수준에서도 막는다.
 */
export type PersistedAppState = Pick<AppStore, "temperatureUnit">;

// [FLOW-06 / 4단계] persist middleware가 저장 직전에 호출하는 순수 함수다.
// 전체 state에서는 temperatureUnit만 영속 대상으로 고른다.
export function partializeAppState(state: AppStore): PersistedAppState {
  return {
    temperatureUnit: state.temperatureUnit,
  };
}

/**
 * [라이브러리]
 * `create<AppStore>()(...)`는 Zustand의 curried generic 문법이다. 첫 괄호는
 * store 전체 type을 고정하고, 두 번째 괄호는 persist가 만든 state creator를
 * 전달한다.
 */
export const useAppStore = create<AppStore>()(
  // [FLOW-01 / 4단계] store 생성 시 persist가 SQLite 설정 복원을 자동으로 시작한다.
  persist(
    // `set`은 Zustand가 주입하는 갱신 함수다.
    (set) => ({
      // 앱을 처음 설치했거나 아직 hydration 전일 때 사용하는 기본값이다.
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: false,
      // [문법] `{ temperatureUnit }`은 같은 이름의 key와 변수를 줄인 object shorthand다.
      // [FLOW-06 / 3단계] 설정 화면이 전달한 단위를 현재 Zustand state에 반영한다.
      setTemperatureUnit: (temperatureUnit) => set({ temperatureUnit }),
      setCaptureContext: (captureContext) => set({ captureContext }),
      clearCaptureContext: () => set({ captureContext: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      // SQLite kv-store에서 이 persisted object를 식별하는 key다.
      name: "fieldlog-settings",
      /**
       * [FLOW-06 / 5단계]
       * Zustand object를 JSON 문자열로 직렬화하고 SQLiteStorage에 읽고 쓰는
       * adapter를 만든다. Generic은 저장되는 shape를 PersistedAppState로 제한한다.
       */
      storage: createJSONStorage<PersistedAppState>(() => SQLiteStorage),
      partialize: partializeAppState,
      // [FLOW-01 / 5단계] storage 읽기가 끝나면 route gate가 구독하는 flag를 올린다.
      // [FLOW-06 / 6단계] 앱 재시작 시 저장 단위 복원이 완료됐음을 같은 callback이 알린다.
      /**
       * `() => (state) => {}`는 함수를 반환하는 고차 함수다. 바깥 함수는
       * rehydration 시작 때, 반환된 안쪽 함수는 storage 읽기가 끝난 뒤 호출된다.
       */
      onRehydrateStorage: () => (state) => {
        // [문법] optional chaining은 state가 undefined여도 예외 없이 호출을 건너뛴다.
        state?.setHasHydrated(true);
      },
    },
  ),
);
