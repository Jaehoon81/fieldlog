import { act, renderHook } from "@testing-library/react-native";
import * as React from "react";

import ProximitySensor from "@/modules/proximity-sensor";
import { useProximity } from "@/src/hooks/use-proximity";
import type { ProximityEvent } from "@/src/types/observation";

const isAvailableAsyncMock =
  ProximitySensor.isAvailableAsync as jest.MockedFunction<
    typeof ProximitySensor.isAvailableAsync
  >;
const addListenerMock = ProximitySensor.addListener as jest.Mock;

describe("useProximity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("지원 여부 확인 중 pending에서 unavailable로 전이한다", async () => {
    isAvailableAsyncMock.mockResolvedValue(false);
    const { result } = await renderHook(() => useProximity());

    expect(result.current.status).toBe("pending");

    await act(async () => {
      await result.current.checkAvailability();
    });

    expect(result.current.status).toBe("unavailable");
    expect(result.current.isMonitoring).toBe(false);
  });

  it("effect가 다시 실행된 뒤에도 지원 여부 확인 결과를 반영한다", async () => {
    let lifecycleEffect: React.EffectCallback | null = null;
    let replayUseProximity!: typeof useProximity;
    let replayProximitySensor!: typeof ProximitySensor;
    const actualUseEffect = React.useEffect;

    jest.doMock("react", () => ({
      ...React,
      useEffect: (
        effect: React.EffectCallback,
        dependencies?: React.DependencyList,
      ) => {
        if (dependencies?.length === 0) {
          lifecycleEffect = effect;
        }

        return actualUseEffect(effect, dependencies);
      },
    }));

    try {
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
      const cleanup = replayEffect?.();
      cleanup?.();
      replayEffect?.();

      await act(async () => {
        await result.current.checkAvailability();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.isMonitoring).toBe(false);
    } finally {
      jest.dontMock("react");
    }
  });

  it("near와 far event를 반영하고 마지막 near 시각을 유지한다", async () => {
    const remove = jest.fn();
    let emit: ((event: ProximityEvent) => void) | null = null;
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

    const nearEvent: ProximityEvent = {
      status: "near",
      distanceCm: 0,
      maxRangeCm: 5,
      observedAt: 1_753_000_000_000,
    };
    await act(() => {
      emit?.(nearEvent);
    });

    expect(result.current.status).toBe("near");
    expect(result.current.event).toEqual(nearEvent);
    expect(result.current.lastNearAt).toBe(nearEvent.observedAt);

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

  it("unmount 시 활성 listener를 제거한다", async () => {
    const remove = jest.fn();
    isAvailableAsyncMock.mockResolvedValue(true);
    addListenerMock.mockReturnValue({ remove });
    const { result, unmount } = await renderHook(() => useProximity());

    await act(async () => {
      await result.current.startMonitoring();
    });
    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
