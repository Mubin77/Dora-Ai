package ai.dora.companion

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/**
 * Dora Android Bridge Plugin
 * 
 * Exposes native Android application management and accessibility capabilities
 * to both the native Android Activity and the Dora React/WebView layer via JavaScript interface.
 */
class DoraAndroidBridgePlugin(private val context: Context) {

    companion object {
        private const val TAG = "DoraAndroidBridge"

        // Common application package map for instant local resolution
        private val COMMON_PACKAGE_MAP = mapOf(
            "youtube" to "com.google.android.youtube",
            "whatsapp" to "com.whatsapp",
            "chrome" to "com.android.chrome",
            "browser" to "com.android.chrome",
            "google maps" to "com.google.android.apps.maps",
            "maps" to "com.google.android.apps.maps",
            "settings" to "com.android.settings",
            "camera" to "com.android.camera",
            "photos" to "com.google.android.apps.photos",
            "gallery" to "com.google.android.apps.photos",
            "spotify" to "com.spotify.music",
            "gmail" to "com.google.android.gm",
            "play store" to "com.android.vending",
            "clock" to "com.google.android.deskclock",
            "calculator" to "com.google.android.calculator",
            "contacts" to "com.google.android.contacts",
            "messages" to "com.google.android.apps.messaging",
            "telegram" to "org.telegram.messenger",
            "facebook" to "com.facebook.katana",
            "instagram" to "com.instagram.android",
            "twitter" to "com.twitter.android",
            "x" to "com.twitter.android"
        )
    }

    /**
     * Checks accessibility permission status and device identity
     */
    @JavascriptInterface
    fun checkAccessibility(): String {
        val isEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(context)
        val isRunning = DoraAccessibilityService.isServiceRunning()
        
        val response = JSONObject().apply {
            put("enabled", isEnabled)
            put("running", isRunning)
            put("model", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            put("version", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        }
        return response.toString()
    }

    /**
     * Resolves app package from name or common package dictionary
     */
    fun resolvePackage(appName: String): String? {
        val cleanName = appName.trim().lowercase()
        
        // 1. Direct map check
        COMMON_PACKAGE_MAP[cleanName]?.let { return it }

        // 2. Contains check in common map
        for ((key, pkg) in COMMON_PACKAGE_MAP) {
            if (cleanName.contains(key) || key.contains(cleanName)) {
                return pkg
            }
        }

        // 3. Search installed applications
        try {
            val pm = context.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val list = pm.queryIntentActivities(mainIntent, 0)
            for (info in list) {
                val label = info.loadLabel(pm).toString().lowercase()
                if (label == cleanName || label.contains(cleanName) || cleanName.contains(label)) {
                    return info.activityInfo.packageName
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Package resolution query exception: ${e.message}")
        }

        return null
    }

    /**
     * Launches an installed Android application by package identifier or natural app name
     */
    @JavascriptInterface
    fun openApp(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val appName = options.optString("appName", "Application").trim()
            var packageName = options.optString("packageName", "").trim()

            if (packageName.isBlank()) {
                val resolved = resolvePackage(appName)
                if (resolved != null) {
                    packageName = resolved
                } else {
                    result.put("success", false)
                    result.put("error", "Could not resolve package for '$appName'. Ensure the app is installed.")
                    return result.toString()
                }
            }

            val packageManager = context.packageManager
            var launchIntent = packageManager.getLaunchIntentForPackage(packageName)

            // Fallback for settings or specific intents if standard launch intent is null
            if (launchIntent == null && packageName == "com.android.settings") {
                launchIntent = Intent(android.provider.Settings.ACTION_SETTINGS)
            }

            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                context.startActivity(launchIntent)

                result.put("success", true)
                result.put("message", "Successfully opened $appName ($packageName)")
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
     * Executes natural language assistant commands (English + Bengali / Banglish)
     */
    fun executeNaturalCommand(rawCommand: String): JSONObject {
        val command = rawCommand.trim().lowercase()
        val result = JSONObject()

        // 1. YouTube commands ("youtube kholo", "open youtube", "open youtube app")
        if (command.contains("youtube") || command.contains("ইউটিউব")) {
            val openRes = JSONObject(openApp(JSONObject().apply {
                put("appName", "YouTube")
                put("packageName", "com.google.android.youtube")
            }.toString()))
            return openRes
        }

        // 2. WhatsApp commands ("whatsapp kholo", "open whatsapp", "হোয়াটসঅ্যাপ")
        if (command.contains("whatsapp") || command.contains("হোয়াটসঅ্যাপ") || command.contains("watsapp")) {
            val openRes = JSONObject(openApp(JSONObject().apply {
                put("appName", "WhatsApp")
                put("packageName", "com.whatsapp")
            }.toString()))
            return openRes
        }

        // 3. Settings ("settings kholo", "open settings", "সেটিংস")
        if (command.contains("settings") || command.contains("setting") || command.contains("সেটিংস")) {
            val openRes = JSONObject(openApp(JSONObject().apply {
                put("appName", "Settings")
                put("packageName", "com.android.settings")
            }.toString()))
            return openRes
        }

        // 4. Chrome / Browser ("chrome kholo", "open chrome", "browser kholo")
        if (command.contains("chrome") || command.contains("browser") || command.contains("ক্রোম")) {
            val openRes = JSONObject(openApp(JSONObject().apply {
                put("appName", "Google Chrome")
                put("packageName", "com.android.chrome")
            }.toString()))
            return openRes
        }

        // 5. Navigation: Home ("go home", "home jao", "home", "হোম")
        if (command == "home" || command.contains("go home") || command.contains("home jao") || command.contains("হোম")) {
            val homeRes = JSONObject(pressHome())
            return homeRes
        }

        // 6. Navigation: Back ("go back", "back jao", "back", "পিছনে")
        if (command == "back" || command.contains("go back") || command.contains("back jao") || command.contains("পিছনে")) {
            val backRes = JSONObject(pressBack())
            return backRes
        }

        // 7. Scroll Down ("scroll down", "niche scroll", "নিচে স্ক্রল")
        if (command.contains("scroll down") || command.contains("niche scroll") || command.contains("down")) {
            val scrollRes = JSONObject(scrollWindow(JSONObject().apply { put("direction", "down") }.toString()))
            return scrollRes
        }

        // 8. Scroll Up ("scroll up", "upore scroll", "উপরে স্ক্রল")
        if (command.contains("scroll up") || command.contains("upore scroll") || command.contains("up")) {
            val scrollRes = JSONObject(scrollWindow(JSONObject().apply { put("direction", "up") }.toString()))
            return scrollRes
        }

        // 9. Inspect Screen ("read screen", "screen dekho", "স্ক্রিন")
        if (command.contains("read screen") || command.contains("inspect") || command.contains("screen dekho")) {
            val readRes = JSONObject(readScreen(null))
            return readRes
        }

        // 10. General "open [App]" / "[App] kholo"
        val openPrefixes = listOf("open ", "launch ", "start ", "kholo ", "chalu koro ")
        var targetAppName = command
        for (prefix in openPrefixes) {
            if (targetAppName.startsWith(prefix)) {
                targetAppName = targetAppName.removePrefix(prefix).trim()
                break
            }
        }
        if (targetAppName.endsWith(" kholo")) {
            targetAppName = targetAppName.removeSuffix(" kholo").trim()
        } else if (targetAppName.endsWith(" open koro")) {
            targetAppName = targetAppName.removeSuffix(" open koro").trim()
        }

        val resolvedPkg = resolvePackage(targetAppName)
        if (resolvedPkg != null) {
            return JSONObject(openApp(JSONObject().apply {
                put("appName", targetAppName.replaceFirstChar { it.uppercase() })
                put("packageName", resolvedPkg)
            }.toString()))
        }

        result.put("success", false)
        result.put("error", "Could not interpret command: '$rawCommand'. Try 'YouTube kholo', 'Open WhatsApp', 'Go Home', or 'Scroll Down'.")
        return result
    }

    /**
     * Enumerates all launchable applications installed on the Android device
     */
    @JavascriptInterface
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
    @JavascriptInterface
    fun readScreen(optionsJson: String?): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active. Enable in Android Settings.")
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
    @JavascriptInterface
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
    @JavascriptInterface
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
    @JavascriptInterface
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

    /**
     * Performs scrolling
     */
    @JavascriptInterface
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
    @JavascriptInterface
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
    @JavascriptInterface
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

