import {
  partializeAppState,
  useAppStore,
} from "@/src/store/app-store";
import type { CaptureContext } from "@/src/types/observation";

jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const captureContext: CaptureContext = {
  proximity: {
    status: "near",
    distanceCm: 0,
    maxRangeCm: 5,
    observedAt: 1_753_000_000_000,
  },
  location: null,
  weather: null,
  platform: "android",
  capturedAt: 1_753_000_000_100,
};

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: false,
    });
  });

  it("온도 단위만 영속 대상으로 반환한다", () => {
    useAppStore.getState().setTemperatureUnit("fahrenheit");
    useAppStore.getState().setCaptureContext(captureContext);

    expect(partializeAppState(useAppStore.getState())).toEqual({
      temperatureUnit: "fahrenheit",
    });
  });

  it("rehydration 완료 상태를 표시한다", async () => {
    expect(useAppStore.getState().hasHydrated).toBe(false);

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().hasHydrated).toBe(true);
  });

  it("임시 CaptureContext를 제거한다", () => {
    useAppStore.getState().setCaptureContext(captureContext);
    expect(useAppStore.getState().captureContext).toEqual(captureContext);

    useAppStore.getState().clearCaptureContext();

    expect(useAppStore.getState().captureContext).toBeNull();
  });
});
