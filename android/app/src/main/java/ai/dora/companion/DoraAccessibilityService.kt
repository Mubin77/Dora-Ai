package ai.dora.companion

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * Dora Native Accessibility Service
 * 
 * Provides native Android UI automation:
 * - Active screen inspection (accessibility node hierarchy extraction)
 * - UI node selection and clicking
 * - Text entry into editable fields (with sensitive password blocking)
 * - Directional swiping and viewport scrolling
 * - Global navigation (Home / Back)
 * 
 * Android OS Security: Requires explicit user permission in Android Settings -> Accessibility.
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
         * Returns active instance for UI automation
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
        // Observes window/content changes
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
    // Phase 2: Active Screen Tree Inspection
    // =========================================================================

    /**
     * Inspects the active window hierarchy and returns structured JSON screen state
     */
    fun dumpScreenHierarchy(includeNonClickable: Boolean = true): JSONObject {
        val root = rootInActiveWindow
        val screenObj = JSONObject()
        val elementsArray = JSONArray()

        if (root == null) {
            screenObj.put("packageName", "")
            screenObj.put("elements", elementsArray)
            return screenObj
        }

        val packageName = root.packageName?.toString() ?: ""
        screenObj.put("packageName", packageName)
        screenObj.put("timestamp", System.currentTimeMillis())

        val displayMetrics = resources.displayMetrics
        val viewport = JSONObject().apply {
            put("width", displayMetrics.widthPixels)
            put("height", displayMetrics.heightPixels)
            put("density", displayMetrics.density)
        }
        screenObj.put("viewport", viewport)

        // Traverse node hierarchy
        traverseNode(root, elementsArray, includeNonClickable)

        screenObj.put("elements", elementsArray)
        return screenObj
    }

    private fun traverseNode(node: AccessibilityNodeInfo?, elements: JSONArray, includeNonClickable: Boolean) {
        if (node == null) return

        val isVisible = node.isVisibleToUser
        if (isVisible) {
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            val resId = node.viewIdResourceName ?: ""
            val isClickable = node.isClickable
            val isEditable = node.isEditable
            val isScrollable = node.isScrollable
            val isPassword = node.isPassword

            val isMeaningful = isClickable || isEditable || isScrollable || isPassword ||
                    text.isNotBlank() || desc.isNotBlank()

            if (includeNonClickable || isMeaningful) {
                val rect = Rect()
                node.getBoundsInScreen(rect)

                val elementObj = JSONObject().apply {
                    put("className", node.className?.toString() ?: "android.view.View")
                    put("text", text)
                    put("contentDescription", desc)
                    put("resourceId", resId)
                    put("clickable", isClickable)
                    put("editable", isEditable)
                    put("scrollable", isScrollable)
                    put("isPassword", isPassword)
                    put("focused", node.isFocused)
                    put("enabled", node.isEnabled)

                    val boundsObj = JSONObject().apply {
                        put("left", rect.left)
                        put("top", rect.top)
                        put("right", rect.right)
                        put("bottom", rect.bottom)
                        put("width", rect.width())
                        put("height", rect.height())
                    }
                    put("bounds", boundsObj)
                }
                elements.put(elementObj)
            }
        }

        val childCount = node.childCount
        for (i in 0 until childCount) {
            val child = node.getChild(i)
            if (child != null) {
                traverseNode(child, elements, includeNonClickable)
                child.recycle()
            }
        }
    }

    // =========================================================================
    // Native Interaction Actions
    // =========================================================================

    /**
     * Taps a node by exact resourceId, text, contentDescription, or coordinates
     */
    fun tapNodeOrCoords(
        resourceId: String?,
        text: String?,
        contentDescription: String?,
        x: Float?,
        y: Float?,
        callback: ((Boolean, String?) -> Unit)
    ) {
        val root = rootInActiveWindow
        if (root != null) {
            // 1. Try finding by resource ID
            if (!resourceId.isNullOrBlank()) {
                val nodes = root.findAccessibilityNodeInfosByViewId(resourceId)
                if (!nodes.isNullOrEmpty()) {
                    for (node in nodes) {
                        if (performClickOnNode(node)) {
                            callback(true, "Clicked element with resourceId '$resourceId'")
                            return
                        }
                    }
                }
            }

            // 2. Try finding by Text
            if (!text.isNullOrBlank()) {
                val nodes = root.findAccessibilityNodeInfosByText(text)
                if (!nodes.isNullOrEmpty()) {
                    for (node in nodes) {
                        if (performClickOnNode(node)) {
                            callback(true, "Clicked element with text '$text'")
                            return
                        }
                    }
                }
            }
        }

        // 3. Fallback to coordinate gesture dispatch
        if (x != null && y != null) {
            performTap(x, y) { success ->
                if (success) {
                    callback(true, "Dispatched tap gesture at coordinates ($x, $y)")
                } else {
                    callback(false, "Gesture dispatch failed at coordinates ($x, $y)")
                }
            }
            return
        }

        callback(false, "Could not find matching UI element to tap")
    }

    private fun performClickOnNode(node: AccessibilityNodeInfo): Boolean {
        if (node.isClickable) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
        var parent = node.parent
        while (parent != null) {
            if (parent.isClickable) {
                val clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                parent.recycle()
                return clicked
            }
            val grandParent = parent.parent
            parent.recycle()
            parent = grandParent
        }
        return false
    }

    /**
     * Types text into target editable element or current focus
     */
    fun typeTextIntoActiveField(
        targetText: String,
        resourceId: String? = null,
        clearFirst: Boolean = false
    ): Boolean {
        val root = rootInActiveWindow ?: return false

        var targetNode: AccessibilityNodeInfo? = null

        if (!resourceId.isNullOrBlank()) {
            val nodes = root.findAccessibilityNodeInfosByViewId(resourceId)
            if (!nodes.isNullOrEmpty()) {
                targetNode = nodes.firstOrNull { it.isEditable } ?: nodes.firstOrNull()
            }
        }

        if (targetNode == null) {
            targetNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        }

        if (targetNode == null) {
            targetNode = findFirstEditableNode(root)
        }

        if (targetNode == null) {
            return false
        }

        if (targetNode.isPassword) {
            Log.w(TAG, "Attempted to type into password field - blocked by safety policy.")
            return false
        }

        if (clearFirst) {
            val emptyBundle = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
            }
            targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, emptyBundle)
        }

        val arguments = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, targetText)
        }
        return targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    private fun findFirstEditableNode(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isEditable) return node

        val count = node.childCount
        for (i in 0 until count) {
            val child = node.getChild(i)
            val editable = findFirstEditableNode(child)
            if (editable != null) return editable
            child?.recycle()
        }
        return null
    }

    /**
     * Scrolls the active scrollable container
     */
    fun performScroll(direction: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val scrollable = findFirstScrollableNode(root) ?: root

        val action = if (direction.equals("down", ignoreCase = true) || direction.equals("forward", ignoreCase = true)) {
            AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        } else {
            AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        }

        return scrollable.performAction(action)
    }

    private fun findFirstScrollableNode(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isScrollable) return node

        val count = node.childCount
        for (i in 0 until count) {
            val child = node.getChild(i)
            val scrollable = findFirstScrollableNode(child)
            if (scrollable != null) return scrollable
            child?.recycle()
        }
        return null
    }

    /**
     * Dispatches directional swipe gesture
     */
    fun performSwipe(
        direction: String,
        durationMs: Long = 300,
        callback: ((Boolean) -> Unit)? = null
    ): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            callback?.invoke(false)
            return false
        }

        val metrics = resources.displayMetrics
        val width = metrics.widthPixels.toFloat()
        val height = metrics.heightPixels.toFloat()

        val startX: Float
        val startY: Float
        val endX: Float
        val endY: Float

        when (direction.lowercase()) {
            "up" -> {
                startX = width / 2f
                startY = height * 0.8f
                endX = width / 2f
                endY = height * 0.2f
            }
            "down" -> {
                startX = width / 2f
                startY = height * 0.2f
                endX = width / 2f
                endY = height * 0.8f
            }
            "left" -> {
                startX = width * 0.85f
                startY = height / 2f
                endX = width * 0.15f
                endY = height / 2f
            }
            "right" -> {
                startX = width * 0.15f
                startY = height / 2f
                endX = width * 0.85f
                endY = height / 2f
            }
            else -> {
                callback?.invoke(false)
                return false
            }
        }

        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }

        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs)
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
