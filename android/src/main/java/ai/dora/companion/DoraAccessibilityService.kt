package ai.dora.companion

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Dora Native Accessibility Service Foundation
 * 
 * Provides the core operating system bridge for Android device inspection,
 * gesture dispatch, and UI navigation (Phase 2).
 * 
 * IMPORTANT:
 * - Does NOT enable itself automatically (Android OS security requirement).
 * - Requires explicit user confirmation in Android Settings -> Accessibility.
 */
class DoraAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "DoraAccessibility"
        private var activeInstance: DoraAccessibilityService? = null

        /**
         * Checks if Dora Accessibility Service is currently active in memory
         */
        fun isServiceRunning(): Boolean {
            return activeInstance != null
        }

        /**
         * Returns active instance for UI automation (Phase 2)
         */
        fun getInstance(): DoraAccessibilityService? {
            return activeInstance
        }

        /**
         * System-level check whether the accessibility service is enabled in Android OS Settings
         */
        fun isAccessibilitySettingsEnabled(context: Context): Boolean {
            val expectedServiceName = "${context.packageName}/${DoraAccessibilityService::class.java.canonicalName}"
            val enabledServicesSetting = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            val colonSplitter = TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledServicesSetting)

            while (colonSplitter.hasNext()) {
                val componentName = colonSplitter.next()
                if (componentName.equals(expectedServiceName, ignoreCase = true)) {
                    return true
                }
            }
            return false
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        activeInstance = this
        Log.i(TAG, "Dora Accessibility Service successfully connected and ready for device interaction.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Milestone 1: Non-intrusive event pass-through
        // Phase 2 will attach real-time screen state observers here
    }

    override fun onInterrupt() {
        Log.w(TAG, "Dora Accessibility Service interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (activeInstance === this) {
            activeInstance = null
        }
        Log.i(TAG, "Dora Accessibility Service destroyed.")
    }

    // =========================================================================
    // Foundation Methods for Phase 2 Automation
    // =========================================================================

    /**
     * Navigates back using global action
     */
    fun performBack(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }

    /**
     * Navigates to home screen using global action
     */
    fun performHome(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_HOME)
    }

    /**
     * Dispatches a tap gesture at coordinate (x, y)
     */
    fun performTap(x: Float, y: Float, callback: ((Boolean) -> Unit)? = null): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            callback?.invoke(false)
            return false
        }

        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, 50)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        return dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                callback?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                callback?.invoke(false)
            }
        }, null)
    }

    /**
     * Finds accessibility nodes matching text
     */
    fun findNodesByText(text: String): List<AccessibilityNodeInfo> {
        val root = rootInActiveWindow ?: return emptyList()
        return root.findAccessibilityNodeInfosByText(text) ?: emptyList()
    }
}
