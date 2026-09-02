package ai.dora.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service required for Android 14+ (API 34) MediaProjection.
 * Ensures the screen capture session is strictly tied to a user-visible foreground service
 * with foregroundServiceType="mediaProjection".
 */
class DoraScreenCaptureService : Service() {

    companion object {
        private const val TAG = "DoraScreenCaptureSvc"
        private const val NOTIFICATION_ID = 2024
        private const val CHANNEL_ID = "dora_screen_capture_channel"
        private const val CHANNEL_NAME = "Dora Screen Sharing"

        const val ACTION_START_CAPTURE = "ai.dora.companion.action.START_SCREEN_CAPTURE"
        const val ACTION_STOP_CAPTURE = "ai.dora.companion.action.STOP_SCREEN_CAPTURE"

        fun start(context: Context) {
            val intent = Intent(context, DoraScreenCaptureService::class.java).apply {
                action = ACTION_START_CAPTURE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, DoraScreenCaptureService::class.java).apply {
                action = ACTION_STOP_CAPTURE
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START_CAPTURE
        Log.i(TAG, "DoraScreenCaptureService onStartCommand action=$action")

        if (action == ACTION_STOP_CAPTURE) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        startInForeground()
        return START_STICKY
    }

    private fun startInForeground() {
        val notification = buildForegroundNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            Log.i(TAG, "DoraScreenCaptureService successfully started in foreground")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to startForeground for MediaProjection", e)
        }
    }

    private fun stopForegroundService() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping foreground: ${e.message}")
        }
        stopSelf()
        Log.i(TAG, "DoraScreenCaptureService stopped")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val existing = notificationManager?.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Active screen sharing for Dora Live Companion"
                    setShowBadge(false)
                }
                notificationManager?.createNotificationChannel(channel)
            }
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = if (launchIntent != null) {
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            PendingIntent.getActivity(this, 0, launchIntent, flags)
        } else null

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Dora Live Session Screen Sharing")
            .setContentText("Screen stream is active with Dora AI")
            .setSmallIcon(android.R.drawable.ic_menu_slideshow)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    override fun onDestroy() {
        stopForegroundService()
        super.onDestroy()
    }
}
