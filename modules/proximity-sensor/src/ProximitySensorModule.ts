// [파일 역할] TypeScript가 이해하는 API 선언과 런타임의 Android/iOS Expo Module을 이름으로 연결합니다.
// [FLOW-02 / 3단계] useProximity Hook의 호출이 이 bridge를 지나 같은 이름의 Kotlin/Swift module로 갑니다.
import { NativeModule, requireNativeModule } from "expo";

import type { ProximitySensorModuleEvents } from "./ProximitySensor.types";

// [문법] `declare class`는 JS class를 새로 만들지 않고 native 쪽에 실제 구현이 있다고 TypeScript에 알립니다.
// 제네릭 event map 덕분에 addListener의 이름과 callback payload가 자동으로 검사됩니다.
declare class ProximitySensorNativeModule extends NativeModule<ProximitySensorModuleEvents> {
  // Promise<boolean>은 native 비동기 함수가 센서 지원 여부를 true/false로 완료한다는 뜻입니다.
  isAvailableAsync(): Promise<boolean>;
}

// [라이브러리] requireNativeModule은 Expo autolinking이 등록한 native module을 런타임 registry에서 찾습니다.
// 문자열은 Kotlin/Swift의 `Name("ProximitySensor")`와 정확히 같아야 합니다.
export default requireNativeModule<ProximitySensorNativeModule>(
  "ProximitySensor",
);
