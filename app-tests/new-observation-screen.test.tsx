import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import NewObservationScreen from "@/app/observations/new";
import { useCreateObservationMutation } from "@/src/db/observations";
import { useAppStore } from "@/src/store/app-store";
import type { CaptureContext } from "@/src/types/observation";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    Stack: {
      Screen: () => null,
    },
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
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

jest.mock("@/src/db/observations", () => ({
  useCreateObservationMutation: jest.fn(),
}));

const useCreateObservationMutationMock =
  useCreateObservationMutation as jest.MockedFunction<
    typeof useCreateObservationMutation
  >;
const mutateAsync = jest.fn();

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
  capturedAt: 1_753_000_003_000,
};

describe("NewObservationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(11);
    useCreateObservationMutationMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateObservationMutation>);
    useAppStore.setState({
      temperatureUnit: "celsius",
      captureContext,
      hasHydrated: true,
    });
  });

  it("빈 제목 제출 시 검증 오류를 표시한다", async () => {
    await render(<NewObservationScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("제목을 입력해 주세요.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("검증된 입력과 고정된 CaptureContext를 저장한다", async () => {
    await render(<NewObservationScreen />);

    await fireEvent.changeText(
      screen.getByLabelText("기록 제목"),
      "  현장 센서 확인  ",
    );
    await fireEvent.changeText(screen.getByLabelText("기록 메모"), "메모");
    await fireEvent.press(screen.getByRole("radio", { name: "환경" }));
    await fireEvent.press(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        title: "현장 센서 확인",
        note: "메모",
        category: "environment",
        captureContext,
      });
    });
    expect(useAppStore.getState().captureContext).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/records");
  });

  it("CaptureContext 없이 직접 접근하면 현재 상태로 돌아가게 안내한다", async () => {
    useAppStore.setState({ captureContext: null });

    await render(<NewObservationScreen />);

    expect(
      screen.getByText("저장할 현재 상태가 없습니다"),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "현재 상태로 이동" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });
});
