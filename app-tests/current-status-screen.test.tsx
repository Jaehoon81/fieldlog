// [파일 역할] 실제 native 기기 없이 CurrentStatusScreen의 센서 상태·버튼·비동기 위치 UI 계약을 검증합니다.
// [검증 경계] Hook과 Expo API를 mock하므로 Kotlin/Swift 센서 동작이나 실제 위치 권한을 증명하지는 않습니다.
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

// jest.fn()은 호출 횟수와 인자를 기록하는 가짜 navigation 함수입니다.
const mockPush = jest.fn();

// [라이브러리] 화면 테스트에서는 실제 Expo Router 대신 필요한 Hook의 최소 동작만 제공합니다.
jest.mock("expo-router", () => {
  // mock factory 안에서 React를 사용하려고 실제 module을 명시적으로 가져옵니다.
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    // useFocusEffect를 일반 useEffect로 바꿔 test render/unmount에서 focus lifecycle을 재현합니다.
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
    useRouter: () => ({
      push: mockPush,
    }),
  };
});

// Zustand persist가 test 중 실제 SQLite storage를 읽고 쓰지 않게 비동기 storage API를 대체합니다.
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// 이 suite에 필요한 위치 API만 mock하고 각 test에서 완료 시점을 제어합니다.
jest.mock("expo-location", () => ({
  hasServicesEnabledAsync: jest.fn(),
}));

jest.mock("@/src/hooks/use-proximity", () => ({
  useProximity: jest.fn(),
}));

jest.mock("@/src/api/weather", () => ({
  useWeatherQuery: jest.fn(),
}));

// [문법] 실제 함수 타입을 유지한 MockedFunction으로 cast하면 mock 인자/반환형도 검사됩니다.
const useProximityMock =
  useProximity as jest.MockedFunction<typeof useProximity>;
const useWeatherQueryMock =
  useWeatherQuery as jest.MockedFunction<typeof useWeatherQuery>;
const hasServicesEnabledAsyncMock =
  Location.hasServicesEnabledAsync as jest.MockedFunction<
    typeof Location.hasServicesEnabledAsync
  >;

// production 화면의 모든 상태별 기대 문구를 빠짐없이 대응시키는 test lookup입니다.
const statusLabels: Record<ProximityUiStatus, string> = {
  idle: "대기 중",
  pending: "확인 중",
  near: "가까움",
  far: "멀리 있음",
  unavailable: "지원하지 않음",
};

// 각 test가 native Hook 전체 반환 객체를 반복 작성하지 않도록 상태별 fixture를 만드는 helper입니다.
function proximityResult(status: ProximityUiStatus): UseProximityResult {
  // near/far만 실제 event payload가 있고 idle/pending/unavailable은 null입니다.
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

// describe는 관련 test들을 하나의 suite로 묶습니다.
describe("CurrentStatusScreen proximity UI", () => {
  // beforeEach는 test 간 mock 호출 기록과 전역 Zustand 상태가 섞이지 않게 기준값으로 되돌립니다.
  beforeEach(() => {
    jest.clearAllMocks();
    hasServicesEnabledAsyncMock.mockReset();
    useAppStore.setState({
      temperatureUnit: "celsius",
      captureContext: null,
      hasHydrated: true,
    });
    // 이 suite 기본 날씨 상태는 요청하지 않은 정상 대기 상태입니다.
    useWeatherQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useWeatherQuery>);
  });

  // [Jest 문법] it.each는 동일한 검증을 다섯 상태 table row마다 반복합니다.
  it.each([
    ["idle", true, "모니터링을 시작해 센서 상태를 확인해 주세요."],
    ["pending", true, "센서 상태를 확인하고 있습니다."],
    ["near", false, null],
    ["far", false, null],
    ["unavailable", false, null],
  ] as const)("%s 상태를 구분해 표시한다", async (status, disabled, helpText) => {
    useProximityMock.mockReturnValue(proximityResult(status));

    // render가 async React update를 포함할 수 있어 완료를 기다립니다.
    await render(<CurrentStatusScreen />);

    expect(screen.getByText(statusLabels[status])).toBeTruthy();
    const createButton = screen.getByRole("button", {
      name: "기록 만들기",
    });
    expect(createButton.props.accessibilityState.disabled).toBe(disabled);

    // 기대 안내가 없는 행과 정확한 안내가 있는 행을 구분합니다.
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
    // definite assignment `!`는 Promise executor가 test에서 사용하기 전에 값을 넣는다고 TS에 알립니다.
    let resolveServicesEnabled!: (enabled: boolean) => void;
    // 해결 함수를 밖에 보관해 pending 상태를 원하는 시점까지 유지하는 수동 Promise입니다.
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

    // fireEvent.press는 사용자가 accessibility role/name으로 찾은 버튼을 누른 상황을 만듭니다.
    fireEvent.press(
      screen.getByRole("button", { name: "위치 및 날씨 조회" }),
    );

    // waitFor는 React의 비동기 state update가 반영될 때까지 assertion을 재시도합니다.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "기록 만들기" }).props
          .accessibilityState.disabled,
      ).toBe(true);
    });
    expect(
      screen.getByText("위치·날씨 요청이 끝나면 기록할 수 있습니다."),
    ).toBeTruthy();

    // [라이브러리] act 안에서 Promise를 해결해 그로 인한 React update를 한 작업 단위로 flush합니다.
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

  it("오류 상태에 cached 날씨가 남아 있어도 snapshot에는 저장하지 않는다", async () => {
    useProximityMock.mockReturnValue(proximityResult("far"));
    // 실패한 refetch가 이전 data를 보존한 Query 상태를 재현합니다.
    useWeatherQueryMock.mockReturnValue({
      data: {
        temperatureC: 20,
        apparentTemperatureC: 19.5,
        weatherCode: 2,
        observedAt: 1_753_000_100_000,
      },
      isPending: false,
      isFetching: false,
      isError: true,
      isSuccess: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useWeatherQuery>);

    await render(<CurrentStatusScreen />);

    expect(screen.getByText(/날씨를 가져오지 못했습니다/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "기록 만들기" }));

    // 화면이 오류로 판정한 cached data는 CaptureContext에도 포함하지 않습니다.
    expect(useAppStore.getState().captureContext?.weather).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/observations/new");
  });
});
