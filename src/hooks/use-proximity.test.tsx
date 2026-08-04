// [파일 역할] useProximity의 비동기 상태 전이, event 반영과 listener cleanup을 React Hook 수준에서 검증합니다.
// [검증 경계] 전역 Jest setup의 native module mock을 사용하므로 실제 Android/iOS 센서 등록은 검증하지 않습니다.
import { act, renderHook } from "@testing-library/react-native";
import * as React from "react";

import ProximitySensor from "@/modules/proximity-sensor";
import { useProximity } from "@/src/hooks/use-proximity";
import type { ProximityEvent } from "@/src/types/observation";

// 실제 module method 타입을 유지하는 mock으로 Promise<boolean> 반환과 호출을 제어합니다.
const isAvailableAsyncMock =
  ProximitySensor.isAvailableAsync as jest.MockedFunction<
    typeof ProximitySensor.isAvailableAsync
  >;
const addListenerMock = ProximitySensor.addListener as jest.Mock;

describe("useProximity", () => {
  // 각 test의 호출 기록과 순차 mock 응답을 분리합니다.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("지원 여부 확인 중 pending에서 unavailable로 전이한다", async () => {
    isAvailableAsyncMock.mockResolvedValue(false);
    // renderHook의 result.current가 현재 Hook 반환 객체이며 state update 후 최신 값으로 바뀝니다.
    const { result } = await renderHook(() => useProximity());

    expect(result.current.status).toBe("pending");

    // act가 비동기 state update를 test renderer에 모두 반영한 뒤 assertion을 실행하게 합니다.
    await act(async () => {
      await result.current.checkAvailability();
    });

    expect(result.current.status).toBe("unavailable");
    expect(result.current.isMonitoring).toBe(false);
  });

  it("effect가 다시 실행된 뒤에도 지원 여부 확인 결과를 반영한다", async () => {
    // React Strict Mode처럼 effect cleanup 후 재실행되는 lifecycle을 관찰할 변수들입니다.
    let lifecycleEffect: React.EffectCallback | null = null;
    // definite assignment `!`는 isolateModules callback에서 반드시 대입한다고 TypeScript에 알립니다.
    let replayUseProximity!: typeof useProximity;
    let replayProximitySensor!: typeof ProximitySensor;
    const actualUseEffect = React.useEffect;

    // 이 test에 한해 useEffect를 감싸 빈 dependency lifecycle effect를 포착합니다.
    jest.doMock("react", () => ({
      ...React,
      useEffect: (
        effect: React.EffectCallback,
        dependencies?: React.DependencyList,
      ) => {
        // optional chaining으로 dependencies가 있을 때만 길이를 읽습니다.
        if (dependencies?.length === 0) {
          lifecycleEffect = effect;
        }

        return actualUseEffect(effect, dependencies);
      },
    }));

    try {
      // isolateModules는 module cache가 없는 별도 registry에서 Hook을 다시 import합니다.
      jest.isolateModules(() => {
        replayUseProximity = jest.requireActual<
          typeof import("@/src/hooks/use-proximity")
        >("@/src/hooks/use-proximity").useProximity;
        replayProximitySensor = jest.requireMock(
          "@/modules/proximity-sensor",
        ).default;
      });

      const replayIsAvailableAsync = replayProximitySensor
        .isAvailableAsync as jest.MockedFunction<
        typeof ProximitySensor.isAvailableAsync
      >;
      replayIsAvailableAsync.mockResolvedValue(true);

      const { result } = await renderHook(() => replayUseProximity());
      const replayEffect = lifecycleEffect as React.EffectCallback | null;

      expect(replayEffect).not.toBeNull();
      // effect 실행 → cleanup → 재실행 순서로 Strict Mode의 개발 환경 replay를 수동 재현합니다.
      const cleanup = replayEffect?.();
      cleanup?.();
      replayEffect?.();

      await act(async () => {
        await result.current.checkAvailability();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.isMonitoring).toBe(false);
    } finally {
      // assertion 실패 여부와 관계없이 임시 React mock을 해제해 다음 test 오염을 막습니다.
      jest.dontMock("react");
    }
  });

  it("near와 far event를 반영하고 마지막 near 시각을 유지한다", async () => {
    const remove = jest.fn();
    // native addListener가 받은 callback을 밖에서 호출할 수 있도록 보관합니다.
    let emit: ((event: ProximityEvent) => void) | null = null;
    // 첫 true는 시작 전 hardware 확인, 둘째 true는 listener 등록 후 성공 확인입니다.
    isAvailableAsyncMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    addListenerMock.mockImplementation(
      (_eventName: string, listener: (event: ProximityEvent) => void) => {
        emit = listener;
        return { remove };
      },
    );
    const { result } = await renderHook(() => useProximity());

    await act(async () => {
      await result.current.startMonitoring();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.isMonitoring).toBe(true);

    // 실제 native payload와 같은 near event fixture입니다.
    const nearEvent: ProximityEvent = {
      status: "near",
      distanceCm: 0,
      maxRangeCm: 5,
      observedAt: 1_753_000_000_000,
    };
    // optional call `emit?.(...)`은 listener가 보관된 경우에만 event를 전달합니다.
    await act(() => {
      emit?.(nearEvent);
    });

    expect(result.current.status).toBe("near");
    expect(result.current.event).toEqual(nearEvent);
    expect(result.current.lastNearAt).toBe(nearEvent.observedAt);

    // far로 바뀌어도 lastNearAt이 직전 near 시각을 유지하는지 검증합니다.
    const farEvent: ProximityEvent = {
      status: "far",
      distanceCm: 5,
      maxRangeCm: 5,
      observedAt: 1_753_000_001_000,
    };
    await act(() => {
      emit?.(farEvent);
    });

    expect(result.current.status).toBe("far");
    expect(result.current.lastNearAt).toBe(nearEvent.observedAt);

    await act(() => {
      result.current.stopMonitoring();
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("idle");
    expect(result.current.event).toBeNull();
    expect(result.current.isMonitoring).toBe(false);
  });

  it("native listener 등록 실패를 unavailable로 처리한다", async () => {
    const remove = jest.fn();
    // hardware는 있지만 listener 등록 후 확인이 false인 native failure 경로입니다.
    isAvailableAsyncMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    addListenerMock.mockReturnValue({ remove });
    const { result } = await renderHook(() => useProximity());

    await act(async () => {
      await result.current.startMonitoring();
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("unavailable");
    expect(result.current.isMonitoring).toBe(false);
  });

  it("늦게 끝난 이전 start가 새 listener를 제거하지 않는다", async () => {
    const firstRemove = jest.fn();
    const secondRemove = jest.fn();

    // 첫 start의 listener 등록 후 확인만 대기 상태로 만들어 경쟁 조건을 재현합니다.
    let resolveFirstRegistration!: (value: boolean) => void;
    const firstRegistration = new Promise<boolean>((resolve) => {
      resolveFirstRegistration = resolve;
    });

    // 첫 listener가 실제로 만들어진 시점까지 기다리기 위한 test 신호입니다.
    let markFirstListenerAdded!: () => void;
    const firstListenerAdded = new Promise<void>((resolve) => {
      markFirstListenerAdded = resolve;
    });

    // 첫 두 응답은 이전 start, 다음 두 응답은 새 start의 사전·사후 확인입니다.
    isAvailableAsyncMock
      .mockResolvedValueOnce(true)
      .mockReturnValueOnce(firstRegistration)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    addListenerMock
      .mockImplementationOnce(() => {
        markFirstListenerAdded();
        return { remove: firstRemove };
      })
      .mockReturnValueOnce({ remove: secondRemove });

    const { result } = await renderHook(() => useProximity());
    let firstStart!: Promise<void>;

    await act(async () => {
      firstStart = result.current.startMonitoring();
      await firstListenerAdded;
    });

    expect(result.current.isMonitoring).toBe(true);

    // [FLOW-02 / 14-A단계] 첫 구독을 중지한 뒤 두 번째 monitoring을 시작합니다.
    await act(() => {
      result.current.stopMonitoring();
    });
    expect(firstRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.startMonitoring();
    });
    expect(result.current.isMonitoring).toBe(true);

    // 이전 start의 응답이 늦게 도착해도 현재 두 번째 구독을 제거하면 안 됩니다.
    await act(async () => {
      resolveFirstRegistration(true);
      await firstStart;
    });

    expect(secondRemove).not.toHaveBeenCalled();
    expect(result.current.isMonitoring).toBe(true);

    // 현재 구독은 정상적인 stop에서 FLOW-02의 마지막 listener 제거 경로로 들어갑니다.
    await act(() => {
      result.current.stopMonitoring();
    });
    expect(secondRemove).toHaveBeenCalledTimes(1);
  });

  it("unmount 시 활성 listener를 제거한다", async () => {
    const remove = jest.fn();
    isAvailableAsyncMock.mockResolvedValue(true);
    addListenerMock.mockReturnValue({ remove });
    // unmount 함수로 화면 제거 시 useEffect cleanup을 직접 실행합니다.
    const { result, unmount } = await renderHook(() => useProximity());

    await act(async () => {
      await result.current.startMonitoring();
    });
    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
