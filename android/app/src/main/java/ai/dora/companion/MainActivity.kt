package ai.dora.companion

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Dora Main Android Activity
 * 
 * Primary entry point for the Dora Standalone Android Application.
 * Hosts the complete Dora frontend in an optimized WebView with native device-control
 * JavaScript bridge (window.DoraAndroidBridge) and DoraAccessibilityService integration.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "DoraMainActivity"
        private const val PREFS_NAME = "dora_app_prefs"
        private const val KEY_SERVER_URL = "custom_server_url"
        private const val DEFAULT_PRODUCTION_URL = "https://ais-dev-4y3cwyeutkb4dkqz62jsrh-130845624199.asia-southeast1.run.app"
        const val REQUEST_CODE_AUDIO = 2001
        const val REQUEST_CODE_CAMERA = 2002
        const val REQUEST_CODE_AUDIO_AND_CAMERA = 2003
        const val REQUEST_CODE_SCREEN_CAPTURE = 2004
        const val PREF_KEY_REQUESTED_MIC = "has_requested_mic_permission"
        const val PREF_KEY_REQUESTED_CAMERA = "has_requested_camera_permission"
    }

    private lateinit var webView: WebView
    private lateinit var bridgePlugin: DoraAndroidBridgePlugin
    private lateinit var prefs: SharedPreferences

    // UI overlays
    private lateinit var rootContainer: FrameLayout
    private lateinit var loadingOverlay: LinearLayout
    private lateinit var errorOverlay: LinearLayout
    private lateinit var errorDetailText: TextView
    private lateinit var btnRetry: Button
    private lateinit var btnChangeUrl: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingAudioCallback: ((Boolean) -> Unit)? = null
    private var pendingCameraCallback: ((Boolean) -> Unit)? = null
    private var pendingScreenCaptureCallback: ((Boolean, String?) -> Unit)? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        bridgePlugin = DoraAndroidBridgePlugin(this)

        buildUi()
        setupWebView()
        setupBackNavigation()

        // Start foreground companion service for persistent background readiness
        try {
            DoraCompanionService.startService(this)
        } catch (e: Exception) {
            Log.w(TAG, "Could not start DoraCompanionService: ${e.message}")
        }

        loadDoraApp()
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    /**
     * Inspects current Android OS microphone permission state truthfully
     */
    fun checkAudioPermissionState(): String {
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (granted) return "GRANTED"

        val hasRequested = prefs.getBoolean(PREF_KEY_REQUESTED_MIC, false)
        val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.RECORD_AUDIO)
        
        return if (!hasRequested) {
            "NOT_REQUESTED"
        } else if (!shouldShowRationale) {
            // User permanently denied or selected "Don't ask again"
            "PERMANENTLY_DENIED"
        } else {
            "DENIED"
        }
    }

    /**
     * Inspects current Android OS camera permission state truthfully
     */
    fun checkCameraPermissionState(): String {
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (granted) return "GRANTED"

        val hasRequested = prefs.getBoolean(PREF_KEY_REQUESTED_CAMERA, false)
        val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)
        
        return if (!hasRequested) {
            "NOT_REQUESTED"
        } else if (!shouldShowRationale) {
            "PERMANENTLY_DENIED"
        } else {
            "DENIED"
        }
    }

    /**
     * Contextual runtime permission request for Microphone
     */
    fun requestAudioPermission(callback: ((Boolean) -> Unit)? = null) {
        prefs.edit().putBoolean(PREF_KEY_REQUESTED_MIC, true).apply()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            callback?.invoke(true)
            notifyPermissionChange("microphone", true)
            return
        }
        pendingAudioCallback = callback
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_CODE_AUDIO)
    }

    /**
     * Contextual runtime permission request for Camera
     */
    fun requestCameraPermission(callback: ((Boolean) -> Unit)? = null) {
        prefs.edit().putBoolean(PREF_KEY_REQUESTED_CAMERA, true).apply()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            callback?.invoke(true)
            notifyPermissionChange("camera", true)
            return
        }
        pendingCameraCallback = callback
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQUEST_CODE_CAMERA)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        when (requestCode) {
            REQUEST_CODE_AUDIO -> {
                val isGranted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
                Log.i(TAG, "Audio permission result: granted=$isGranted")
                pendingAudioCallback?.invoke(isGranted)
                pendingAudioCallback = null

                pendingPermissionRequest?.let { req ->
                    if (isGranted) {
                        req.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else {
                        req.deny()
                    }
                    pendingPermissionRequest = null
                }
                notifyPermissionChange("microphone", isGranted)
            }
            REQUEST_CODE_CAMERA -> {
                val isGranted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
                Log.i(TAG, "Camera permission result: granted=$isGranted")
                pendingCameraCallback?.invoke(isGranted)
                pendingCameraCallback = null

                pendingPermissionRequest?.let { req ->
                    if (isGranted) {
                        req.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                    } else {
                        req.deny()
                    }
                    pendingPermissionRequest = null
                }
                notifyPermissionChange("camera", isGranted)
            }
            REQUEST_CODE_AUDIO_AND_CAMERA -> {
                val audioGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                val cameraGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                Log.i(TAG, "Audio+Camera permission result: audio=$audioGranted, camera=$cameraGranted")

                val grantedResources = mutableListOf<String>()
                if (audioGranted) grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (cameraGranted) grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)

                pendingPermissionRequest?.let { req ->
                    if (grantedResources.isNotEmpty()) {
                        req.grant(grantedResources.toTypedArray())
                    } else {
                        req.deny()
                    }
                    pendingPermissionRequest = null
                }
                notifyPermissionChange("microphone", audioGranted)
                notifyPermissionChange("camera", cameraGranted)
            }
        }
    }

    private fun notifyPermissionChange(permissionType: String, isGranted: Boolean) {
        webView.post {
            val js = "window.dispatchEvent(new CustomEvent('doraPermissionChanged', { detail: { type: '$permissionType', granted: $isGranted } }));"
            webView.evaluateJavascript(js, null)
        }
    }

    private fun buildUi() {
        rootContainer = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#090D16"))
        }

        // 1. WebView
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#090D16"))
        }
        rootContainer.addView(webView)

        // 2. Loading Overlay
        loadingOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#090D16"))
            setPadding(dp(24), dp(24), dp(24), dp(24))

            val logoView = ImageView(this@MainActivity).apply {
                setImageResource(R.drawable.dora_logo)
                val lp = LinearLayout.LayoutParams(dp(72), dp(72)).apply {
                    bottomMargin = dp(16)
                }
                layoutParams = lp
            }
            addView(logoView)

            val brandTitle = TextView(this@MainActivity).apply {
                text = "D O R A"
                textSize = 28f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#38BDF8")) // Sky blue
                gravity = Gravity.CENTER
            }
            addView(brandTitle)

            val brandSub = TextView(this@MainActivity).apply {
                text = "AI Voice & Device Control Assistant"
                textSize = 14f
                setTextColor(Color.parseColor("#94A3B8"))
                gravity = Gravity.CENTER
                setPadding(0, dp(8), 0, dp(24))
            }
            addView(brandSub)

            val spinner = ProgressBar(this@MainActivity).apply {
                isIndeterminate = true
            }
            addView(spinner)

            val status = TextView(this@MainActivity).apply {
                text = "Connecting to Dora..."
                textSize = 13f
                setTextColor(Color.parseColor("#64748B"))
                gravity = Gravity.CENTER
                setPadding(0, dp(16), 0, 0)
            }
            addView(status)
        }
        rootContainer.addView(loadingOverlay)

        // 3. Error Overlay (Hidden by default)
        errorOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#090D16"))
            setPadding(dp(32), dp(32), dp(32), dp(32))
            visibility = View.GONE

            val errorTitle = TextView(this@MainActivity).apply {
                text = "Unable to Connect"
                textSize = 22f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#F87171"))
                gravity = Gravity.CENTER
            }
            addView(errorTitle)

            errorDetailText = TextView(this@MainActivity).apply {
                text = "Could not connect to Dora. Please check your internet connection."
                textSize = 14f
                setTextColor(Color.parseColor("#94A3B8"))
                gravity = Gravity.CENTER
                setPadding(0, dp(12), 0, dp(24))
            }
            addView(errorDetailText)

            btnRetry = Button(this@MainActivity).apply {
                text = "Retry Connection"
                setTextColor(Color.WHITE)
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#2563EB"))
                    cornerRadius = dp(12).toFloat()
                }
                setPadding(dp(24), dp(12), dp(24), dp(12))
                setOnClickListener {
                    errorOverlay.visibility = View.GONE
                    loadingOverlay.visibility = View.VISIBLE
                    loadDoraApp()
                }
            }
            addView(btnRetry)

            btnChangeUrl = Button(this@MainActivity).apply {
                text = "Configure Server URL"
                setTextColor(Color.parseColor("#94A3B8"))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#1E293B"))
                    cornerRadius = dp(12).toFloat()
                }
                setPadding(dp(20), dp(10), dp(20), dp(10))
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(12)
                }
                layoutParams = lp
                setOnClickListener {
                    showServerUrlDialog()
                }
            }
            addView(btnChangeUrl)
        }
        rootContainer.addView(errorOverlay)

        setContentView(rootContainer)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = true
        }

        // Attach native JavaScript bridge for device control
        webView.addJavascriptInterface(bridgePlugin, "DoraAndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                loadingOverlay.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingOverlay.visibility = View.GONE
                errorOverlay.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    loadingOverlay.visibility = View.GONE
                    errorOverlay.visibility = View.VISIBLE
                    errorDetailText.text = "Failed to load Dora: ${error?.description ?: "Network error"}"
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val requestedResources = request.resources
                val needsAudio = requestedResources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                val needsVideo = requestedResources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)

                val audioGranted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                val videoGranted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED

                Log.i(TAG, "WebView permission request: needsAudio=$needsAudio(granted=$audioGranted), needsVideo=$needsVideo(granted=$videoGranted)")

                if (needsAudio && !audioGranted && needsVideo && !videoGranted) {
                    pendingPermissionRequest = request
                    prefs.edit()
                        .putBoolean(PREF_KEY_REQUESTED_MIC, true)
                        .putBoolean(PREF_KEY_REQUESTED_CAMERA, true)
                        .apply()
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA),
                        REQUEST_CODE_AUDIO_AND_CAMERA
                    )
                } else if (needsAudio && !audioGranted) {
                    pendingPermissionRequest = request
                    prefs.edit().putBoolean(PREF_KEY_REQUESTED_MIC, true).apply()
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.RECORD_AUDIO),
                        REQUEST_CODE_AUDIO
                    )
                } else if (needsVideo && !videoGranted) {
                    pendingPermissionRequest = request
                    prefs.edit().putBoolean(PREF_KEY_REQUESTED_CAMERA, true).apply()
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.CAMERA),
                        REQUEST_CODE_CAMERA
                    )
                } else {
                    // All requested permissions are already granted at OS level
                    val grantedResources = mutableListOf<String>()
                    if (needsAudio && audioGranted) {
                        grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    }
                    if (needsVideo && videoGranted) {
                        grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                    }
                    if (grantedResources.isNotEmpty()) {
                        request.grant(grantedResources.toTypedArray())
                    } else {
                        request.deny()
                    }
                }
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun getTargetUrl(): String {
        return prefs.getString(KEY_SERVER_URL, DEFAULT_PRODUCTION_URL) ?: DEFAULT_PRODUCTION_URL
    }

    private fun loadDoraApp() {
        val targetUrl = getTargetUrl()
        Log.i(TAG, "Loading Dora app from: $targetUrl")
        webView.loadUrl(targetUrl)
    }

    private fun showServerUrlDialog() {
        val currentUrl = getTargetUrl()
        val input = EditText(this).apply {
            setText(currentUrl)
            setSelection(currentUrl.length)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(dp(16), dp(12), dp(16), dp(12))
        }

        AlertDialog.Builder(this)
            .setTitle("Dora Server URL")
            .setMessage("Configure the public HTTPS server URL for Dora:")
            .setView(input)
            .setPositiveButton("Save & Reload") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.startsWith("http://") || newUrl.startsWith("https://")) {
                    prefs.edit().putString(KEY_SERVER_URL, newUrl).apply()
                    Toast.makeText(this, "Saved server URL", Toast.LENGTH_SHORT).show()
                    errorOverlay.visibility = View.GONE
                    loadingOverlay.visibility = View.VISIBLE
                    loadDoraApp()
                } else {
                    Toast.makeText(this, "URL must begin with https:// or http://", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Reset to Default") { _, _ ->
                prefs.edit().putString(KEY_SERVER_URL, DEFAULT_PRODUCTION_URL).apply()
                errorOverlay.visibility = View.GONE
                loadingOverlay.visibility = View.VISIBLE
                loadDoraApp()
            }
            .setNeutralButton("Cancel", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                DoraScreenCaptureManager.getInstance().startCapture(resultCode, data, this) { success, errorMsg ->
                    pendingScreenCaptureCallback?.invoke(success, errorMsg)
                    pendingScreenCaptureCallback = null
                    if (success) {
                        notifyScreenCaptureStarted()
                    } else {
                        notifyScreenCaptureStopped()
                    }
                }
            } else {
                Log.w(TAG, "Screen capture permission denied by user (resultCode=$resultCode)")
                pendingScreenCaptureCallback?.invoke(false, "Screen sharing cancelled by user")
                pendingScreenCaptureCallback = null
                notifyScreenCaptureStopped()
            }
        }
    }

    fun requestScreenCapture(callback: (Boolean, String?) -> Unit) {
        runOnUiThread {
            if (DoraScreenCaptureManager.getInstance().isCapturing()) {
                callback(true, null)
                return@runOnUiThread
            }
            val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
            if (projectionManager == null) {
                callback(false, "MediaProjection service unavailable on this device")
                return@runOnUiThread
            }
            pendingScreenCaptureCallback = callback
            try {
                startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_CODE_SCREEN_CAPTURE)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch screen capture intent", e)
                pendingScreenCaptureCallback = null
                callback(false, e.message ?: "Failed to launch screen capture dialog")
            }
        }
    }

    fun stopScreenCapture() {
        runOnUiThread {
            DoraScreenCaptureManager.getInstance().stopCapture(this)
            notifyScreenCaptureStopped()
        }
    }

    fun isScreenCaptureActive(): Boolean {
        return DoraScreenCaptureManager.getInstance().isCapturing()
    }

    fun notifyScreenCaptureStarted() {
        webView.post {
            val js = "window.dispatchEvent(new CustomEvent('doraScreenCaptureStarted', { detail: { active: true } }));"
            webView.evaluateJavascript(js, null)
        }
    }

    fun notifyScreenCaptureStopped() {
        webView.post {
            val js = "window.dispatchEvent(new CustomEvent('doraScreenCaptureStopped', { detail: { active: false } }));"
            webView.evaluateJavascript(js, null)
        }
    }

    fun notifyScreenFrameCaptured(base64Jpeg: String) {
        webView.post {
            val js = "window.dispatchEvent(new CustomEvent('doraScreenFrameCaptured', { detail: { image: '$base64Jpeg' } }));"
            webView.evaluateJavascript(js, null)
        }
    }

    override fun onDestroy() {
        DoraScreenCaptureManager.getInstance().stopCapture(this)
        webView.destroy()
        super.onDestroy()
    }
}
