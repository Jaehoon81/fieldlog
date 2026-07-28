// [파일 역할] React 화면과 네이티브 근접 센서 사이의 구독 수명주기와 UI 상태를 관리합니다.
// [FLOW-02] 지원 확인 → 이벤트 구독 → 상태 반영 → 구독 해제의 JS Hook 경계를 책임집니다.
import { useCallback, useEffect, useRef, useState } from "react";

import ProximitySensor from "@/modules/proximity-sensor";
import type {
  ProximityEvent,
  ProximityUiStatus,
} from "@/src/types/observation";

// [문법] export type으로 내보내면 테스트와 화면도 같은 상태 모양을 재사용할 수 있습니다.
export type ProximityState = {
  status: ProximityUiStatus;
  event: ProximityEvent | null;
  // near 이벤트가 마지막으로 발생한 시각은 이후 far 이벤트가 와도 보존합니다.
  lastNearAt: number | null;
};

// [문법] 교차 타입(`&`)은 ProximityState의 필드와 아래 제어 API를 모두 가진 결과를 만듭니다.
export type UseProximityResult = ProximityState & {
  isMonitoring: boolean;
  // `() => Promise<void>`는 인자 없이 호출하고 비동기로 끝나며 별도 완료값은 없는 함수 타입입니다.
  checkAvailability: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
};

// [이유] 첫 렌더의 기준값을 컴포넌트 밖에 두어 렌더마다 같은 초기 객체를 다시 선언하지 않습니다.
const INITIAL_STATE: ProximityState = {
  status: "pending",
  event: null,
  lastNearAt: null,
};

// [문법] ReturnType<typeof 함수>는 함수의 실제 반환 타입을 추출하는 TypeScript 유틸리티 타입입니다.
type ProximitySubscription = ReturnType<typeof ProximitySensor.addListener>;

// [이유] 이벤트 적용 규칙을 순수 함수로 분리해 React와 네이티브 환경 없이 테스트합니다.
export function applyProximityEvent(
  state: ProximityState,
  event: ProximityEvent,
): ProximityState {
  return {
    status: event.status,
    event,
    // [FLOW-02 / 6단계] near이면 현재 이벤트 시각, 아니면 직전 near 시각을 유지합니다.
    lastNearAt:
      event.status === "near" ? event.observedAt : state.lastNearAt,
  };
}

export function useProximity(): UseProximityResult {
  // [라이브러리] useState는 상태값과 상태 변경 함수(setter)를 한 쌍으로 반환합니다.
  const [state, setState] = useState<ProximityState>(INITIAL_STATE);
  const [isMonitoring, setIsMonitoring] = useState(false);
  // [라이브러리] useRef의 `.current`는 렌더 사이에 유지되지만 변경만으로 재렌더하지 않습니다.
  // UI 값이 아닌 실제 구독 객체와 비동기 제어 번호를 보관하기에 적합합니다.
  const subscriptionRef = useRef<ProximitySubscription | null>(null);
  // 새 비동기 작업마다 번호를 올려 늦게 도착한 과거 응답을 구별합니다.
  const operationRef = useRef(0);
  // 화면이 사라진 뒤 Promise가 setState를 호출하지 못하게 하는 생존 플래그입니다.
  const mountedRef = useRef(true);

  // [라이브러리] useCallback은 의존성이 같으면 같은 함수 참조를 재사용합니다.
  const removeSubscription = useCallback(() => {
    // [문법] `?.`는 구독 객체가 있을 때만 remove()를 호출합니다.
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsMonitoring(false);
  }, []);

  // [FLOW-02 / 1단계] 화면 focus 시 기기에 지원되는 센서인지 네이티브 모듈에 묻습니다.
  const checkAvailability = useCallback(async () => {
    // 이미 구독 중이면 재확인이 현재 센서 상태를 덮어쓰지 않도록 즉시 끝냅니다.
    if (subscriptionRef.current) {
      return;
    }

    // [문법] 전위 증가 `++value`는 먼저 값을 1 올린 뒤 그 새 값을 대입합니다.
    const operation = ++operationRef.current;
    // 함수형 setter는 가장 최신 current를 받아 새 객체를 만들므로 오래된 클로저 문제를 피합니다.
    setState((current) => ({
      // 스프레드는 lastNearAt 등 기존 필드를 복사하고 뒤의 두 필드만 덮어씁니다.
      ...current,
      status: "pending",
      event: null,
    }));

    try {
      const isAvailable = await ProximitySensor.isAvailableAsync();

      // 화면이 사라졌거나 더 최신 작업이 시작됐다면 이 응답은 폐기합니다.
      if (!mountedRef.current || operation !== operationRef.current) {
        return;
      }

      setState((current) => ({
        ...current,
        // [문법] 삼항 연산자로 boolean을 UI 상태 리터럴로 변환합니다.
        status: isAvailable ? "idle" : "unavailable",
        event: null,
      }));
    } catch {
      // 네이티브 호출이 실패해도 앱을 중단하지 않고 지원 불가 상태로 수렴시킵니다.
      if (mountedRef.current && operation === operationRef.current) {
        setState((current) => ({
          ...current,
          status: "unavailable",
          event: null,
        }));
      }
    }
  }, []);

  // [FLOW-02 / 7단계] 사용자가 중지하거나 화면이 포커스를 잃을 때 구독을 정리합니다.
  const stopMonitoring = useCallback(() => {
    // 진행 중인 availability Promise가 뒤늦게 돌아와도 무효가 되도록 번호를 바꿉니다.
    operationRef.current += 1;
    removeSubscription();
    setState((current) => ({
      ...current,
      // 센서 자체가 unavailable이면 유지하고, 그 외 상태만 대기로 되돌립니다.
      status: current.status === "unavailable" ? "unavailable" : "idle",
      event: null,
    }));
  }, [removeSubscription]);

  // [FLOW-02 / 3단계] 지원 여부를 확인한 뒤 네이티브 이벤트 listener를 등록합니다.
  const startMonitoring = useCallback(async () => {
    // 중복 listener는 이벤트 중복 처리와 native 자원 누수를 만들 수 있으므로 막습니다.
    if (subscriptionRef.current) {
      return;
    }

    const operation = ++operationRef.current;
    setState((current) => ({
      ...current,
      status: "pending",
      event: null,
    }));

    try {
      const isAvailable = await ProximitySensor.isAvailableAsync();

      if (!mountedRef.current || operation !== operationRef.current) {
        return;
      }

      if (!isAvailable) {
        setState((current) => ({
          ...current,
          status: "unavailable",
          event: null,
        }));
        return;
      }

      // [FLOW-02 / 5~6단계] 네이티브 event를 받아 함수형 state update로 화면 상태에 반영합니다.
      subscriptionRef.current = ProximitySensor.addListener(
        "onProximityChange",
        (event) => {
          if (mountedRef.current) {
            // 가장 최신 상태와 순수 변환 함수를 이용해 이벤트를 UI 상태에 반영합니다.
            setState((current) => applyProximityEvent(current, event));
          }
        },
      );
      setIsMonitoring(true);

      // [주의] listener 추가 과정의 실제 센서 등록 실패까지 감지하려고 상태를 한 번 더 확인합니다.
      const didRegister = await ProximitySensor.isAvailableAsync();

      // unmount, 최신 작업 교체, 등록 실패 중 하나라도 발생하면 방금 만든 구독을 제거합니다.
      if (
        !mountedRef.current ||
        operation !== operationRef.current ||
        !didRegister
      ) {
        removeSubscription();

        // 여전히 현재 화면의 최신 작업일 때만 실패 UI를 반영합니다.
        if (mountedRef.current && operation === operationRef.current) {
          setState((current) => ({
            ...current,
            status: "unavailable",
            event: null,
          }));
        }
      }
    } catch {
      // 확인 도중 예외가 나면 부분적으로 생성됐을 수 있는 구독도 함께 정리합니다.
      removeSubscription();

      if (mountedRef.current && operation === operationRef.current) {
        setState((current) => ({
          ...current,
          status: "unavailable",
          event: null,
        }));
      }
    }
  }, [removeSubscription]);

  // [라이브러리] 빈 의존성 배열의 useEffect는 mount 때 실행되고, 반환 함수는 unmount 때 실행됩니다.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      // [FLOW-02 / 7단계] 생존 해제 → 비동기 응답 무효화 → listener 제거 → 참조 제거 순서입니다.
      mountedRef.current = false;
      operationRef.current += 1;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  // [문법] state를 펼친 뒤 제어 값과 함수를 더해 Hook 사용자가 한 객체로 받도록 합니다.
  return {
    ...state,
    isMonitoring,
    checkAvailability,
    startMonitoring,
    stopMonitoring,
  };
}
