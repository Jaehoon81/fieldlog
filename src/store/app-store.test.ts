// [파일 역할] Zustand action과 persist 정책, rehydration 완료 신호를 메모리 환경에서 검증합니다.
// [검증 경계] kv-store를 mock하므로 실제 앱 재시작이나 SQLite 파일 영속성은 이 suite의 증거가 아닙니다.
import {
  partializeAppState,
  useAppStore,
} from "@/src/store/app-store";
import type { CaptureContext } from "@/src/types/observation";

// Zustand persist가 요구하는 async storage method를 성공하는 Jest 함수로 대체합니다.
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// persist에서 제외돼야 하는 일회용 capture snapshot fixture입니다.
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
  // Zustand store는 module singleton이므로 test마다 직접 초기 상태로 돌려 독립성을 보장합니다.
  beforeEach(() => {
    useAppStore.setState({
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: false,
    });
  });

  it("온도 단위만 영속 대상으로 반환한다", () => {
    // action을 통해 영속 설정과 임시 context를 모두 바꾼 뒤 partialize 결과만 확인합니다.
    useAppStore.getState().setTemperatureUnit("fahrenheit");
    useAppStore.getState().setCaptureContext(captureContext);

    // captureContext와 hasHydrated는 빠지고 temperatureUnit만 남아야 합니다.
    expect(partializeAppState(useAppStore.getState())).toEqual({
      temperatureUnit: "fahrenheit",
    });
  });

  it("rehydration 완료 상태를 표시한다", async () => {
    expect(useAppStore.getState().hasHydrated).toBe(false);

    // persist middleware의 공개 rehydrate API가 storage 읽기와 onRehydrateStorage callback을 실행합니다.
    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().hasHydrated).toBe(true);
  });

  it("임시 CaptureContext를 제거한다", () => {
    useAppStore.getState().setCaptureContext(captureContext);
    expect(useAppStore.getState().captureContext).toEqual(captureContext);

    // clear action 호출 전후를 비교해 null로 돌아가는 일회성 계약을 검증합니다.
    useAppStore.getState().clearCaptureContext();

    expect(useAppStore.getState().captureContext).toBeNull();
  });
});
