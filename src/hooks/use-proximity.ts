import { useCallback, useEffect, useRef, useState } from "react";

import ProximitySensor from "@/modules/proximity-sensor";
import type {
  ProximityEvent,
  ProximityUiStatus,
} from "@/src/types/observation";

export type ProximityState = {
  status: ProximityUiStatus;
  event: ProximityEvent | null;
  lastNearAt: number | null;
};

export type UseProximityResult = ProximityState & {
  isMonitoring: boolean;
  checkAvailability: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
};

const INITIAL_STATE: ProximityState = {
  status: "pending",
  event: null,
  lastNearAt: null,
};

type ProximitySubscription = ReturnType<typeof ProximitySensor.addListener>;

export function applyProximityEvent(
  state: ProximityState,
  event: ProximityEvent,
): ProximityState {
  return {
    status: event.status,
    event,
    lastNearAt:
      event.status === "near" ? event.observedAt : state.lastNearAt,
  };
}

export function useProximity(): UseProximityResult {
  const [state, setState] = useState<ProximityState>(INITIAL_STATE);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const subscriptionRef = useRef<ProximitySubscription | null>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);

  const removeSubscription = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsMonitoring(false);
  }, []);

  const checkAvailability = useCallback(async () => {
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

      setState((current) => ({
        ...current,
        status: isAvailable ? "idle" : "unavailable",
        event: null,
      }));
    } catch {
      if (mountedRef.current && operation === operationRef.current) {
        setState((current) => ({
          ...current,
          status: "unavailable",
          event: null,
        }));
      }
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    operationRef.current += 1;
    removeSubscription();
    setState((current) => ({
      ...current,
      status: current.status === "unavailable" ? "unavailable" : "idle",
      event: null,
    }));
  }, [removeSubscription]);

  const startMonitoring = useCallback(async () => {
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

      subscriptionRef.current = ProximitySensor.addListener(
        "onProximityChange",
        (event) => {
          if (mountedRef.current) {
            setState((current) => applyProximityEvent(current, event));
          }
        },
      );
      setIsMonitoring(true);

      const didRegister = await ProximitySensor.isAvailableAsync();

      if (
        !mountedRef.current ||
        operation !== operationRef.current ||
        !didRegister
      ) {
        removeSubscription();

        if (mountedRef.current && operation === operationRef.current) {
          setState((current) => ({
            ...current,
            status: "unavailable",
            event: null,
          }));
        }
      }
    } catch {
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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return {
    ...state,
    isMonitoring,
    checkAvailability,
    startMonitoring,
    stopMonitoring,
  };
}
