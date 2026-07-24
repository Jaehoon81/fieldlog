import type { ProximityEvent } from "@/src/types/observation";

export type ProximitySensorModuleEvents = {
  onProximityChange(event: ProximityEvent): void;
};
