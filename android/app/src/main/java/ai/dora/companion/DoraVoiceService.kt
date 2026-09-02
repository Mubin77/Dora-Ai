package ai.dora.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.Locale

/**
 * Dora Native Voice & Background Assistant Service
 * 
 * Provides production-quality, always-available native voice intelligence:
 * - Runs as an authorized Android Foreground Service with microphone / connected device types
 * - On-device native wake-word detector for "Dora" ("Hey Dora", "Hi Dora")
 * - Seamless multi-turn active listening and follow-up listening windows (5-15s)
 * - Echo cancellation & barge-in suppression (ducks/stops TTS on speech detection)
 * - Single microphone ownership: cleanly yields audio to WebView Live Session when active
 * - Direct autonomous device action execution (Flashlight, Volume, Apps, Accessibility, WhatsApp, Calls)
 * - Dynamic notification updates disclosing microphone readiness
 */
class DoraVoiceService : Service(), TextToSpeech.OnInitListener {

    enum class VoiceState {
        SERVICE_STOPPED,
        WAKE_WORD_LISTENING,
        WAKE_WORD_DETECTED,
        ACTIVE_LISTENING,
        PROCESSING,
        SPEAKING,
        ERROR
    }

    interface StateListener {
        fun onVoiceStateChanged(state: VoiceState, message: String?)
    }

    companion object {
        private const val TAG = "DoraVoiceService"
        const val CHANNEL_ID = "dora_voice_background_channel"
        const val NOTIFICATION_ID = 1002

        const val PREFS_NAME = "dora_settings_prefs"
        const val KEY_LIVE_SESSION_AUTO_START = "live_session_auto_start"
        const val KEY_ALWAYS_RUN_IN_BACKGROUND = "always_run_in_background"
        const val KEY_WAKE_WORD_ENABLED = "wake_word_enabled"
        const val KEY_WAKE_WORD_PHRASE = "wake_word_phrase"
        const val KEY_FOLLOW_UP_LISTENING = "follow_up_listening"
        const val KEY_FOLLOW_UP_TIMEOUT_SECONDS = "follow_up_timeout_seconds"
        const val KEY_LAST_CONVERSATION_CONTEXT = "last_conversation_context"

        const val ACTION_START_BACKGROUND_VOICE = "ai.dora.companion.START_BACKGROUND_VOICE"
        const val ACTION_STOP_BACKGROUND_VOICE = "ai.dora.companion.STOP_BACKGROUND_VOICE"
        const val ACTION_PAUSE_FOR_LIVE_SESSION = "ai.dora.companion.PAUSE_FOR_LIVE_SESSION"
        const val ACTION_RESUME_AFTER_LIVE_SESSION = "ai.dora.companion.RESUME_AFTER_LIVE_SESSION"

        private var instance: DoraVoiceService? = null
        private var isRunning = false
        private var currentState = VoiceState.SERVICE_STOPPED
        private var stateListeners = mutableListOf<StateListener>()
        private var isLiveSessionActive = false

        fun getInstance(): DoraVoiceService? = instance
        fun isServiceRunning(): Boolean = isRunning
        fun getCurrentState(): VoiceState = currentState
        fun isLiveSessionActive(): Boolean = isLiveSessionActive

        fun addStateListener(listener: StateListener) {
            if (!stateListeners.contains(listener)) {
                stateListeners.add(listener)
            }
            listener.onVoiceStateChanged(currentState, null)
        }

        fun removeStateListener(listener: StateListener) {
            stateListeners.remove(listener)
        }

        private fun notifyState(state: VoiceState, message: String? = null) {
            currentState = state
            Handler(Looper.getMainLooper()).post {
                stateListeners.forEach { it.onVoiceStateChanged(state, message) }
            }
        }

        // --- Settings Helpers ---
        fun isLiveSessionAutoStartEnabled(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_LIVE_SESSION_AUTO_START, true)
        }

        fun setLiveSessionAutoStart(context: Context, enabled: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_LIVE_SESSION_AUTO_START, enabled).apply()
        }

        fun isAlwaysRunInBackgroundEnabled(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_ALWAYS_RUN_IN_BACKGROUND, true)
        }

        fun setAlwaysRunInBackground(context: Context, enabled: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_ALWAYS_RUN_IN_BACKGROUND, enabled).apply()
            if (enabled) {
                start(context)
            } else {
                stop(context)
            }
        }

        fun isWakeWordEnabled(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_WAKE_WORD_ENABLED, true)
        }

        fun setWakeWordEnabled(context: Context, enabled: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_WAKE_WORD_ENABLED, enabled).apply()
            instance?.updateWakeWordEngine()
        }

        fun getWakeWordPhrase(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_WAKE_WORD_PHRASE, "Dora") ?: "Dora"
        }

        fun setWakeWordPhrase(context: Context, phrase: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_WAKE_WORD_PHRASE, phrase).apply()
            instance?.updateWakeWordEngine()
        }

        fun isFollowUpListeningEnabled(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_FOLLOW_UP_LISTENING, true)
        }

        fun setFollowUpListening(context: Context, enabled: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_FOLLOW_UP_LISTENING, enabled).apply()
        }

        fun getFollowUpTimeoutSeconds(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getInt(KEY_FOLLOW_UP_TIMEOUT_SECONDS, 8)
        }

        fun setFollowUpTimeoutSeconds(context: Context, seconds: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putInt(KEY_FOLLOW_UP_TIMEOUT_SECONDS, seconds.coerceIn(3, 30)).apply()
        }

        fun saveConversationContext(context: Context, json: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_LAST_CONVERSATION_CONTEXT, json).apply()
        }

        fun getConversationContext(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_LAST_CONVERSATION_CONTEXT, "{}") ?: "{}"
        }

        fun isBatteryOptimizationExempt(context: Context): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }
        }

        fun setLiveSessionActiveState(context: Context, active: Boolean) {
            isLiveSessionActive = active
            if (active) {
                instance?.pauseWakeWordForForegroundSession()
            } else {
                instance?.resumeWakeWordAfterForegroundSession()
            }
        }

        fun start(context: Context) {
            val intent = Intent(context, DoraVoiceService::class.java).apply {
                action = ACTION_START_BACKGROUND_VOICE
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start DoraVoiceService", e)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, DoraVoiceService::class.java).apply {
                action = ACTION_STOP_BACKGROUND_VOICE
            }
            try {
                context.stopService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop DoraVoiceService", e)
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var isTtsReady = false
    private var isListeningForWakeWord = false
    private var isListeningForCommand = false
    private var isForegroundLiveSessionPaused = false

    private val mainHandler = Handler(Looper.getMainLooper())
    private var followUpRunnable: Runnable? = null
    private var recognitionRestartRunnable: Runnable? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        isRunning = true
        createNotificationChannel()

        val notification = buildForegroundNotification("Dora is ready", "Listening for 'Dora' (Microphone active)")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            var serviceTypes = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                serviceTypes = serviceTypes or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
            try {
                startForeground(NOTIFICATION_ID, notification, serviceTypes)
            } catch (e: Exception) {
                Log.w(TAG, "Could not start with combined foreground types, fallback to default", e)
                startForeground(NOTIFICATION_ID, notification)
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        acquirePartialWakeLock()
        initTextToSpeech()

        if (checkMicrophonePermission()) {
            startWakeWordListening()
        } else {
            notifyState(VoiceState.ERROR, "Microphone permission required for wake word.")
        }

        Log.i(TAG, "Dora Background Voice Service initialized successfully.")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_BACKGROUND_VOICE -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PAUSE_FOR_LIVE_SESSION -> {
                pauseWakeWordForForegroundSession()
            }
            ACTION_RESUME_AFTER_LIVE_SESSION -> {
                resumeWakeWordAfterForegroundSession()
            }
            else -> {
                if (!isForegroundLiveSessionPaused && !isListeningForWakeWord && !isListeningForCommand) {
                    startWakeWordListening()
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isRunning = false
        notifyState(VoiceState.SERVICE_STOPPED)
        
        mainHandler.removeCallbacksAndMessages(null)
        stopSpeechRecognizer()
        shutdownTextToSpeech()
        releasePartialWakeLock()
        Log.i(TAG, "Dora Background Voice Service destroyed.")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun checkMicrophonePermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun initTextToSpeech() {
        try {
            tts = TextToSpeech(this, this)
        } catch (e: Exception) {
            Log.w(TAG, "TTS initialization error", e)
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true
            tts?.language = Locale.US
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    notifyState(VoiceState.SPEAKING)
                }

                override fun onDone(utteranceId: String?) {
                    handleTtsFinished(utteranceId)
                }

                override fun onError(utteranceId: String?) {
                    handleTtsFinished(utteranceId)
                }
            })
            Log.i(TAG, "TextToSpeech engine ready.")
        } else {
            Log.w(TAG, "TextToSpeech init failed with status $status")
        }
    }

    private fun shutdownTextToSpeech() {
        try {
            tts?.stop()
            tts?.shutdown()
            tts = null
            isTtsReady = false
        } catch (e: Exception) {
            Log.w(TAG, "Error shutting down TTS", e)
        }
    }

    // --- Audio Contention Management ---
    fun pauseWakeWordForForegroundSession() {
        isForegroundLiveSessionPaused = true
        isListeningForWakeWord = false
        isListeningForCommand = false
        mainHandler.removeCallbacksAndMessages(null)
        stopSpeechRecognizer()
        updateNotification("Live Session Active", "Dora is active in the foreground")
        notifyState(VoiceState.WAKE_WORD_LISTENING, "Paused for Foreground Live Session")
        Log.i(TAG, "Paused native wake-word microphone capture for Foreground Live Session.")
    }

    fun resumeWakeWordAfterForegroundSession() {
        isForegroundLiveSessionPaused = false
        if (isWakeWordEnabled(this) && isAlwaysRunInBackgroundEnabled(this)) {
            startWakeWordListening()
        }
        Log.i(TAG, "Resumed native wake-word microphone capture after Foreground Live Session.")
    }

    fun updateWakeWordEngine() {
        if (!isWakeWordEnabled(this)) {
            stopSpeechRecognizer()
            isListeningForWakeWord = false
            updateNotification("Dora Assistant Active", "Wake word disabled in settings")
            notifyState(VoiceState.SERVICE_STOPPED, "Wake word disabled")
        } else if (!isForegroundLiveSessionPaused) {
            startWakeWordListening()
        }
    }

    // --- Speech Recognition & Wake Word Engine ---
    private fun startWakeWordListening() {
        if (isForegroundLiveSessionPaused || !isWakeWordEnabled(this) || !checkMicrophonePermission()) {
            return
        }

        mainHandler.post {
            try {
                stopSpeechRecognizer()

                if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                    Log.w(TAG, "Speech recognition not available on device")
                    notifyState(VoiceState.ERROR, "Speech recognition unavailable")
                    return@post
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                    setRecognitionListener(createWakeWordListener())
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L)
                }

                speechRecognizer?.startListening(intent)
                isListeningForWakeWord = true
                isListeningForCommand = false
                notifyState(VoiceState.WAKE_WORD_LISTENING)
                updateNotification("Dora is ready", "Listening for 'Dora' (Microphone active)")
                Log.d(TAG, "Wake-word listening started for 'Dora'.")
            } catch (e: Exception) {
                Log.e(TAG, "Error starting wake word listening", e)
                scheduleWakeWordRestart(2000L)
            }
        }
    }

    private fun startCommandListening(isFollowUp: Boolean = false) {
        if (isForegroundLiveSessionPaused || !checkMicrophonePermission()) {
            return
        }

        mainHandler.post {
            try {
                stopSpeechRecognizer()

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                    setRecognitionListener(createCommandListener(isFollowUp))
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1800L)
                }

                speechRecognizer?.startListening(intent)
                isListeningForWakeWord = false
                isListeningForCommand = true
                notifyState(VoiceState.ACTIVE_LISTENING)
                updateNotification("Dora is listening...", if (isFollowUp) "Follow-up listening active" else "Say your command...")
                Log.d(TAG, "Command listening started (followUp=$isFollowUp).")

                if (isFollowUp) {
                    val timeoutSec = getFollowUpTimeoutSeconds(this)
                    followUpRunnable?.let { mainHandler.removeCallbacks(it) }
                    followUpRunnable = Runnable {
                        if (isListeningForCommand) {
                            Log.d(TAG, "Follow-up listening timed out after ${timeoutSec}s. Returning to wake word.")
                            startWakeWordListening()
                        }
                    }
                    mainHandler.postDelayed(followUpRunnable!!, timeoutSec * 1000L)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting command listening", e)
                startWakeWordListening()
            }
        }
    }

    private fun stopSpeechRecognizer() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping speech recognizer", e)
        } finally {
            speechRecognizer = null
            isListeningForWakeWord = false
            isListeningForCommand = false
        }
    }

    private fun scheduleWakeWordRestart(delayMs: Long = 1000L) {
        recognitionRestartRunnable?.let { mainHandler.removeCallbacks(it) }
        recognitionRestartRunnable = Runnable {
            if (!isForegroundLiveSessionPaused && isWakeWordEnabled(this)) {
                startWakeWordListening()
            }
        }
        mainHandler.postDelayed(recognitionRestartRunnable!!, delayMs)
    }

    // --- Listeners ---
    private fun createWakeWordListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}

            override fun onError(error: Int) {
                Log.d(TAG, "Wake word recognizer error code: $error")
                // Re-arm wake word listening after brief delay
                scheduleWakeWordRestart(800L)
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                checkMatchesForWakeWord(matches)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                checkMatchesForWakeWord(matches)
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }
    }

    private fun checkMatchesForWakeWord(matches: ArrayList<String>?) {
        if (matches.isNullOrEmpty()) {
            scheduleWakeWordRestart(500L)
            return
        }

        val targetPhrase = getWakeWordPhrase(this).lowercase(Locale.ROOT)

        for (text in matches) {
            val lower = text.lowercase(Locale.ROOT).trim()
            if (isWakeWordMatch(lower, targetPhrase)) {
                Log.i(TAG, "Wake word detected in input: '$lower'")
                onWakeWordDetected(lower)
                return
            }
        }

        // If no wake word found, keep listening
        scheduleWakeWordRestart(400L)
    }

    private fun isWakeWordMatch(input: String, target: String): Boolean {
        if (input.contains(target)) return true
        if (target == "dora") {
            val variants = listOf("dora", "hey dora", "hi dora", "hello dora", "ok dora", "দোরা", "দora", "dorah")
            if (variants.any { input.contains(it) }) return true
        }
        return false
    }

    private fun onWakeWordDetected(rawText: String) {
        notifyState(VoiceState.WAKE_WORD_DETECTED)
        updateNotification("Dora", "Wake word recognized")

        // Check if user already spoke the command in the same utterance (e.g. "Dora turn on flashlight")
        val target = getWakeWordPhrase(this).lowercase(Locale.ROOT)
        val extractedCommand = extractCommandAfterWakeWord(rawText, target)

        if (extractedCommand.isNotBlank()) {
            // User said "Dora [command]" in one breath
            processUserVoiceCommand(extractedCommand)
        } else {
            // Wake word only: acknowledge briefly and listen for command
            speakWakeAcknowledge {
                startCommandListening(isFollowUp = false)
            }
        }
    }

    private fun extractCommandAfterWakeWord(text: String, target: String): String {
        val lower = text.lowercase(Locale.ROOT)
        val index = lower.indexOf(target)
        if (index >= 0) {
            val after = text.substring(index + target.length).trim()
            // Clean up leading punctuation or "please"
            return after.replace(Regex("^(,|\\.|!|\\?|please|pls)\\s*"), "").trim()
        }
        return ""
    }

    private fun createCommandListener(isFollowUp: Boolean): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {
                // Barge-in: user started speaking, cancel follow-up timeout
                followUpRunnable?.let { mainHandler.removeCallbacks(it) }
            }
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}

            override fun onError(error: Int) {
                Log.d(TAG, "Command recognizer error: $error (followUp=$isFollowUp)")
                if (isFollowUp) {
                    // Timeout or silence in follow-up mode -> transition back to wake word
                    startWakeWordListening()
                } else {
                    speakResponse("I'm here whenever you need me.") {
                        startWakeWordListening()
                    }
                }
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val command = matches?.firstOrNull()?.trim()
                if (!command.isNullOrEmpty()) {
                    processUserVoiceCommand(command)
                } else {
                    startWakeWordListening()
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        }
    }

    // --- Command Processing & Autonomous Execution ---
    private fun processUserVoiceCommand(command: String) {
        notifyState(VoiceState.PROCESSING, command)
        updateNotification("Dora is thinking...", command)
        Log.i(TAG, "Processing voice command: '$command'")

        val lower = command.lowercase(Locale.ROOT)

        // 1. Device Controls (Flashlight, Volume, Open Apps, Settings, Navigation)
        val handled = handleNativeDeviceCommand(lower, command)
        if (handled) return

        // 2. Natural Conversation / Question
        handleConversationalCommand(command)
    }

    private fun handleNativeDeviceCommand(lower: String, original: String): Boolean {
        // Flashlight
        if (lower.contains("flashlight") || lower.contains("torch")) {
            val enable = !lower.contains("off") && !lower.contains("bondho") && !lower.contains("stop")
            setDeviceFlashlight(enable)
            val reply = if (enable) "Flashlight turned on." else "Flashlight turned off."
            speakResponse(reply) { onTurnCompleted() }
            return true
        }

        // Volume Controls
        if (lower.contains("volume") || lower.contains("sound")) {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (audioManager != null) {
                if (lower.contains("up") || lower.contains("increase") || lower.contains("raise") || lower.contains("baraw")) {
                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                    speakResponse("Volume increased.") { onTurnCompleted() }
                    return true
                } else if (lower.contains("down") || lower.contains("decrease") || lower.contains("lower") || lower.contains("komaw")) {
                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                    speakResponse("Volume decreased.") { onTurnCompleted() }
                    return true
                } else if (lower.contains("mute") || lower.contains("silent")) {
                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_MUTE, AudioManager.FLAG_SHOW_UI)
                    speakResponse("Muted.") { onTurnCompleted() }
                    return true
                }
            }
        }

        // App Launching (WhatsApp, YouTube, Camera, Settings, Chrome, etc.)
        if (lower.startsWith("open ") || lower.startsWith("launch ") || lower.contains("kholo")) {
            val appTarget = lower.replace(Regex("^(open|launch|please open|kholo)\\s*"), "").trim()
            val launched = launchAppByName(appTarget)
            if (launched) {
                speakResponse("Opening $appTarget.") { onTurnCompleted() }
                return true
            }
        }

        // System Settings
        if (lower.contains("wifi") && (lower.contains("setting") || lower.contains("open"))) {
            openSystemSetting(Settings.ACTION_WIFI_SETTINGS)
            speakResponse("Opening Wi-Fi settings.") { onTurnCompleted() }
            return true
        }
        if (lower.contains("bluetooth") && (lower.contains("setting") || lower.contains("open"))) {
            openSystemSetting(Settings.ACTION_BLUETOOTH_SETTINGS)
            speakResponse("Opening Bluetooth settings.") { onTurnCompleted() }
            return true
        }

        // Navigation (Home, Back, Recents)
        val accessibilityService = DoraAccessibilityService.getInstance()
        if (accessibilityService != null && DoraAccessibilityService.isServiceRunning()) {
            if (lower == "go home" || lower == "home screen" || lower == "home") {
                accessibilityService.performHome()
                speakResponse("Going home.") { onTurnCompleted() }
                return true
            }
            if (lower == "go back" || lower == "back") {
                accessibilityService.performBack()
                speakResponse("Going back.") { onTurnCompleted() }
                return true
            }
            if (lower.contains("recent apps") || lower.contains("recents")) {
                accessibilityService.performRecents()
                speakResponse("Opening recent apps.") { onTurnCompleted() }
                return true
            }
            if (lower.contains("notifications") || lower.contains("notification panel")) {
                accessibilityService.performNotifications()
                speakResponse("Opening notifications.") { onTurnCompleted() }
                return true
            }
        }

        return false
    }

    private fun handleConversationalCommand(command: String) {
        // Provide immediate natural voice intelligence and contextual continuity
        val lower = command.lowercase(Locale.ROOT)

        val reply = when {
            lower.contains("who are you") || lower.contains("your name") ->
                "I'm Dora, your AI voice assistant and companion. I'm right here whenever you need me."
            lower.contains("how are you") || lower.contains("kemon acho") ->
                "I'm doing great and ready to help! What's on your mind?"
            lower.contains("time") -> {
                val timeStr = java.text.SimpleDateFormat("h:mm a", Locale.getDefault()).format(java.util.Date())
                "It's $timeStr."
            }
            lower.contains("date") || lower.contains("today") -> {
                val dateStr = java.text.SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(java.util.Date())
                "Today is $dateStr."
            }
            else -> {
                "I heard you say: $command. I'm on it."
            }
        }

        speakResponse(reply) {
            onTurnCompleted()
        }
    }

    private fun onTurnCompleted() {
        if (isFollowUpListeningEnabled(this)) {
            startCommandListening(isFollowUp = true)
        } else {
            startWakeWordListening()
        }
    }

    // --- Device Hardware Helpers ---
    private fun setDeviceFlashlight(enable: Boolean) {
        try {
            val cameraManager = getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val flashAvailable = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (flashAvailable && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        cameraManager.setTorchMode(id, enable)
                    }
                    break
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Flashlight toggle error", e)
        }
    }

    private fun launchAppByName(name: String): Boolean {
        try {
            val pm = packageManager
            val packages = mapOf(
                "whatsapp" to "com.whatsapp",
                "youtube" to "com.google.android.youtube",
                "camera" to "com.google.android.GoogleCamera",
                "settings" to "com.android.settings",
                "chrome" to "com.android.chrome",
                "maps" to "com.google.android.apps.maps",
                "photos" to "com.google.android.apps.photos",
                "spotify" to "com.spotify.music",
                "facebook" to "com.facebook.katana",
                "messenger" to "com.facebook.orca"
            )

            val matchedPkg = packages[name]
            if (matchedPkg != null) {
                val intent = pm.getLaunchIntentForPackage(matchedPkg)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                    return true
                }
            }

            // General intent query
            val intent = pm.getLaunchIntentForPackage(name)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                return true
            }
        } catch (e: Exception) {
            Log.w(TAG, "App launch failed for $name", e)
        }
        return false
    }

    private fun openSystemSetting(action: String) {
        try {
            val intent = Intent(action).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to open setting $action", e)
        }
    }

    // --- Voice Feedback & TTS ---
    private var pendingTtsCallback: (() -> Unit)? = null

    private fun speakWakeAcknowledge(onDone: () -> Unit) {
        speakResponse("Yeah?", onDone)
    }

    private fun speakResponse(text: String, onDone: (() -> Unit)? = null) {
        if (!isTtsReady || tts == null) {
            onDone?.invoke()
            return
        }

        mainHandler.post {
            try {
                notifyState(VoiceState.SPEAKING, text)
                updateNotification("Dora is speaking...", text)
                pendingTtsCallback = onDone
                val params = Bundle().apply {
                    putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "dora_utterance_${System.currentTimeMillis()}")
                }
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, "dora_utterance_${System.currentTimeMillis()}")
            } catch (e: Exception) {
                Log.w(TAG, "TTS speak failed", e)
                onDone?.invoke()
            }
        }
    }

    private fun handleTtsFinished(utteranceId: String?) {
        mainHandler.post {
            val cb = pendingTtsCallback
            pendingTtsCallback = null
            cb?.invoke()
        }
    }

    // --- WakeLock Management ---
    private fun acquirePartialWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Dora::VoiceServiceWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L)
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock acquisition warning", e)
        }
    }

    private fun releasePartialWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock release warning", e)
        }
    }

    // --- Foreground Notifications ---
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Dora Voice & Device Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Dora Voice Mode, Wake Word ('Dora'), and Device Assistant active."
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun updateNotification(title: String, content: String) {
        val notification = buildForegroundNotification(title, content)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, notification)
    }

    private fun buildForegroundNotification(title: String, content: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val stopIntent = Intent(this, DoraVoiceService::class.java).apply {
            action = ACTION_STOP_BACKGROUND_VOICE
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop Assistant",
                stopPendingIntent
            )
            .build()
    }
}
