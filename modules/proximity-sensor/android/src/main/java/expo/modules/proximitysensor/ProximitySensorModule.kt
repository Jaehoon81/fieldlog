package expo.modules.proximitysensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PROXIMITY_EVENT_NAME = "onProximityChange"

class ProximitySensorModule : Module(), SensorEventListener {
  private val mainHandler = Handler(Looper.getMainLooper())

  private var sensorManager: SensorManager? = null
  private var proximitySensor: Sensor? = null
  private var hasEventListener = false
  private var isAppForeground = true
  private var isSensorRegistered = false
  private var registrationFailed = false

  override fun definition() = ModuleDefinition {
    Name("ProximitySensor")

    Events(PROXIMITY_EVENT_NAME)

    AsyncFunction<Boolean>("isAvailableAsync") {
      val hasSensor = resolveProximitySensor() != null
      return@AsyncFunction hasSensor && (!hasEventListener || !registrationFailed)
    }.runOnQueue(Queues.MAIN)

    OnStartObserving(PROXIMITY_EVENT_NAME) {
      runOnMain {
        hasEventListener = true
        startMonitoringIfNeeded()
      }
    }

    OnStopObserving(PROXIMITY_EVENT_NAME) {
      runOnMain {
        hasEventListener = false
        stopMonitoring()
      }
    }

    OnActivityEntersForeground {
      runOnMain {
        isAppForeground = true
        startMonitoringIfNeeded()
      }
    }

    OnActivityEntersBackground {
      runOnMain {
        isAppForeground = false
        stopMonitoring()
      }
    }

    OnDestroy {
      runOnMain {
        hasEventListener = false
        isAppForeground = false
        stopMonitoring()
        proximitySensor = null
        sensorManager = null
      }
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (!isSensorRegistered || event.sensor.type != Sensor.TYPE_PROXIMITY) {
      return
    }

    val distanceCm = event.values[0].toDouble()
    val maxRangeCm = event.sensor.maximumRange.toDouble()
    val status = if (distanceCm < maxRangeCm) "near" else "far"

    sendEvent(
      PROXIMITY_EVENT_NAME,
      mapOf(
        "status" to status,
        "distanceCm" to distanceCm,
        "maxRangeCm" to maxRangeCm,
        "observedAt" to System.currentTimeMillis()
      )
    )
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  private fun resolveSensorManager(): SensorManager? {
    sensorManager?.let { return it }

    val context = appContext.reactContext ?: return null
    return (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)
      ?.also { sensorManager = it }
  }

  private fun resolveProximitySensor(): Sensor? {
    proximitySensor?.let { return it }

    return resolveSensorManager()
      ?.getDefaultSensor(Sensor.TYPE_PROXIMITY)
      ?.also { proximitySensor = it }
  }

  private fun startMonitoringIfNeeded() {
    if (!hasEventListener || !isAppForeground || isSensorRegistered) {
      return
    }

    val manager = resolveSensorManager()
    val sensor = resolveProximitySensor()
    if (manager == null || sensor == null) {
      registrationFailed = true
      return
    }

    registrationFailed = false
    isSensorRegistered = manager.registerListener(
      this,
      sensor,
      SensorManager.SENSOR_DELAY_NORMAL
    )
    registrationFailed = !isSensorRegistered
  }

  private fun stopMonitoring() {
    if (isSensorRegistered) {
      sensorManager?.unregisterListener(this)
      isSensorRegistered = false
    }
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      mainHandler.post { block() }
    }
  }
}
