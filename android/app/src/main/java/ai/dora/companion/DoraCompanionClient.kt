package ai.dora.companion

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

/**
 * Dora Companion Client
 * 
 * Manages phone-side pairing exchange, authentication tokens, heartbeat loops,
 * and connection lifecycle states for the Dora Android Companion.
 * 
 * Enforces secure HTTPS production endpoints, rejects insecure plain HTTP for remote hosts,
 * and provides pre-pairing health verification.
 */
class DoraCompanionClient private constructor(private val context: Context) {

    enum class ConnectionState {
        NOT_CONFIGURED,
        CONNECTING,
        CONNECTED,
        ACCESSIBILITY_DISABLED,
        READY,
        ERROR
    }

    data class HealthCheckResult(
        val reachable: Boolean,
        val statusCode: Int = 0,
        val doraStatus: String? = null,
        val error: String? = null
    )

    data class PairingResult(
        val success: Boolean,
        val token: String?,
        val deviceId: String?,
        val error: String? = null
    )

    data class HeartbeatResult(
        val success: Boolean,
        val deploymentStatus: String?,
        val error: String? = null
    )

    companion object {
        private const val TAG = "DoraCompanionClient"
        private const val PREFS_NAME = "dora_companion_prefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_LAST_SYNC_TIME = "last_sync_time"
        private const val KEY_LAST_PAIRED_CODE = "last_paired_code"
        
        // Public production Cloud Run HTTPS endpoint for Dora
        const val DEFAULT_SERVER_URL = "https://ais-dev-us6d4iivtwlkjr66rw4rhy-108268106407.asia-southeast1.run.app"
        private const val HEARTBEAT_INTERVAL_SECONDS = 15L

        @Volatile
        private var instance: DoraCompanionClient? = null

        fun getInstance(context: Context): DoraCompanionClient {
            return instance ?: synchronized(this) {
                instance ?: DoraCompanionClient(context.applicationContext).also { instance = it }
            }
        }
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .build()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor = Executors.newSingleThreadExecutor()
    private val scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private var heartbeatFuture: ScheduledFuture<*>? = null

    private var currentState: ConnectionState = ConnectionState.NOT_CONFIGURED
    private var lastErrorMessage: String? = null
    private val stateListeners = mutableListOf<(ConnectionState, String?) -> Unit>()

    init {
        // Initial state resolution from stored credentials
        evaluateCurrentState()
    }

    fun addStateListener(listener: (ConnectionState, String?) -> Unit) {
        synchronized(stateListeners) {
            stateListeners.add(listener)
        }
        // Emit initial state
        listener(currentState, lastErrorMessage)
    }

    fun removeStateListener(listener: (ConnectionState, String?) -> Unit) {
        synchronized(stateListeners) {
            stateListeners.remove(listener)
        }
    }

    private fun notifyStateChanged(state: ConnectionState, error: String? = null) {
        currentState = state
        lastErrorMessage = error
        mainHandler.post {
            synchronized(stateListeners) {
                for (listener in stateListeners) {
                    try {
                        listener(state, error)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in state listener", e)
                    }
                }
            }
        }
    }

    fun getCurrentState(): ConnectionState = currentState
    fun getLastErrorMessage(): String? = lastErrorMessage

    fun getStoredToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)
    fun getStoredDeviceId(): String = prefs.getString(KEY_DEVICE_ID, null) ?: generateDeviceId()
    fun getStoredServerUrl(): String = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
    fun getLastSyncTime(): Long = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)
    fun getLastPairedCode(): String? = prefs.getString(KEY_LAST_PAIRED_CODE, null)

    private fun generateDeviceId(): String {
        val newId = "dora_android_${System.currentTimeMillis()}_${(1000..9999).random()}"
        prefs.edit().putString(KEY_DEVICE_ID, newId).apply()
        return newId
    }

    /**
     * Validates that the provided server URL is well-formed and enforces HTTPS for remote hosts
     */
    fun validateServerUrl(rawUrl: String): String? {
        val trimmed = rawUrl.trim().removeSuffix("/")
        if (trimmed.isBlank()) {
            return "Server URL cannot be empty."
        }
        val lower = trimmed.lowercase()
        if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
            return "Server URL must start with https://"
        }
        if (lower.startsWith("http://")) {
            val hostPart = lower.removePrefix("http://").split(":")[0].split("/")[0]
            val isLocal = hostPart == "localhost" || hostPart == "127.0.0.1"
            if (!isLocal) {
                return "Production server must use secure HTTPS (e.g. https://...)."
            }
        }
        return null
    }

    /**
     * Checks server reachability via GET /api/health before attempting pairing
     */
    fun checkServerHealth(serverUrl: String, callback: (HealthCheckResult) -> Unit) {
        val cleanUrl = serverUrl.trim().removeSuffix("/")
        val validationError = validateServerUrl(cleanUrl)
        if (validationError != null) {
            mainHandler.post {
                callback(HealthCheckResult(reachable = false, error = validationError))
            }
            return
        }

        backgroundExecutor.execute {
            try {
                val request = Request.Builder()
                    .url("$cleanUrl/api/health")
                    .get()
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    val body = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        var doraStatus = "online"
                        try {
                            val json = JSONObject(body)
                            doraStatus = json.optString("dora", json.optString("status", "online"))
                        } catch (e: Exception) {}

                        mainHandler.post {
                            callback(HealthCheckResult(reachable = true, statusCode = response.code, doraStatus = doraStatus))
                        }
                    } else {
                        val errMsg = "Server returned HTTP ${response.code}"
                        mainHandler.post {
                            callback(HealthCheckResult(reachable = false, statusCode = response.code, error = errMsg))
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Health check failed for $cleanUrl: ${e.message}")
                val errMsg = "Unable to reach Dora server (${e.localizedMessage ?: e.message ?: "Connection timed out"})"
                mainHandler.post {
                    callback(HealthCheckResult(reachable = false, error = errMsg))
                }
            }
        }
    }

    /**
     * Evaluates truthful connection state based on token presence, accessibility status, and heartbeat
     */
    fun evaluateCurrentState(): ConnectionState {
        val token = getStoredToken()
        if (token.isNullOrBlank()) {
            notifyStateChanged(ConnectionState.NOT_CONFIGURED)
            return ConnectionState.NOT_CONFIGURED
        }

        val isAccessibilityEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(context)
        val state = if (!isAccessibilityEnabled) {
            ConnectionState.ACCESSIBILITY_DISABLED
        } else {
            ConnectionState.CONNECTED
        }
        notifyStateChanged(state)
        return state
    }

    /**
     * Initiates pairing exchange with backend (/api/device/pairing/pair)
     * Performs pre-pairing health check to provide clear feedback if server is unreachable
     */
    fun pairDevice(
        serverUrl: String,
        pairingCode: String,
        isAccessibilityEnabled: Boolean,
        callback: (PairingResult) -> Unit
    ) {
        val cleanUrl = serverUrl.trim().removeSuffix("/")
        val cleanCode = pairingCode.trim().uppercase()

        val validationError = validateServerUrl(cleanUrl)
        if (validationError != null) {
            notifyStateChanged(ConnectionState.ERROR, validationError)
            callback(PairingResult(success = false, token = null, deviceId = null, error = validationError))
            return
        }

        notifyStateChanged(ConnectionState.CONNECTING)

        // Pre-flight health check before pairing request
        checkServerHealth(cleanUrl) { health ->
            if (!health.reachable) {
                val errorMsg = health.error ?: "Unable to reach Dora server"
                notifyStateChanged(ConnectionState.ERROR, errorMsg)
                callback(PairingResult(success = false, token = null, deviceId = null, error = errorMsg))
                return@checkServerHealth
            }

            // Health check succeeded; execute pairing exchange
            val deviceId = getStoredDeviceId()
            val deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
            val androidVersion = "Android ${Build.VERSION.RELEASE}"

            backgroundExecutor.execute {
                try {
                    val jsonPayload = JSONObject().apply {
                        put("pairingCode", cleanCode)
                        put("deviceId", deviceId)
                        put("deviceModel", deviceModel)
                        put("androidVersion", androidVersion)
                        put("accessibilityEnabled", isAccessibilityEnabled)
                    }

                    val mediaType = "application/json; charset=utf-8".toMediaType()
                    val requestBody = jsonPayload.toString().toRequestBody(mediaType)
                    val request = Request.Builder()
                        .url("$cleanUrl/api/device/pairing/pair")
                        .post(requestBody)
                        .build()

                    httpClient.newCall(request).execute().use { response ->
                        val responseBody = response.body?.string() ?: ""
                        if (!response.isSuccessful) {
                            var errorMsg = "Pairing failed (HTTP ${response.code})"
                            try {
                                val json = JSONObject(responseBody)
                                if (json.has("error")) {
                                    errorMsg = json.getString("error")
                                }
                            } catch (e: Exception) {}
                            
                            notifyStateChanged(ConnectionState.ERROR, errorMsg)
                            mainHandler.post {
                                callback(PairingResult(success = false, token = null, deviceId = null, error = errorMsg))
                            }
                            return@execute
                        }

                        val json = JSONObject(responseBody)
                        val tokenObj = json.optJSONObject("token")
                        val authToken = tokenObj?.optString("token") ?: json.optString("token", "")
                        val returnedDeviceId = tokenObj?.optString("deviceId") ?: deviceId

                        if (authToken.isBlank()) {
                            val errorMsg = "Invalid server response: auth token missing"
                            notifyStateChanged(ConnectionState.ERROR, errorMsg)
                            mainHandler.post {
                                callback(PairingResult(success = false, token = null, deviceId = null, error = errorMsg))
                            }
                            return@execute
                        }

                        // Store credentials securely in private shared preferences
                        prefs.edit()
                            .putString(KEY_AUTH_TOKEN, authToken)
                            .putString(KEY_DEVICE_ID, returnedDeviceId)
                            .putString(KEY_SERVER_URL, cleanUrl)
                            .putString(KEY_LAST_PAIRED_CODE, cleanCode)
                            .putLong(KEY_LAST_SYNC_TIME, System.currentTimeMillis())
                            .apply()

                        // Start periodic background heartbeat
                        startPeriodicHeartbeat()

                        val targetState = if (isAccessibilityEnabled) ConnectionState.CONNECTED else ConnectionState.ACCESSIBILITY_DISABLED
                        notifyStateChanged(targetState)

                        mainHandler.post {
                            callback(PairingResult(success = true, token = authToken, deviceId = returnedDeviceId))
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Pairing network exception", e)
                    val errorMsg = "Unable to reach Dora server: ${e.localizedMessage ?: "Connection error"}"
                    notifyStateChanged(ConnectionState.ERROR, errorMsg)
                    mainHandler.post {
                        callback(PairingResult(success = false, token = null, deviceId = null, error = errorMsg))
                    }
                }
            }
        }
    }

    /**
     * Sends heartbeat to backend (/api/device/pairing/heartbeat)
     */
    fun sendHeartbeat(
        isAccessibilityEnabled: Boolean,
        callback: ((HeartbeatResult) -> Unit)? = null
    ) {
        val token = getStoredToken()
        val deviceId = getStoredDeviceId()
        val serverUrl = getStoredServerUrl().trim().removeSuffix("/")

        if (token.isNullOrBlank()) {
            notifyStateChanged(ConnectionState.NOT_CONFIGURED)
            callback?.let { cb ->
                mainHandler.post { cb(HeartbeatResult(success = false, deploymentStatus = null, error = "Device is not paired")) }
            }
            return
        }

        backgroundExecutor.execute {
            try {
                val jsonPayload = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("token", token)
                    put("accessibilityEnabled", isAccessibilityEnabled)
                    put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
                    put("androidVersion", "Android ${Build.VERSION.RELEASE}")
                }

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = jsonPayload.toString().toRequestBody(mediaType)
                val request = Request.Builder()
                    .url("$serverUrl/api/device/pairing/heartbeat")
                    .post(requestBody)
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string() ?: ""
                    if (response.code == 401) {
                        // Token invalid or revoked
                        prefs.edit().remove(KEY_AUTH_TOKEN).apply()
                        stopPeriodicHeartbeat()
                        notifyStateChanged(ConnectionState.NOT_CONFIGURED, "Session expired. Please pair again.")
                        callback?.let { cb ->
                            mainHandler.post { cb(HeartbeatResult(success = false, deploymentStatus = null, error = "Session expired")) }
                        }
                        return@execute
                    }

                    if (!response.isSuccessful) {
                        val errorMsg = "Heartbeat failed (HTTP ${response.code})"
                        notifyStateChanged(ConnectionState.READY, errorMsg)
                        callback?.let { cb ->
                            mainHandler.post { cb(HeartbeatResult(success = false, deploymentStatus = null, error = errorMsg)) }
                        }
                        return@execute
                    }

                    prefs.edit().putLong(KEY_LAST_SYNC_TIME, System.currentTimeMillis()).apply()

                    val targetState = if (isAccessibilityEnabled) ConnectionState.CONNECTED else ConnectionState.ACCESSIBILITY_DISABLED
                    notifyStateChanged(targetState)

                    callback?.let { cb ->
                        mainHandler.post { cb(HeartbeatResult(success = true, deploymentStatus = targetState.name)) }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Heartbeat exception: ${e.message}")
                notifyStateChanged(ConnectionState.READY, "Waiting for server connection...")
                callback?.let { cb ->
                    mainHandler.post { cb(HeartbeatResult(success = false, deploymentStatus = null, error = e.message)) }
                }
            }
        }
    }

    /**
     * Unpairs device locally and informs server
     */
    fun unpair(callback: ((Boolean) -> Unit)? = null) {
        val serverUrl = getStoredServerUrl().trim().removeSuffix("/")
        val deviceId = getStoredDeviceId()

        stopPeriodicHeartbeat()

        backgroundExecutor.execute {
            try {
                val jsonPayload = JSONObject().apply {
                    put("deviceId", deviceId)
                }
                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = jsonPayload.toString().toRequestBody(mediaType)
                val request = Request.Builder()
                    .url("$serverUrl/api/device/pairing/unpair")
                    .post(requestBody)
                    .build()

                httpClient.newCall(request).execute().close()
            } catch (e: Exception) {
                Log.w(TAG, "Unpair remote request failed (ignoring for local reset): ${e.message}")
            } finally {
                prefs.edit().remove(KEY_AUTH_TOKEN).remove(KEY_LAST_PAIRED_CODE).apply()
                notifyStateChanged(ConnectionState.NOT_CONFIGURED)
                callback?.let { cb ->
                    mainHandler.post { cb(true) }
                }
            }
        }
    }

    /**
     * Starts periodic background heartbeat
     */
    fun startPeriodicHeartbeat() {
        stopPeriodicHeartbeat()
        heartbeatFuture = scheduler.scheduleWithFixedDelay(
            {
                val isAccessibility = DoraAccessibilityService.isAccessibilitySettingsEnabled(context)
                sendHeartbeat(isAccessibility)
            },
            0,
            HEARTBEAT_INTERVAL_SECONDS,
            TimeUnit.SECONDS
        )
    }

    /**
     * Stops periodic heartbeat
     */
    fun stopPeriodicHeartbeat() {
        heartbeatFuture?.cancel(true)
        heartbeatFuture = null
    }
}
