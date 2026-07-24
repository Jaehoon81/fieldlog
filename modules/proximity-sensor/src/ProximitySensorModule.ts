import { NativeModule, requireNativeModule } from "expo";

import type { ProximitySensorModuleEvents } from "./ProximitySensor.types";

declare class ProximitySensorNativeModule extends NativeModule<ProximitySensorModuleEvents> {
  isAvailableAsync(): Promise<boolean>;
}

export default requireNativeModule<ProximitySensorNativeModule>(
  "ProximitySensor",
);
