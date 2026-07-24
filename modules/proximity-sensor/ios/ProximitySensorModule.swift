import ExpoModulesCore
import UIKit

private let proximityEventName = "onProximityChange"

public final class ProximitySensorModule: Module {
  private var hasEventListener = false
  private var isAppForeground = true
  private var isMonitoring = false
  private var proximityObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ProximitySensor")

    Events(proximityEventName)

    AsyncFunction("isAvailableAsync") { () -> Bool in
      let device = UIDevice.current
      device.isProximityMonitoringEnabled = true
      let isAvailable = device.isProximityMonitoringEnabled

      if !self.hasEventListener || !self.isAppForeground {
        device.isProximityMonitoringEnabled = false
      }

      return isAvailable
    }.runOnQueue(.main)

    OnStartObserving(proximityEventName) {
      self.runOnMain {
        self.hasEventListener = true
        self.startMonitoringIfNeeded()
      }
    }

    OnStopObserving(proximityEventName) {
      self.runOnMain {
        self.hasEventListener = false
        self.stopMonitoring()
      }
    }

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

    OnDestroy {
      self.runOnMain {
        self.hasEventListener = false
        self.isAppForeground = false
        self.stopMonitoring()
      }
    }
  }

  private func startMonitoringIfNeeded() {
    guard hasEventListener, isAppForeground, !isMonitoring else {
      return
    }

    let device = UIDevice.current
    proximityObserver = NotificationCenter.default.addObserver(
      forName: UIDevice.proximityStateDidChangeNotification,
      object: device,
      queue: .main
    ) { [weak self] _ in
      self?.sendCurrentState()
    }

    device.isProximityMonitoringEnabled = true
    guard device.isProximityMonitoringEnabled else {
      removeProximityObserver()
      return
    }

    isMonitoring = true
    sendCurrentState()
  }

  private func stopMonitoring() {
    removeProximityObserver()

    if isMonitoring || UIDevice.current.isProximityMonitoringEnabled {
      UIDevice.current.isProximityMonitoringEnabled = false
    }
    isMonitoring = false
  }

  private func removeProximityObserver() {
    if let proximityObserver {
      NotificationCenter.default.removeObserver(proximityObserver)
      self.proximityObserver = nil
    }
  }

  private func sendCurrentState() {
    guard isMonitoring else {
      return
    }

    sendEvent(proximityEventName, [
      "status": UIDevice.current.proximityState ? "near" : "far",
      "distanceCm": NSNull(),
      "maxRangeCm": NSNull(),
      "observedAt": Date().timeIntervalSince1970 * 1_000
    ])
  }

  private func runOnMain(_ block: () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.sync(execute: block)
    }
  }
}
