// [파일 역할] 앱 코드가 `@/modules/proximity-sensor` 한 경로만 import하도록 만든 공개 진입점(barrel)입니다.
// `default`는 실제 native module 객체를, `type` export는 컴파일 때만 필요한 이벤트 계약을 다시 내보냅니다.
export { default } from "./src/ProximitySensorModule";
export type { ProximitySensorModuleEvents } from "./src/ProximitySensor.types";
