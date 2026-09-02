package ai.dora.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Dora Native Voice Background Service (Phase N)
 * 
 * Provides continuous background voice readiness and autonomous execution:
 * - Runs as an authorized Android Foreground Service with microphone / connected device types
 * - Manages battery-efficient wake locks during active processing
 * - Provides immediate notification controls to Open Dora or Pause/Stop background mode
 * - Persists "Always Run in Background" state across app reboots
 */
class DoraVoiceService : Service() {

    companion object {
        private const val TAG = "DoraVoiceService"
        const val CHANNEL_ID = "dora_voice_background_channel"
        const val NOTIFICATION_ID = 1002
        const val PREFS_NAME = "dora_settings_prefs"
        const val KEY_ALWAYS_RUN_IN_BACKGROUND = "always_run_in_background"

        const val ACTION_START_BACKGROUND_VOICE = "ai.dora.companion.START_BACKGROUND_VOICE"
        const val ACTION_STOP_BACKGROUND_VOICE = "ai.dora.companion.STOP_BACKGROUND_VOICE"

        private var isRunning = false

        fun isServiceRunning(): Boolean = isRunning

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

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()

        val notification = buildForegroundNotification()

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
        Log.i(TAG, "Dora Background Voice Service active.")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_BACKGROUND_VOICE) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        releasePartialWakeLock()
        Log.i(TAG, "Dora Background Voice Service destroyed.")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun acquirePartialWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Dora::VoiceServiceWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L) // 10 minutes timeout safety
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

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Dora Voice & Device Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Dora Voice Mode & Autonomous Device Control active in background."
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
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
            .setContentTitle("Dora Assistant Active")
            .setContentText("Voice mode & device control ready")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop Background Mode",
                stopPendingIntent
            )
            .build()
    }
}
