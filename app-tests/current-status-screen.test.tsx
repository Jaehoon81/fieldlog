import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as Location from "expo-location";

import CurrentStatusScreen from "@/app/(tabs)";
import { useWeatherQuery } from "@/src/api/weather";
import {
  useProximity,
  type UseProximityResult,
} from "@/src/hooks/use-proximity";
import { useAppStore } from "@/src/store/app-store";
import type { ProximityUiStatus } from "@/src/types/observation";

const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
    useRouter: () => ({
      push: mockPush,
    }),
  };
});

jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("expo-location", () => ({
  hasServicesEnabledAsync: jest.fn(),
}));

jest.mock("@/src/hooks/use-proximity", () => ({
  useProximity: jest.fn(),
}));

jest.mock("@/src/api/weather", () => ({
  useWeatherQuery: jest.fn(),
}));

const useProximityMock =
  useProximity as jest.MockedFunction<typeof useProximity>;
const useWeatherQueryMock =
  useWeatherQuery as jest.MockedFunction<typeof useWeatherQuery>;
const hasServicesEnabledAsyncMock =
  Location.hasServicesEnabledAsync as jest.MockedFunction<
    typeof Location.hasServicesEnabledAsync
  >;

const statusLabels: Record<ProximityUiStatus, string> = {
  idle: "대기 중",
  pending: "확인 중",
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
};

function proximityResult(status: ProximityUiStatus): UseProximityResult {
  const event =
    status === "near" || status === "far"
      ? {
          status,
          distanceCm: status === "near" ? 0 : 5,
          maxRangeCm: 5,
          observedAt: 1_753_000_000_000,
        }
      : null;

  return {
    status,
    event,
    lastNearAt: status === "near" ? event?.observedAt ?? null : null,
    isMonitoring: status === "pending" || status === "near" || status === "far",
    checkAvailability: jest.fn().mockResolvedValue(undefined),
    startMonitoring: jest.fn().mockResolvedValue(undefined),
    stopMonitoring: jest.fn(),
  };
}

describe("CurrentStatusScreen proximity UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasServicesEnabledAsyncMock.mockReset();
    useAppStore.setState({
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: true,
    });
    useWeatherQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useWeatherQuery>);
  });

  it.each([
    ["idle", true, "모니터링을 시작해 센서 상태를 확인해 주세요."],
    ["pending", true, "센서 상태를 확인하고 있습니다."],
    ["near", false, null],
    ["far", false, null],
    ["unavailable", false, null],
  ] as const)("%s 상태를 구분해 표시한다", async (status, disabled, helpText) => {
    useProximityMock.mockReturnValue(proximityResult(status));

    await render(<CurrentStatusScreen />);

    expect(screen.getByText(statusLabels[status])).toBeTruthy();
    const createButton = screen.getByRole("button", {
      name: "기록 만들기",
    });
    expect(createButton.props.accessibilityState.disabled).toBe(disabled);

    if (helpText === null) {
      expect(
        screen.queryByText(
          /모니터링을 시작해|센서 상태를 확인하고|위치·날씨 요청이 끝나면/,
        ),
      ).toBeNull();
    } else {
      expect(screen.getByText(helpText)).toBeTruthy();
    }
  });

  it("위치·날씨 요청 중에만 완료 대기 안내를 표시한다", async () => {
    let resolveServicesEnabled!: (enabled: boolean) => void;
    hasServicesEnabledAsyncMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveServicesEnabled = resolve;
        }),
    );
    useProximityMock.mockReturnValue(proximityResult("far"));

    await render(<CurrentStatusScreen />);

    expect(
      screen.getByRole("button", { name: "기록 만들기" }).props
        .accessibilityState.disabled,
    ).toBe(false);

    fireEvent.press(
      screen.getByRole("button", { name: "위치 및 날씨 조회" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "기록 만들기" }).props
          .accessibilityState.disabled,
      ).toBe(true);
    });
    expect(
      screen.getByText("위치·날씨 요청이 끝나면 기록할 수 있습니다."),
    ).toBeTruthy();

    await act(async () => {
      resolveServicesEnabled(false);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "기록 만들기" }).props
          .accessibilityState.disabled,
      ).toBe(false);
    });
    expect(
      screen.queryByText("위치·날씨 요청이 끝나면 기록할 수 있습니다."),
    ).toBeNull();
  });
});
