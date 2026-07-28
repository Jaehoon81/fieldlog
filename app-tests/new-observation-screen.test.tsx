// [파일 역할] 새 기록 화면의 Zod 검증, mutation 입력, 임시 CaptureContext 정리와 route 이동을 검증합니다.
// [검증 경계] DB Hook은 mock이므로 실제 INSERT가 아니라 화면이 올바른 입력을 전달하는 계약을 확인합니다.
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

// navigation 함수들을 spy로 두어 어느 route가 호출됐는지 인자로 검증합니다.
const mockReplace = jest.fn();
const mockBack = jest.fn();

// 실제 navigation container 없이 화면이 요구하는 Stack/useFocusEffect/useRouter만 제공합니다.
jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    // Stack.Screen은 header 설정만 담당하므로 test renderer에서는 아무것도 그리지 않습니다.
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

// persist storage의 외부 I/O를 제거해 test를 메모리 안에서 결정적으로 실행합니다.
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// 화면 아래 DB repository 대신 mutation Hook 반환값만 test가 제어합니다.
jest.mock("@/src/db/observations", () => ({
  useCreateObservationMutation: jest.fn(),
}));

// 실제 Hook signature를 보존하는 typed Jest mock입니다.
const useCreateObservationMutationMock =
  useCreateObservationMutation as jest.MockedFunction<
    typeof useCreateObservationMutation
  >;
const mutateAsync = jest.fn();

// 홈 화면이 미리 고정했다고 가정하는 재사용 가능한 입력 fixture입니다.
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
  // 각 test는 mock 기록, 성공 mutation, 유효한 임시 context라는 같은 출발점에서 시작합니다.
  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(11);
    // TanStack Query 전체 객체 대신 화면이 실제 읽는 세 속성만 만들고 실제 반환 타입으로 cast합니다.
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

    // findByText는 submit 후 비동기로 나타나는 resolver 오류 문구를 기다립니다.
    expect(await screen.findByText("제목을 입력해 주세요.")).toBeTruthy();
    // validation 실패 시 DB mutation 경계까지 값이 내려가면 안 됩니다.
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("검증된 입력과 고정된 CaptureContext를 저장한다", async () => {
    await render(<NewObservationScreen />);

    // 사용자가 앞뒤 공백이 있는 제목, 메모, 환경 category를 입력하는 전체 form 상호작용입니다.
    await fireEvent.changeText(
      screen.getByLabelText("기록 제목"),
      "  현장 센서 확인  ",
    );
    await fireEvent.changeText(screen.getByLabelText("기록 메모"), "메모");
    await fireEvent.press(screen.getByRole("radio", { name: "환경" }));
    await fireEvent.press(screen.getByRole("button", { name: "저장" }));

    // Zod trim이 적용된 제출 객체와 원래 고정 snapshot이 함께 전달될 때까지 기다립니다.
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        title: "현장 센서 확인",
        note: "메모",
        category: "environment",
        captureContext,
      });
    });
    // 저장 성공 뒤 임시 context 정리와 records route replace까지 FLOW-04 마지막 단계를 확인합니다.
    expect(useAppStore.getState().captureContext).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/records");
  });

  it("CaptureContext 없이 직접 접근하면 현재 상태로 돌아가게 안내한다", async () => {
    // deep link처럼 context 없이 직접 진입한 방어 경로를 만듭니다.
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
