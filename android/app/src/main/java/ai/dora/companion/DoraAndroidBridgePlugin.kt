package ai.dora.companion

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent
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
     * Opens Android Accessibility Settings page directly
     */
    @JavascriptInterface
    fun openAccessibilitySettings(): String {
        val result = JSONObject()
        try {
            val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Opened Accessibility Settings")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to open accessibility settings")
        }
        return result.toString()
    }

    /**
     * Checks runtime microphone permission status
     * Returns: "GRANTED", "DENIED", "PERMANENTLY_DENIED", or "NOT_REQUESTED"
     */
    @JavascriptInterface
    fun checkMicrophonePermission(): String {
        val activity = context as? MainActivity
        val status = activity?.checkAudioPermissionState() ?: run {
            if (androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                "GRANTED"
            } else {
                "NOT_REQUESTED"
            }
        }
        val isGranted = status == "GRANTED"
        val response = JSONObject().apply {
            put("status", status)
            put("granted", isGranted)
            put("canRequest", status != "PERMANENTLY_DENIED")
        }
        return response.toString()
    }

    /**
     * Requests runtime microphone permission from the user
     */
    @JavascriptInterface
    fun requestMicrophonePermission(): String {
        val activity = context as? MainActivity
        val result = JSONObject()
        if (activity != null) {
            activity.runOnUiThread {
                activity.requestAudioPermission()
            }
            result.put("success", true)
            result.put("message", "Microphone permission requested")
        } else {
            result.put("success", false)
            result.put("error", "Activity not available")
        }
        return result.toString()
    }

    /**
     * Checks runtime camera permission status
     */
    @JavascriptInterface
    fun checkCameraPermission(): String {
        val activity = context as? MainActivity
        val status = activity?.checkCameraPermissionState() ?: run {
            if (androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                "GRANTED"
            } else {
                "NOT_REQUESTED"
            }
        }
        val isGranted = status == "GRANTED"
        val response = JSONObject().apply {
            put("status", status)
            put("granted", isGranted)
            put("canRequest", status != "PERMANENTLY_DENIED")
        }
        return response.toString()
    }

    /**
     * Requests runtime camera permission from the user
     */
    @JavascriptInterface
    fun requestCameraPermission(): String {
        val activity = context as? MainActivity
        val result = JSONObject()
        if (activity != null) {
            activity.runOnUiThread {
                activity.requestCameraPermission()
            }
            result.put("success", true)
            result.put("message", "Camera permission requested")
        } else {
            result.put("success", false)
            result.put("error", "Activity not available")
        }
        return result.toString()
    }

    /**
     * Opens Android Application Details Settings for Dora
     */
    @JavascriptInterface
    fun openAppSettings(): String {
        val result = JSONObject()
        try {
            val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Opened App Settings")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to open app settings")
        }
        return result.toString()
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

        // 1. Flashlight ("flashlight on", "light jalao", "torch chalu koro", "flashlight off", "light nibhao")
        if (command.contains("flashlight on") || command.contains("torch on") || command.contains("light jalao") ||
            command.contains("torch jalao") || command.contains("torch chalu") || command.contains("ফ্ল্যাশলাইট জ্বালাও")) {
            return JSONObject(setFlashlight(JSONObject().apply { put("enabled", true) }.toString()))
        }
        if (command.contains("flashlight off") || command.contains("torch off") || command.contains("light nibhao") ||
            command.contains("torch nibhao") || command.contains("torch bondho") || command.contains("ফ্ল্যাশলাইট বন্ধ")) {
            return JSONObject(setFlashlight(JSONObject().apply { put("enabled", false) }.toString()))
        }

        // 2. Volume controls ("volume baraw", "volume komaw", "volume up", "volume down", "mute", "unmute")
        if (command.contains("volume up") || command.contains("volume baraw") || command.contains("sound baraw") ||
            command.contains("ভলিউম বাড়াও") || command.contains("আওয়াজ বাড়াও")) {
            return JSONObject(adjustVolume(JSONObject().apply { put("direction", "up") }.toString()))
        }
        if (command.contains("volume down") || command.contains("volume komaw") || command.contains("sound komaw") ||
            command.contains("ভলিউম কমাও") || command.contains("আওয়াজ কমাও")) {
            return JSONObject(adjustVolume(JSONObject().apply { put("direction", "down") }.toString()))
        }
        if (command.contains("mute") || command.contains("sound off") || command.contains("নিঃশব্দ")) {
            return JSONObject(adjustVolume(JSONObject().apply { put("direction", "mute") }.toString()))
        }

        // 3. Media Controls ("play music", "pause music", "next song", "previous song", "gaan chalao", "gaan bondho")
        if (command.contains("pause music") || command.contains("pause video") || command.contains("gaan bondho") || command.contains("থামাও")) {
            return JSONObject(controlMedia(JSONObject().apply { put("action", "pause") }.toString()))
        }
        if (command.contains("play music") || command.contains("resume music") || command.contains("gaan chalao") || command.contains("গান চালাও")) {
            return JSONObject(controlMedia(JSONObject().apply { put("action", "play") }.toString()))
        }
        if (command.contains("next song") || command.contains("next track") || command.contains("porer gaan")) {
            return JSONObject(controlMedia(JSONObject().apply { put("action", "next") }.toString()))
        }
        if (command.contains("previous song") || command.contains("prev track") || command.contains("ager gaan")) {
            return JSONObject(controlMedia(JSONObject().apply { put("action", "previous") }.toString()))
        }

        // 4. Quick System Settings (Wi-Fi, Bluetooth, Do Not Disturb)
        if (command.contains("wifi") || command.contains("wi-fi") || command.contains("ওয়াইফাই")) {
            return JSONObject(openWifiSettings())
        }
        if (command.contains("bluetooth") || command.contains("ব্লুটুথ")) {
            return JSONObject(openBluetoothSettings())
        }
        if (command.contains("dnd") || command.contains("do not disturb") || command.contains("disturb")) {
            return JSONObject(openDndSettings())
        }

        // 5. Phone Call ("call [Name/Number]", "[Name]-ke call dao", "call mom")
        val callMatch = Regex("(?:call|phone|ring)\\s+([0-9a-zA-Z\\s]+)|([0-9a-zA-Z\\s]+?)(?:-?ke|-?e)?\\s+(?:call|phone)\\s*(?:dao|koro)?").find(command)
        if (callMatch != null) {
            val recipient = (callMatch.groupValues[1].takeIf { it.isNotBlank() } ?: callMatch.groupValues[2]).trim()
            if (recipient.isNotBlank() && recipient != "me" && recipient != "back" && recipient != "dora") {
                return JSONObject(makePhoneCall(JSONObject().apply { put("recipient", recipient) }.toString()))
            }
        }

        // 6. Navigation: Recents, Notifications, Quick Settings
        if (command.contains("recent apps") || command.contains("recents") || command.contains("app switcher")) {
            return JSONObject(pressRecents())
        }
        if (command.contains("notifications") || command.contains("notification panel") || command.contains("নোটিফিকেশন")) {
            return JSONObject(openNotificationPanel())
        }
        if (command.contains("quick settings") || command.contains("control center")) {
            return JSONObject(openQuickSettings())
        }

        // 7. Navigation: Home ("go home", "home jao", "home", "হোম")
        if (command == "home" || command.contains("go home") || command.contains("home jao") || command.contains("হোম")) {
            return JSONObject(pressHome())
        }

        // 8. Navigation: Back ("go back", "back jao", "back", "পিছনে")
        if (command == "back" || command.contains("go back") || command.contains("back jao") || command.contains("পিছনে")) {
            return JSONObject(pressBack())
        }

        // 9. Scroll Down ("scroll down", "niche scroll", "নিচে স্ক্রল")
        if (command.contains("scroll down") || command.contains("niche scroll") || command.contains("down")) {
            return JSONObject(scrollWindow(JSONObject().apply { put("direction", "down") }.toString()))
        }

        // 10. Scroll Up ("scroll up", "upore scroll", "উপরে স্ক্রল")
        if (command.contains("scroll up") || command.contains("upore scroll") || command.contains("up")) {
            return JSONObject(scrollWindow(JSONObject().apply { put("direction", "up") }.toString()))
        }

        // 11. Inspect Screen ("read screen", "screen dekho", "স্ক্রিন")
        if (command.contains("read screen") || command.contains("inspect") || command.contains("screen dekho")) {
            return JSONObject(readScreen(null))
        }

        // 12. App Launching ("youtube kholo", "open whatsapp", "settings kholo", etc.)
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
        result.put("error", "Could not interpret command: '$rawCommand'. Try 'YouTube kholo', 'Flashlight on', 'Volume up', 'Go Home', or 'Scroll Down'.")
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

    /**
     * Toggles flashlight on or off
     */
    @JavascriptInterface
    fun setFlashlight(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val enabled = options.optBoolean("enabled", true)
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
            if (cameraManager != null) {
                val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                    val characteristics = cameraManager.getCameraCharacteristics(id)
                    characteristics.get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                }
                if (cameraId != null) {
                    cameraManager.setTorchMode(cameraId, enabled)
                    result.put("success", true)
                    result.put("message", if (enabled) "Flashlight turned on" else "Flashlight turned off")
                    return result.toString()
                }
            }
            result.put("success", false)
            result.put("error", "No flashlight hardware detected on this device")
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling flashlight", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to adjust flashlight")
        }
        return result.toString()
    }

    /**
     * Adjusts system stream volume (up, down, mute, unmute, max)
     */
    @JavascriptInterface
    fun adjustVolume(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val direction = options.optString("direction", "up").lowercase()
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (audioManager == null) {
                result.put("success", false)
                result.put("error", "AudioManager service not available")
                return result.toString()
            }

            when (direction) {
                "up" -> {
                    audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        AudioManager.ADJUST_RAISE,
                        AudioManager.FLAG_SHOW_UI
                    )
                    result.put("message", "Volume increased")
                }
                "down" -> {
                    audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        AudioManager.ADJUST_LOWER,
                        AudioManager.FLAG_SHOW_UI
                    )
                    result.put("message", "Volume decreased")
                }
                "mute" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        audioManager.adjustStreamVolume(
                            AudioManager.STREAM_MUSIC,
                            AudioManager.ADJUST_MUTE,
                            AudioManager.FLAG_SHOW_UI
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        audioManager.setStreamMute(AudioManager.STREAM_MUSIC, true)
                    }
                    result.put("message", "Audio muted")
                }
                "unmute" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        audioManager.adjustStreamVolume(
                            AudioManager.STREAM_MUSIC,
                            AudioManager.ADJUST_UNMUTE,
                            AudioManager.FLAG_SHOW_UI
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        audioManager.setStreamMute(AudioManager.STREAM_MUSIC, false)
                    }
                    result.put("message", "Audio unmuted")
                }
                "max" -> {
                    val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxVol, AudioManager.FLAG_SHOW_UI)
                    result.put("message", "Volume set to maximum")
                }
                else -> {
                    audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        AudioManager.ADJUST_SAME,
                        AudioManager.FLAG_SHOW_UI
                    )
                    result.put("message", "Volume unchanged")
                }
            }
            result.put("success", true)
        } catch (e: Exception) {
            Log.e(TAG, "Error adjusting volume", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to adjust volume")
        }
        return result.toString()
    }

    /**
     * Controls global media playback (play, pause, next, previous)
     */
    @JavascriptInterface
    fun controlMedia(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val action = options.optString("action", "play_pause").lowercase()
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (audioManager == null) {
                result.put("success", false)
                result.put("error", "AudioManager not available")
                return result.toString()
            }

            val keyCode = when (action) {
                "play" -> KeyEvent.KEYCODE_MEDIA_PLAY
                "pause" -> KeyEvent.KEYCODE_MEDIA_PAUSE
                "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
                "previous", "prev" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
                else -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
            }

            audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
            audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, keyCode))

            result.put("success", true)
            result.put("message", "Media action '$action' dispatched")
        } catch (e: Exception) {
            Log.e(TAG, "Error dispatching media control", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to control media playback")
        }
        return result.toString()
    }

    /**
     * Launches direct phone call or phone dialer
     */
    @JavascriptInterface
    fun makePhoneCall(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val recipient = options.optString("recipient", options.optString("phoneNumber", "")).trim()
            if (recipient.isBlank()) {
                val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(dialIntent)
                result.put("success", true)
                result.put("message", "Phone dialer opened")
                return result.toString()
            }

            val isNumber = recipient.replace("[+\\-()\\s]".toRegex(), "").all { it.isDigit() }
            val intent = if (isNumber) {
                Intent(Intent.ACTION_DIAL, Uri.parse("tel:$recipient")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            } else {
                Intent(Intent.ACTION_VIEW, Uri.parse("tel:")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Calling $recipient")
        } catch (e: Exception) {
            Log.e(TAG, "Error making phone call", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to initiate phone call")
        }
        return result.toString()
    }

    /**
     * Opens WhatsApp chat or contact message
     */
    @JavascriptInterface
    fun openWhatsApp(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val contact = options.optString("contact", options.optString("phoneNumber", "")).trim()
            val message = options.optString("message", "")

            val cleanPhone = contact.replace("[+\\-()\\s]".toRegex(), "")
            val uri = if (cleanPhone.isNotBlank() && cleanPhone.all { it.isDigit() }) {
                Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(message)}")
            } else {
                Uri.parse("https://api.whatsapp.com/send?text=${Uri.encode(message)}")
            }

            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage("com.whatsapp")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            val packageManager = context.packageManager
            if (intent.resolveActivity(packageManager) != null) {
                context.startActivity(intent)
                result.put("success", true)
                result.put("message", "WhatsApp opened")
            } else {
                // Fallback to standard openApp
                return openApp(JSONObject().apply {
                    put("appName", "WhatsApp")
                    put("packageName", "com.whatsapp")
                }.toString())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching WhatsApp", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to launch WhatsApp")
        }
        return result.toString()
    }

    /**
     * Opens Android Wi-Fi settings page
     */
    @JavascriptInterface
    fun openWifiSettings(): String {
        val result = JSONObject()
        try {
            val intent = Intent(Settings.ACTION_WIFI_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Wi-Fi settings opened")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to open Wi-Fi settings")
        }
        return result.toString()
    }

    /**
     * Opens Android Bluetooth settings page
     */
    @JavascriptInterface
    fun openBluetoothSettings(): String {
        val result = JSONObject()
        try {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Bluetooth settings opened")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to open Bluetooth settings")
        }
        return result.toString()
    }

    /**
     * Opens Android Do Not Disturb settings page
     */
    @JavascriptInterface
    fun openDndSettings(): String {
        val result = JSONObject()
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_ZEN_MODE_PRIORITY_SETTINGS)
            } else {
                Intent(Settings.ACTION_SOUND_SETTINGS)
            }.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            result.put("success", true)
            result.put("message", "Do Not Disturb settings opened")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to open DND settings")
        }
        return result.toString()
    }

    /**
     * Opens Recent Applications overview
     */
    @JavascriptInterface
    fun pressRecents(): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active")
            return result.toString()
        }
        val success = service.performRecents()
        result.put("success", success)
        result.put("message", if (success) "Opened Recent Applications" else "Failed to open Recents")
        return result.toString()
    }

    /**
     * Opens Notifications shade
     */
    @JavascriptInterface
    fun openNotificationPanel(): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active")
            return result.toString()
        }
        val success = service.performNotifications()
        result.put("success", success)
        result.put("message", if (success) "Notifications shade opened" else "Failed to open Notifications")
        return result.toString()
    }

    /**
     * Opens Quick Settings panel
     */
    @JavascriptInterface
    fun openQuickSettings(): String {
        val result = JSONObject()
        val service = DoraAccessibilityService.getInstance()
        if (service == null) {
            result.put("success", false)
            result.put("error", "Dora Accessibility Service is not active")
            return result.toString()
        }
        val success = service.performQuickSettings()
        result.put("success", success)
        result.put("message", if (success) "Quick Settings opened" else "Failed to open Quick Settings")
        return result.toString()
    }

    /**
     * Controls Background Voice Foreground Service
     */
    @JavascriptInterface
    fun startBackgroundVoiceService(): String {
        val result = JSONObject()
        try {
            DoraVoiceService.start(context)
            result.put("success", true)
            result.put("message", "Background Voice Service started")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to start background voice")
        }
        return result.toString()
    }

    @JavascriptInterface
    fun stopBackgroundVoiceService(): String {
        val result = JSONObject()
        try {
            DoraVoiceService.stop(context)
            result.put("success", true)
            result.put("message", "Background Voice Service stopped")
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to stop background voice")
        }
        return result.toString()
    }

    @JavascriptInterface
    fun isBackgroundVoiceServiceRunning(): String {
        val result = JSONObject().apply {
            put("running", DoraVoiceService.isServiceRunning())
            put("alwaysRunInBackground", DoraVoiceService.isAlwaysRunInBackgroundEnabled(context))
        }
        return result.toString()
    }

    @JavascriptInterface
    fun setAlwaysRunInBackground(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val enabled = options.optBoolean("enabled", true)
            DoraVoiceService.setAlwaysRunInBackground(context, enabled)
            result.put("success", true)
            result.put("enabled", enabled)
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to update always run setting")
        }
        return result.toString()
    }

    /**
     * Gets the full Voice Settings configuration from Android SharedPreferences
     */
    @JavascriptInterface
    fun getVoiceSettings(): String {
        val result = JSONObject().apply {
            put("liveSessionAutoStart", DoraVoiceService.isLiveSessionAutoStartEnabled(context))
            put("alwaysRunInBackground", DoraVoiceService.isAlwaysRunInBackgroundEnabled(context))
            put("wakeWordEnabled", DoraVoiceService.isWakeWordEnabled(context))
            put("wakeWordPhrase", DoraVoiceService.getWakeWordPhrase(context))
            put("followUpListening", DoraVoiceService.isFollowUpListeningEnabled(context))
            put("followUpTimeoutSeconds", DoraVoiceService.getFollowUpTimeoutSeconds(context))
        }
        return result.toString()
    }

    /**
     * Updates Voice Settings in Android SharedPreferences
     */
    @JavascriptInterface
    fun setVoiceSettings(settingsJson: String): String {
        val result = JSONObject()
        try {
            val json = JSONObject(settingsJson)
            if (json.has("liveSessionAutoStart")) {
                DoraVoiceService.setLiveSessionAutoStart(context, json.getBoolean("liveSessionAutoStart"))
            }
            if (json.has("alwaysRunInBackground")) {
                DoraVoiceService.setAlwaysRunInBackground(context, json.getBoolean("alwaysRunInBackground"))
            }
            if (json.has("wakeWordEnabled")) {
                DoraVoiceService.setWakeWordEnabled(context, json.getBoolean("wakeWordEnabled"))
            }
            if (json.has("wakeWordPhrase")) {
                DoraVoiceService.setWakeWordPhrase(context, json.getString("wakeWordPhrase"))
            }
            if (json.has("followUpListening")) {
                DoraVoiceService.setFollowUpListening(context, json.getBoolean("followUpListening"))
            }
            if (json.has("followUpTimeoutSeconds")) {
                DoraVoiceService.setFollowUpTimeoutSeconds(context, json.getInt("followUpTimeoutSeconds"))
            }
            result.put("success", true)
            result.put("settings", JSONObject(getVoiceSettings()))
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to update voice settings")
        }
        return result.toString()
    }

    /**
     * Returns the real, authoritative runtime state of the native Dora Voice Service
     */
    @JavascriptInterface
    fun getVoiceServiceState(): String {
        val micGranted = androidx.core.content.ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        val result = JSONObject().apply {
            put("serviceRunning", DoraVoiceService.isServiceRunning())
            put("voiceState", DoraVoiceService.getCurrentState().name)
            put("liveSessionActive", DoraVoiceService.isLiveSessionActive())
            put("wakeWordEnabled", DoraVoiceService.isWakeWordEnabled(context))
            put("wakeWordPhrase", DoraVoiceService.getWakeWordPhrase(context))
            put("alwaysRunInBackground", DoraVoiceService.isAlwaysRunInBackgroundEnabled(context))
            put("followUpListening", DoraVoiceService.isFollowUpListeningEnabled(context))
            put("followUpTimeoutSeconds", DoraVoiceService.getFollowUpTimeoutSeconds(context))
            put("batteryOptimizationExempt", DoraVoiceService.isBatteryOptimizationExempt(context))
            put("microphoneGranted", micGranted)
        }
        return result.toString()
    }

    /**
     * Coordinates microphone ownership between the native background service and foreground Live Session
     */
    @JavascriptInterface
    fun setLiveSessionActive(optionsJson: String): String {
        val result = JSONObject()
        try {
            val options = JSONObject(optionsJson)
            val active = options.optBoolean("active", false)
            DoraVoiceService.setLiveSessionActiveState(context, active)
            result.put("success", true)
            result.put("liveSessionActive", active)
        } catch (e: Exception) {
            result.put("success", false)
            result.put("error", e.message ?: "Failed to set live session state")
        }
        return result.toString()
    }

    /**
     * Checks whether battery optimization is disabled for this app
     */
    @JavascriptInterface
    fun isBatteryOptimizationExempt(): String {
        val exempt = DoraVoiceService.isBatteryOptimizationExempt(context)
        val result = JSONObject().apply {
            put("exempt", exempt)
        }
        return result.toString()
    }

    /**
     * Launches the official system prompt to exempt Dora from battery optimization
     */
    @JavascriptInterface
    fun requestBatteryOptimizationExemption(): String {
        val result = JSONObject()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                result.put("success", true)
                result.put("message", "Battery optimization dialog opened")
            } else {
                result.put("success", true)
                result.put("message", "Battery optimization not required on this Android version")
            }
        } catch (e: Exception) {
            // Fallback to general settings
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                result.put("success", true)
                result.put("message", "Battery optimization settings opened")
            } catch (e2: Exception) {
                result.put("success", false)
                result.put("error", e2.message ?: "Failed to open battery settings")
            }
        }
        return result.toString()
    }

    /**
     * Persists short-term conversation context in Android SharedPreferences
     */
    @JavascriptInterface
    fun saveConversationContext(contextJson: String): String {
        DoraVoiceService.saveConversationContext(context, contextJson)
        return JSONObject().apply { put("success", true) }.toString()
    }

    /**
     * Retrieves stored short-term conversation context from Android SharedPreferences
     */
    @JavascriptInterface
    fun getConversationContext(): String {
        return DoraVoiceService.getConversationContext(context)
    }

    /**
     * Checks if native Android screen capture via MediaProjection is supported on this device
     */
    @JavascriptInterface
    fun isScreenShareSupported(): String {
        val result = JSONObject().apply {
            put("supported", true)
            put("platform", "android_native")
        }
        return result.toString()
    }

    /**
     * Checks if native screen sharing is currently active
     */
    @JavascriptInterface
    fun isScreenShareActive(): String {
        val activity = context as? MainActivity
        val active = activity?.isScreenCaptureActive() ?: DoraScreenCaptureManager.getInstance().isCapturing()
        val result = JSONObject().apply {
            put("active", active)
        }
        return result.toString()
    }

    /**
     * Requests native Android screen share consent and starts MediaProjection capture
     */
    @JavascriptInterface
    fun startScreenShare(): String {
        val activity = context as? MainActivity
        val result = JSONObject()
        if (activity != null) {
            activity.requestScreenCapture { success, errorMsg ->
                Log.i("DoraBridge", "Screen capture request completed: success=$success error=$errorMsg")
            }
            result.put("success", true)
            result.put("message", "Screen capture permission dialog launched")
        } else {
            result.put("success", false)
            result.put("error", "Activity not available")
        }
        return result.toString()
    }

    /**
     * Stops native Android screen share and tears down MediaProjection / VirtualDisplay
     */
    @JavascriptInterface
    fun stopScreenShare(): String {
        val activity = context as? MainActivity
        val result = JSONObject()
        if (activity != null) {
            activity.stopScreenCapture()
            result.put("success", true)
            result.put("message", "Screen capture stopped")
        } else {
            DoraScreenCaptureManager.getInstance().stopCapture(context)
            result.put("success", true)
            result.put("message", "Screen capture stopped via manager")
        }
        return result.toString()
    }
}

