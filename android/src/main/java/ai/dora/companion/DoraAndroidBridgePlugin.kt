package ai.dora.companion

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Dora Android Companion Bridge Plugin
 * 
 * Exposes native Android application management and accessibility capabilities
 * to the Dora React/Web layer via Capacitor / JavaScript interface.
 */
class DoraAndroidBridgePlugin(private val context: Context) {

    companion object {
        private const val TAG = "DoraAndroidBridge"
    }

    /**
     * Checks accessibility permission status and device identity
     */
    fun checkAccessibility(): String {
        val isEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(context)
        val isRunning = DoraAccessibilityService.isServiceRunning()
        
        val response = JSONObject().apply {
            put("enabled", isEnabled)
            put("running", isRunning)
            put("model", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("version", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        }
        return response.toString()
    }

    /**
     * Launches an installed Android application by package identifier
     */
    fun openApp(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val appName = options.optString("appName", "Application")
            val packageName = options.optString("packageName", "")

            if (packageName.isBlank()) {
                result.put("success", false)
                result.put("error", "Package name cannot be empty")
                return result.toString()
            }

            val packageManager = context.packageManager
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                context.startActivity(launchIntent)

                result.put("success", true)
                result.put("message", "Successfully launched $appName ($packageName)")
                Log.i(TAG, "Launched application: $packageName")
            } else {
                result.put("success", false)
                result.put("error", "Application '$appName' ($packageName) is not installed or has no launcher activity.")
                Log.w(TAG, "Launch intent was null for: $packageName")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch application", e)
            result.put("success", false)
            result.put("error", e.message ?: "Unknown native error launching application")
        }
        return result.toString()
    }

    /**
     * Enumerates all launchable applications installed on the Android device
     */
    fun getInstalledApplications(): String {
        val result = JSONObject()
        val appList = JSONArray()

        try {
            val packageManager = context.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val resolveInfoList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                packageManager.queryIntentActivities(mainIntent, 0)
            }

            for (resolveInfo in resolveInfoList) {
                val appObject = JSONObject().apply {
                    put("appName", resolveInfo.loadLabel(packageManager).toString())
                    put("packageName", resolveInfo.activityInfo.packageName)
                }
                appList.put(appObject)
            }

            result.put("success", true)
            result.put("apps", appList)
        } catch (e: Exception) {
            Log.e(TAG, "Error querying installed applications", e)
            result.put("success", false)
            result.put("error", e.message)
            result.put("apps", JSONArray())
        }

        return result.toString()
    }
}
