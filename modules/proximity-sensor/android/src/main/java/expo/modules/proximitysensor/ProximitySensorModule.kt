// [파일 역할] Android SensorManager의 TYPE_PROXIMITY 값을 Expo Modules API 이벤트로 변환합니다.
package expo.modules.proximitysensor

// Android framework의 Context, Sensor API와 main thread 도구를 가져옵니다.
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

// [Kotlin 문법] 파일 수준 private const val은 이 파일 안에서만 쓰는 컴파일 상수입니다.
// 이 문자열은 TypeScript의 ProximitySensorModuleEvents key와 정확히 일치해야 합니다.
private const val PROXIMITY_EVENT_NAME = "onProximityChange"

// [Kotlin 문법] `: Module(), SensorEventListener`는 Expo Module을 상속하고 Android listener interface를 구현합니다.
class ProximitySensorModule : Module(), SensorEventListener {
  // Sensor 등록/해제와 Expo lifecycle 상태 변경을 Android main looper에서 직렬화할 Handler입니다.
  private val mainHandler = Handler(Looper.getMainLooper())

  // `?`는 nullable 타입입니다. 필요해질 때 resolve 함수가 값을 얻어 이 cache에 보관합니다.
  private var sensorManager: SensorManager? = null
  private var proximitySensor: Sensor? = null
  // listener 존재, 앱 foreground, 실제 sensor 등록 여부를 각각 분리해 수명주기 조건을 표현합니다.
  private var hasEventListener = false
  private var isAppForeground = true
  private var isSensorRegistered = false
  private var registrationFailed = false

  // [Expo Modules API] definition DSL 안에 JS에 공개할 이름·함수·이벤트·lifecycle hook을 선언합니다.
  override fun definition() = ModuleDefinition {
    // TypeScript requireNativeModule 문자열과 반드시 같은 native registry 이름입니다.
    Name("ProximitySensor")

    // JS가 addListener로 구독할 수 있는 이벤트 목록에 이름을 등록합니다.
    Events(PROXIMITY_EVENT_NAME)

    // [FLOW-02 / 관련 코드] JS의 isAvailableAsync(): Promise<boolean> 구현입니다.
    // Hook의 초기 확인과 listener 등록 직전 재확인이 이 함수를 공통으로 호출합니다.
    AsyncFunction<Boolean>("isAvailableAsync") {
      val hasSensor = resolveProximitySensor() != null
      // listener가 없으면 하드웨어 존재만, listener가 있으면 실제 등록 실패 여부까지 반영합니다.
      // `return@AsyncFunction`은 바깥 definition이 아니라 이 lambda의 반환값이라는 label 문법입니다.
      return@AsyncFunction hasSensor && (!hasEventListener || !registrationFailed)
    // Sensor API 상태를 다루므로 이 비동기 함수를 main queue에서 실행합니다.
    }.runOnQueue(Queues.MAIN)

    // [FLOW-02 / 관련 코드] JS의 첫 `addListener`가 생기면 Expo가 호출합니다.
    OnStartObserving(PROXIMITY_EVENT_NAME) {
      runOnMain {
        hasEventListener = true
        startMonitoringIfNeeded()
      }
    }

    // JS의 마지막 subscription.remove() 뒤에는 센서 listener를 해제합니다.
    OnStopObserving(PROXIMITY_EVENT_NAME) {
      runOnMain {
        hasEventListener = false
        stopMonitoring()
      }
    }

    // listener가 남아 있어도 background 동안 센서를 끄고, foreground 복귀 때 조건부 재등록합니다.
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

    // module 파괴 시 native listener와 Android 객체 참조를 모두 놓아 다음 인스턴스가 깨끗하게 시작하게 합니다.
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

  // [FLOW-02 / 8단계] Android framework가 근접 센서 값이 바뀔 때 호출하는 callback입니다.
  // 받은 sensor 값을 공통 ProximityEvent로 JavaScript에 보냅니다.
  override fun onSensorChanged(event: SensorEvent) {
    // 이미 해제됐거나 다른 센서 이벤트이면 JS로 보내지 않습니다.
    if (!isSensorRegistered || event.sensor.type != Sensor.TYPE_PROXIMITY) {
      return
    }

    // Kotlin의 val은 한 번 정하면 재대입하지 않는 지역 변수입니다.
    val distanceCm = event.values[0].toDouble()
    val maxRangeCm = event.sensor.maximumRange.toDouble()
    // Android 근접 센서는 현재값이 maximumRange보다 작으면 가까운 물체가 감지된 것으로 봅니다.
    val status = if (distanceCm < maxRangeCm) "near" else "far"

    // Expo가 Kotlin Map을 JS 객체로 직렬화해 typed listener callback에 전달합니다.
    sendEvent(
      PROXIMITY_EVENT_NAME,
      // [Kotlin 문법] `"key" to value` 쌍들로 변경 불가능한 Map을 만듭니다.
      mapOf(
        "status" to status,
        "distanceCm" to distanceCm,
        "maxRangeCm" to maxRangeCm,
        "observedAt" to System.currentTimeMillis()
      )
    )
  }

  // 앱은 accuracy 변경을 사용하지 않습니다. `= Unit`은 내용 없는 한 줄 함수 구현입니다.
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  // SensorManager를 최초 한 번 얻고 이후에는 cache를 반환합니다.
  private fun resolveSensorManager(): SensorManager? {
    // `?.let { return it }`은 값이 null이 아닐 때 lambda의 it을 즉시 반환합니다.
    sensorManager?.let { return it }

    // React Context가 아직 없으면 Elvis 연산자 `?:`로 null을 즉시 반환합니다.
    val context = appContext.reactContext ?: return null
    // `as?`는 cast 실패 시 예외 대신 null, `also`는 원래 객체를 반환하면서 cache에 저장합니다.
    return (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)
      ?.also { sensorManager = it }
  }

  // 기본 TYPE_PROXIMITY sensor도 같은 lazy cache 패턴으로 구합니다.
  private fun resolveProximitySensor(): Sensor? {
    proximitySensor?.let { return it }

    return resolveSensorManager()
      ?.getDefaultSensor(Sensor.TYPE_PROXIMITY)
      ?.also { proximitySensor = it }
  }

  // [FLOW-02 / 6단계] 세 조건이 모두 맞을 때 한 번만 Android listener를 등록합니다.
  private fun startMonitoringIfNeeded() {
    // listener 없음, background, 이미 등록됨 중 하나면 아무 작업도 하지 않는 guard clause입니다.
    if (!hasEventListener || !isAppForeground || isSensorRegistered) {
      return
    }

    val manager = resolveSensorManager()
    val sensor = resolveProximitySensor()
    // manager 또는 hardware sensor가 없으면 JS의 두 번째 availability 확인이 false가 되도록 기록합니다.
    if (manager == null || sensor == null) {
      registrationFailed = true
      return
    }

    registrationFailed = false
    // registerListener 자체가 boolean 성공값을 주며 SENSOR_DELAY_NORMAL 빈도로 callback을 요청합니다.
    isSensorRegistered = manager.registerListener(
      this,
      sensor,
      SensorManager.SENSOR_DELAY_NORMAL
    )
    registrationFailed = !isSensorRegistered
  }

  // [FLOW-02 / 14단계] 실제 등록된 경우에만 해제하고 flag를 즉시 false로 맞춥니다.
  private fun stopMonitoring() {
    if (isSensorRegistered) {
      sensorManager?.unregisterListener(this)
      isSensorRegistered = false
    }
  }

  // [Kotlin 문법] `block: () -> Unit`은 인자와 반환값이 없는 함수를 매개변수로 받는 고차 함수입니다.
  private fun runOnMain(block: () -> Unit) {
    // 이미 main이면 즉시 실행하고, 아니면 Handler queue에 post하여 UI/native lifecycle 경쟁을 줄입니다.
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      mainHandler.post { block() }
    }
  }
}
