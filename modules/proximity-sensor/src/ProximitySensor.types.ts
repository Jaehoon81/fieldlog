// [파일 역할] Kotlin/Swift가 JS로 보내는 이벤트 이름과 payload의 TypeScript 계약입니다.
import type { ProximityEvent } from "@/src/types/observation";

// [문법] 함수 모양으로 선언한 key가 Expo NativeModule의 typed event map이 됩니다.
export type ProximitySensorModuleEvents = {
  // [FLOW-02 / 관련 코드] native `sendEvent("onProximityChange", payload)`가 이 event 매개변수로 들어옵니다.
  onProximityChange(event: ProximityEvent): void;
};
