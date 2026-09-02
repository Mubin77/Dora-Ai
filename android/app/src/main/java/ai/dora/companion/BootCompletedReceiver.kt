package ai.dora.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Boot completed receiver to restore Dora background voice service
 * when "Always Run in Background" is enabled.
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || 
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.i("DoraBootReceiver", "Boot completed event received.")
            if (DoraVoiceService.isAlwaysRunInBackgroundEnabled(context)) {
                Log.i("DoraBootReceiver", "Always run in background enabled: starting DoraVoiceService.")
                DoraVoiceService.start(context)
            }
        }
    }
}
