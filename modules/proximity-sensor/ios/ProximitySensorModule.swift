// [파일 역할] iOS UIDevice 근접 상태 알림을 Expo Modules API 이벤트로 변환합니다.
import ExpoModulesCore
import UIKit

// [Swift 문법] 파일 범위 private let은 이 파일 안에서만 보이는 변경 불가 상수입니다.
// TypeScript event map의 key와 정확히 같아야 합니다.
private let proximityEventName = "onProximityChange"

// `final`은 subclass를 막고 `: Module`은 Expo native module 기반 class를 상속한다는 뜻입니다.
public final class ProximitySensorModule: Module {
  // JS listener, app foreground, 실제 monitoring 상태를 분리해서 native 자원 수명주기를 판단합니다.
  private var hasEventListener = false
  private var isAppForeground = true
  private var isMonitoring = false
  private var proximityObserver: NSObjectProtocol?

  // [Expo Modules API] JS에 공개할 이름·이벤트·함수와 app lifecycle hook을 DSL로 선언합니다.
  public func definition() -> ModuleDefinition {
    // TypeScript requireNativeModule 문자열과 같은 registry 이름입니다.
    Name("ProximitySensor")

    Events(proximityEventName)

    // [FLOW-02 / 2단계] JS Promise<boolean>에 연결되는 함수이며 UIKit 접근 때문에 main queue에서 실행합니다.
    AsyncFunction("isAvailableAsync") { () -> Bool in
      let device = UIDevice.current
      // iOS에는 별도 availability API가 없어 monitoring을 켠 뒤 실제로 켜졌는지 읽어 지원 여부를 확인합니다.
      device.isProximityMonitoringEnabled = true
      let isAvailable = device.isProximityMonitoringEnabled

      // 확인만 한 상태라면 화면 꺼짐 같은 부작용을 남기지 않도록 곧바로 끕니다.
      if !self.hasEventListener || !self.isAppForeground {
        device.isProximityMonitoringEnabled = false
      }

      return isAvailable
    }.runOnQueue(.main)

    // [FLOW-02 / 4단계] JS 첫 addListener 때 NotificationCenter observer와 monitoring을 준비합니다.
    OnStartObserving(proximityEventName) {
      self.runOnMain {
        self.hasEventListener = true
        self.startMonitoringIfNeeded()
      }
    }

    // JS 마지막 listener 제거 시 observer와 UIDevice monitoring을 함께 정리합니다.
    OnStopObserving(proximityEventName) {
      self.runOnMain {
        self.hasEventListener = false
        self.stopMonitoring()
      }
    }

    // background에서는 화면/센서를 끄고 foreground에서 listener가 있으면 다시 시작합니다.
    OnAppEntersForeground {
      self.runOnMain {
        self.isAppForeground = true
        self.startMonitoringIfNeeded()
      }
    }

    OnAppEntersBackground {
      self.runOnMain {
        self.isAppForeground = false
        self.stopMonitoring()
      }
    }

    // module이 파괴될 때 남은 observer와 monitoring을 확실히 해제합니다.
    OnDestroy {
      self.runOnMain {
        self.hasEventListener = false
        self.isAppForeground = false
        self.stopMonitoring()
      }
    }
  }

  // [FLOW-02 / 4단계] listener 있음 + foreground + 아직 미시작 조건에서만 한 번 시작합니다.
  private func startMonitoringIfNeeded() {
    // [Swift 문법] guard는 조건이 충족되지 않으면 else에서 조기 반환해 본문을 정상 경로로 유지합니다.
    guard hasEventListener, isAppForeground, !isMonitoring else {
      return
    }

    let device = UIDevice.current
    // UIDevice가 near/far 상태를 바꿀 때 NotificationCenter가 closure를 main queue에서 호출합니다.
    proximityObserver = NotificationCenter.default.addObserver(
      forName: UIDevice.proximityStateDidChangeNotification,
      object: device,
      queue: .main
    ) { [weak self] _ in
      // `weak self`는 observer closure와 module이 서로 강하게 잡아 메모리에서 해제되지 않는 순환 참조를 막습니다.
      // `_`는 전달된 Notification 객체를 사용하지 않는다는 매개변수 표기입니다.
      self?.sendCurrentState()
    }

    device.isProximityMonitoringEnabled = true
    // 하드웨어가 지원하지 않아 enable이 유지되지 않으면 방금 만든 observer도 되돌립니다.
    guard device.isProximityMonitoringEnabled else {
      removeProximityObserver()
      return
    }

    isMonitoring = true
    // 알림이 바뀔 때까지 기다리지 않고 시작 시점의 현재 near/far 상태도 즉시 한 번 보냅니다.
    sendCurrentState()
  }

  // [FLOW-02 / 7단계] observer 제거와 UIDevice monitoring 해제를 하나의 cleanup으로 묶습니다.
  private func stopMonitoring() {
    removeProximityObserver()

    if isMonitoring || UIDevice.current.isProximityMonitoringEnabled {
      UIDevice.current.isProximityMonitoringEnabled = false
    }
    isMonitoring = false
  }

  private func removeProximityObserver() {
    // [Swift 문법] `if let proximityObserver`는 optional에 값이 있을 때만 같은 이름의 non-optional로 꺼냅니다.
    if let proximityObserver {
      NotificationCenter.default.removeObserver(proximityObserver)
      self.proximityObserver = nil
    }
  }

  // [FLOW-02 / 5단계] iOS boolean 근접 상태를 JS ProximityEvent payload로 만듭니다.
  private func sendCurrentState() {
    guard isMonitoring else {
      return
    }

    // Swift Dictionary가 Expo bridge를 거쳐 JS 객체가 됩니다.
    sendEvent(proximityEventName, [
      "status": UIDevice.current.proximityState ? "near" : "far",
      // iOS 공개 API는 실제 cm/max range를 주지 않으므로 NSNull을 보내 JS의 null 계약을 지킵니다.
      "distanceCm": NSNull(),
      "maxRangeCm": NSNull(),
      // timeIntervalSince1970은 초 단위이므로 1000을 곱해 JS의 epoch millisecond와 맞춥니다.
      "observedAt": Date().timeIntervalSince1970 * 1_000
    ])
  }

  // [Swift 문법] closure를 인자로 받는 고차 함수이며 UIKit 상태 접근을 main thread로 제한합니다.
  private func runOnMain(_ block: () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.sync(execute: block)
    }
  }
}
