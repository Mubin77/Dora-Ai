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

    // =========================================================================
    // Native UI Interaction Methods
    // =========================================================================

    /**
     * Reads active screen accessibility tree
     */
    fun readScreen(optionsJson: String?): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active in memory. Enable in Android Settings.")
            return result.toString()
        }

        try {
            val includeNonClickable = if (optionsJson != null) {
                JSONObject(optionsJson).optBoolean("includeNonClickable", true)
            } else true

            val screen = service.dumpScreenHierarchy(includeNonClickable)
            result.put("success", true)
            result.put("screen", screen)
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to inspect accessibility tree")
        }
        return result.toString()
    }

    /**
     * Taps a UI node or screen coordinate
     */
    fun tapNode(optionsJson: String): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }

        try {
            val opts = JSONObject(optionsJson)
            val resId = opts.optString("resourceId").takeIf { it.isNotBlank() }
            val text = opts.optString("text").takeIf { it.isNotBlank() }
            val desc = opts.optString("contentDescription").takeIf { it.isNotBlank() }
            val x = if (opts.has("x")) opts.getDouble("x").toFloat() else null
            val y = if (opts.has("y")) opts.getDouble("y").toFloat() else null

            var isDone = false
            service.tapNodeOrCoords(resId, text, desc, x, y) { success, msg ->
                result.put("success", success)
                if (msg != null) {
                    if (success) result.put("message", msg) else result.put("error", msg)
                }
                isDone = true
            }

            var attempts = 0
            while (!isDone && attempts < 20) {
                Thread.sleep(25)
                attempts++
            }

            if (!result.has("success")) {
                result.put("success", false)
                result.put("error", "Tap operation timed out.")
            }
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Tap exception")
        }
        return result.toString()
    }

    /**
     * Types text into editable field
     */
    fun typeTextOnNode(optionsJson: String): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }

        try {
            val opts = JSONObject(optionsJson)
            val text = opts.optString("text", "")
            val resId = opts.optString("resourceId").takeIf { it.isNotBlank() }
            val clearFirst = opts.optBoolean("clearFirst", false)

            val success = service.typeTextIntoActiveField(text, resId, clearFirst)
            result.put("success", success)
            if (success) {
                result.put("message", "Typed ${text.length} characters successfully.")
            } else {
                result.put("error", "Failed to set text on active editable node.")
            }
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Type text exception")
        }
        return result.toString()
    }

    /**
     * Performs directional swipe
     */
    fun swipeGesture(optionsJson: String): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }

        try {
            val opts = JSONObject(optionsJson)
            val direction = opts.optString("direction", "up")
            val durationMs = opts.optLong("durationMs", 300L)

            var isDone = false
            val dispatched = service.performSwipe(direction, durationMs) { success ->
                result.put("success", success)
                if (!success) result.put("error", "Swipe gesture cancelled")
                isDoneOk(success)
                isDone = true
            }

            if (!dispatched) {
                result.put("success", false)
                result.put("error", "Failed to dispatch swipe gesture.")
                return result.toString()
            }

            var attempts = 0
            while (!isDone && attempts < 25) {
                Thread.sleep(25)
                attempts++
            }

            if (!result.has("success")) {
                result.put("success", true)
                result.put("message", "Swiped $direction")
            }
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Swipe exception")
        }
        return result.toString()
    }

    private fun isDoneOk(s: Boolean) {}

    /**
     * Performs scrolling
     */
    fun scrollWindow(optionsJson: String): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }

        try {
            val opts = JSONObject(optionsJson)
            val direction = opts.optString("direction", "down")
            val success = service.performScroll(direction)
            result.put("success", success)
            if (success) {
                result.put("message", "Scrolled $direction successfully.")
            } else {
                result.put("error", "Scroll action was not handled by active node.")
            }
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Scroll exception")
        }
        return result.toString()
    }

    /**
     * Navigates back
     */
    fun pressBack(): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }
        val success = service.performBack()
        result.put("success", success)
        if (success) result.put("message", "Navigated back") else result.put("error", "Back action failed")
        return result.toString()
    }

    /**
     * Navigates home
     */
    fun pressHome(): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active.")
            return result.toString()
        }
        val success = service.performHome()
        result.put("success", success)
        if (success) result.put("message", "Navigated home") else result.put("error", "Home action failed")
        return result.toString()
    }
}
