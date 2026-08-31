package ai.dora.companion

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputFilter
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Dora Main Android Activity
 * 
 * Provides native UI for phone-side pairing with Dora, entering 6-character pairing codes,
 * verifying server reachability via health checks, managing connection lifecycle states,
 * and configuring Android Accessibility settings for autonomous task execution.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var companionClient: DoraCompanionClient
    private lateinit var bridgePlugin: DoraAndroidBridgePlugin

    // UI Elements
    private lateinit var rootScroll: ScrollView
    private lateinit var contentLayout: LinearLayout
    
    // Status Card Views
    private lateinit var statusBadgeText: TextView
    private lateinit var statusDetailText: TextView
    
    // Accessibility Card Views
    private lateinit var accessibilityStatusText: TextView
    private lateinit var btnOpenAccessibility: Button
    
    // Pairing Form Views
    private lateinit var pairingSectionContainer: LinearLayout
    private lateinit var serverUrlInput: EditText
    private lateinit var btnTestServerUrl: Button
    private lateinit var serverUrlFeedbackText: TextView
    private lateinit var pairingCodeInput: EditText
    private lateinit var btnPair: Button
    private lateinit var pairingProgressBar: ProgressBar
    private lateinit var errorFeedbackText: TextView
    
    // Connected Actions Container
    private lateinit var connectedActionsContainer: LinearLayout
    private lateinit var btnSyncPing: Button
    private lateinit var btnUnpair: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        companionClient = DoraCompanionClient.getInstance(this)
        bridgePlugin = DoraAndroidBridgePlugin(this)

        buildUserInterface()
        setupListeners()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        // Re-evaluate accessibility and update UI state
        val isAccessibilityEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)
        updateAccessibilityUI(isAccessibilityEnabled)
        companionClient.evaluateCurrentState()
        refreshUIFromState(companionClient.getCurrentState(), companionClient.getLastErrorMessage())
    }

    override fun onDestroy() {
        super.onDestroy()
        companionClient.removeStateListener(stateListener)
    }

    private val stateListener: (DoraCompanionClient.ConnectionState, String?) -> Unit = { state, error ->
        runOnUiThread {
            refreshUIFromState(state, error)
        }
    }

    private fun setupListeners() {
        companionClient.addStateListener(stateListener)
    }

    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "dora" && data.host == "pair") {
            val pairingCode = data.getQueryParameter("code")
            val serverUrl = data.getQueryParameter("server")
            
            if (!serverUrl.isNullOrBlank()) {
                serverUrlInput.setText(serverUrl)
            }
            if (!pairingCode.isNullOrBlank()) {
                pairingCodeInput.setText(pairingCode.uppercase())
                Toast.makeText(this, "Pairing code loaded: $pairingCode", Toast.LENGTH_SHORT).show()
                // Auto-trigger pairing if accessibility is already enabled or ready
                initiatePairing()
            }
        }
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun buildUserInterface() {
        rootScroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFF0F172A.toInt()) // Slate 900
            isFillViewport = true
        }

        contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
        }
        rootScroll.addView(contentLayout)

        // 1. App Header
        val headerLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(16))
        }

        val appTitle = TextView(this).apply {
            text = "Dora"
            textSize = 28f
            setTextColor(0xFFFFFFFF.toInt())
            setTypeface(null, Typeface.BOLD)
        }
        headerLayout.addView(appTitle)

        val appSubtitle = TextView(this).apply {
            text = "AI Voice Assistant & Device Companion"
            textSize = 13f
            setTextColor(0xFF94A3B8.toInt()) // Slate 400
            setPadding(0, dp(4), 0, 0)
        }
        headerLayout.addView(appSubtitle)
        contentLayout.addView(headerLayout)

        // 2. Connection Status Card
        val statusCard = createCardContainer()
        
        val statusCardTitle = TextView(this).apply {
            text = "CONNECTION STATUS"
            textSize = 11f
            setTextColor(0xFF64748B.toInt()) // Slate 500
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        statusCard.addView(statusCardTitle)

        statusBadgeText = TextView(this).apply {
            text = "Not Configured"
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFE2E8F0.toInt())
            setPadding(0, 0, 0, dp(6))
        }
        statusCard.addView(statusBadgeText)

        statusDetailText = TextView(this).apply {
            text = "Enter a pairing code to link this phone with Dora."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
        }
        statusCard.addView(statusDetailText)
        contentLayout.addView(statusCard)

        addSpacer(dp(16))

        // 3. Accessibility Service Card
        val accessibilityCard = createCardContainer()
        
        val a11yHeader = TextView(this).apply {
            text = "ANDROID ACCESSIBILITY SERVICE"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        accessibilityCard.addView(a11yHeader)

        accessibilityStatusText = TextView(this).apply {
            text = "Checking status..."
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, dp(6))
        }
        accessibilityCard.addView(accessibilityStatusText)

        val a11yDescription = TextView(this).apply {
            text = "Enables Dora to interact with your phone, open requested apps, tap buttons, and assist with hands-free navigation."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(12))
        }
        accessibilityCard.addView(a11yDescription)

        btnOpenAccessibility = Button(this).apply {
            text = "Open Accessibility Settings"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF0284C7.toInt(), dp(10)) // Sky 600
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Could not open Accessibility Settings", Toast.LENGTH_SHORT).show()
                }
            }
        }
        accessibilityCard.addView(btnOpenAccessibility)
        contentLayout.addView(accessibilityCard)

        addSpacer(dp(16))

        // 4. Pairing Form Section ("Pair with Dora")
        pairingSectionContainer = createCardContainer()
        
        val pairingHeader = TextView(this).apply {
            text = "PAIR WITH DORA"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        pairingSectionContainer.addView(pairingHeader)

        val pairingInstructions = TextView(this).apply {
            text = "1. Open Dora Web & click 'Device Control'.\n2. Generate a 6-character code (e.g. DORA-KWHE).\n3. Enter the code below to link this device."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(3).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(14))
        }
        pairingSectionContainer.addView(pairingInstructions)

        // Server URL Label & Input
        val serverUrlLabel = TextView(this).apply {
            text = "Dora Public Server URL (HTTPS)"
            textSize = 12f
            setTextColor(0xFFCBD5E1.toInt())
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, dp(4))
        }
        pairingSectionContainer.addView(serverUrlLabel)

        serverUrlInput = EditText(this).apply {
            setText(companionClient.getStoredServerUrl())
            hint = DoraCompanionClient.DEFAULT_SERVER_URL
            setHintTextColor(0xFF475569.toInt())
            textSize = 12f
            setTextColor(0xFFFFFFFF.toInt())
            background = createInputBackground()
            setPadding(dp(12), dp(10), dp(12), dp(10))
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
        }
        pairingSectionContainer.addView(serverUrlInput)

        addSpacer(dp(6), pairingSectionContainer)

        // Server Test Connection Row
        val serverTestLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        btnTestServerUrl = Button(this).apply {
            text = "Test Connection"
            textSize = 11f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFF38BDF8.toInt()) // Sky 400
            background = createOutlineButtonBackground(0xFF0284C7.toInt(), dp(8))
            setPadding(dp(12), dp(6), dp(12), dp(6))
            setOnClickListener {
                testServerUrlReachability()
            }
        }
        serverTestLayout.addView(btnTestServerUrl)

        serverUrlFeedbackText = TextView(this).apply {
            textSize = 11f
            setTextColor(0xFF94A3B8.toInt())
            setPadding(dp(10), 0, 0, 0)
            text = ""
        }
        serverTestLayout.addView(serverUrlFeedbackText)
        pairingSectionContainer.addView(serverTestLayout)

        addSpacer(dp(14), pairingSectionContainer)

        // Pairing Code Label & Input
        val pairingCodeLabel = TextView(this).apply {
            text = "6-Character Pairing Code"
            textSize = 12f
            setTextColor(0xFFCBD5E1.toInt())
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, dp(4))
        }
        pairingSectionContainer.addView(pairingCodeLabel)

        pairingCodeInput = EditText(this).apply {
            hint = "DORA-XXXX"
            setHintTextColor(0xFF475569.toInt())
            textSize = 18f
            setTextColor(0xFF38BDF8.toInt()) // Sky 400
            setTypeface(Typeface.MONOSPACE, Typeface.BOLD)
            background = createInputBackground()
            setPadding(dp(14), dp(12), dp(14), dp(12))
            gravity = Gravity.CENTER
            filters = arrayOf(InputFilter.AllCaps(), InputFilter.LengthFilter(12))
            setSingleLine(true)
        }
        pairingSectionContainer.addView(pairingCodeInput)

        // Error Feedback TextView
        errorFeedbackText = TextView(this).apply {
            textSize = 12f
            setTextColor(0xFFF43F5E.toInt()) // Rose 500
            setPadding(0, dp(8), 0, 0)
            visibility = View.GONE
        }
        pairingSectionContainer.addView(errorFeedbackText)

        // Pairing Progress Spinner
        pairingProgressBar = ProgressBar(this).apply {
            visibility = View.GONE
            setPadding(0, dp(12), 0, dp(12))
        }
        pairingSectionContainer.addView(pairingProgressBar)

        addSpacer(dp(16), pairingSectionContainer)

        // Pair Button
        btnPair = Button(this).apply {
            text = "Pair Device"
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF2563EB.toInt(), dp(10)) // Blue 600
            setPadding(dp(16), dp(14), dp(16), dp(14))
            setOnClickListener {
                initiatePairing()
            }
        }
        pairingSectionContainer.addView(btnPair)
        contentLayout.addView(pairingSectionContainer)

        // 5. Connected Actions Section
        connectedActionsContainer = createCardContainer().apply {
            visibility = View.GONE
        }

        val connectedHeader = TextView(this).apply {
            text = "ACTIVE DEVICE LINK"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        connectedActionsContainer.addView(connectedHeader)

        val connectedDesc = TextView(this).apply {
            text = "This phone is paired with Dora. Background heartbeat keeps the link alive."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(12))
        }
        connectedActionsContainer.addView(connectedDesc)

        btnSyncPing = Button(this).apply {
            text = "Send Ping / Test Sync"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF0F766E.toInt(), dp(10)) // Teal 700
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                testHeartbeat()
            }
        }
        connectedActionsContainer.addView(btnSyncPing)

        addSpacer(dp(10), connectedActionsContainer)

        btnUnpair = Button(this).apply {
            text = "Disconnect / Unpair"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFDA4AF.toInt()) // Rose 300
            background = createOutlineButtonBackground(0xFFE11D48.toInt(), dp(10))
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                disconnectDevice()
            }
        }
        connectedActionsContainer.addView(btnUnpair)
        contentLayout.addView(connectedActionsContainer)

        setContentView(rootScroll)
    }

    private fun addSpacer(heightDp: Int, parent: LinearLayout = contentLayout) {
        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                heightDp
            )
        }
        parent.addView(spacer)
    }

    private fun createCardContainer(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = GradientDrawable().apply {
                setColor(0xFF1E293B.toInt()) // Slate 800
                cornerRadius = dp(14).toFloat()
                setStroke(dp(1), 0xFF334155.toInt()) // Slate 700
            }
        }
    }

    private fun createInputBackground(): GradientDrawable {
        return GradientDrawable().apply {
            setColor(0xFF0B132B.toInt())
            cornerRadius = dp(8).toFloat()
            setStroke(dp(1), 0xFF475569.toInt()) // Slate 600
        }
    }

    private fun createButtonBackground(color: Int, radiusDp: Int): GradientDrawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = radiusDp.toFloat()
        }
    }

    private fun createOutlineButtonBackground(strokeColor: Int, radiusDp: Int): GradientDrawable {
        return GradientDrawable().apply {
            setColor(0x1AE11D48.toInt())
            cornerRadius = radiusDp.toFloat()
            setStroke(dp(1), strokeColor)
        }
    }

    private fun updateAccessibilityUI(isEnabled: Boolean) {
        if (isEnabled) {
            accessibilityStatusText.text = "● Active & Enabled"
            accessibilityStatusText.setTextColor(0xFF10B981.toInt()) // Emerald 500
            btnOpenAccessibility.text = "Accessibility Settings (Active)"
            btnOpenAccessibility.background = createButtonBackground(0xFF334155.toInt(), dp(10))
        } else {
            accessibilityStatusText.text = "● Disabled (Action Required)"
            accessibilityStatusText.setTextColor(0xFFF59E0B.toInt()) // Amber 500
            btnOpenAccessibility.text = "Open Accessibility Settings"
            btnOpenAccessibility.background = createButtonBackground(0xFF0284C7.toInt(), dp(10))
        }
    }

    private fun testServerUrlReachability() {
        val serverUrl = serverUrlInput.text.toString().trim()
        if (serverUrl.isBlank()) {
            serverUrlFeedbackText.text = "Enter a URL first"
            serverUrlFeedbackText.setTextColor(0xFFF43F5E.toInt())
            return
        }

        serverUrlFeedbackText.text = "Testing reachability..."
        serverUrlFeedbackText.setTextColor(0xFF38BDF8.toInt())
        btnTestServerUrl.isEnabled = false

        companionClient.checkServerHealth(serverUrl) { result ->
            btnTestServerUrl.isEnabled = true
            if (result.reachable) {
                serverUrlFeedbackText.text = "✓ Online (${result.doraStatus ?: "HTTP 200"})"
                serverUrlFeedbackText.setTextColor(0xFF10B981.toInt()) // Emerald
            } else {
                serverUrlFeedbackText.text = "✗ ${result.error ?: "Unreachable"}"
                serverUrlFeedbackText.setTextColor(0xFFF43F5E.toInt()) // Rose
            }
        }
    }

    private fun refreshUIFromState(state: DoraCompanionClient.ConnectionState, errorMsg: String?) {
        val isAccessibilityEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)
        updateAccessibilityUI(isAccessibilityEnabled)

        val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        val lastSync = companionClient.getLastSyncTime()
        val syncTimeStr = if (lastSync > 0) "Last sync: ${dateFormat.format(Date(lastSync))}" else "Not synced yet"

        when (state) {
            DoraCompanionClient.ConnectionState.CONNECTED -> {
                statusBadgeText.text = "● Live Assistant Link Active"
                statusBadgeText.setTextColor(0xFF10B981.toInt()) // Emerald 500
                statusDetailText.text = "Connected to ${companionClient.getStoredServerUrl()}\n$syncTimeStr"
                
                pairingSectionContainer.visibility = View.GONE
                connectedActionsContainer.visibility = View.VISIBLE
                pairingProgressBar.visibility = View.GONE
                btnPair.isEnabled = true
                errorFeedbackText.visibility = View.GONE
                
                // Start background foreground service for persistence
                DoraCompanionService.startService(this)
            }
            DoraCompanionClient.ConnectionState.ACCESSIBILITY_DISABLED -> {
                statusBadgeText.text = "● Paired (Accessibility Disabled)"
                statusBadgeText.setTextColor(0xFFF59E0B.toInt()) // Amber 500
                statusDetailText.text = "Device is paired, but Accessibility Service must be enabled to automate actions.\n$syncTimeStr"
                
                pairingSectionContainer.visibility = View.GONE
                connectedActionsContainer.visibility = View.VISIBLE
                pairingProgressBar.visibility = View.GONE
                btnPair.isEnabled = true
                errorFeedbackText.visibility = View.GONE
            }
            DoraCompanionClient.ConnectionState.READY -> {
                statusBadgeText.text = "● Paired (Reconnecting...)"
                statusBadgeText.setTextColor(0xFF0EA5E9.toInt()) // Sky 500
                statusDetailText.text = "Saved link to ${companionClient.getStoredServerUrl()}\nWaiting for network heartbeat..."
                
                pairingSectionContainer.visibility = View.GONE
                connectedActionsContainer.visibility = View.VISIBLE
                pairingProgressBar.visibility = View.GONE
                btnPair.isEnabled = true
            }
            DoraCompanionClient.ConnectionState.CONNECTING -> {
                statusBadgeText.text = "● Connecting to Dora..."
                statusBadgeText.setTextColor(0xFF38BDF8.toInt())
                statusDetailText.text = "Verifying pairing code with server..."
                
                pairingSectionContainer.visibility = View.VISIBLE
                connectedActionsContainer.visibility = View.GONE
                pairingProgressBar.visibility = View.VISIBLE
                btnPair.isEnabled = false
                errorFeedbackText.visibility = View.GONE
            }
            DoraCompanionClient.ConnectionState.ERROR -> {
                statusBadgeText.text = "● Connection Error"
                statusBadgeText.setTextColor(0xFFF43F5E.toInt()) // Rose 500
                statusDetailText.text = errorMsg ?: "Could not complete pairing. Check code or server URL."
                
                pairingSectionContainer.visibility = View.VISIBLE
                connectedActionsContainer.visibility = View.GONE
                pairingProgressBar.visibility = View.GONE
                btnPair.isEnabled = true
                
                if (!errorMsg.isNullOrBlank()) {
                    errorFeedbackText.text = errorMsg
                    errorFeedbackText.visibility = View.VISIBLE
                }
            }
            DoraCompanionClient.ConnectionState.NOT_CONFIGURED -> {
                statusBadgeText.text = "● Not Paired"
                statusBadgeText.setTextColor(0xFF94A3B8.toInt()) // Slate 400
                statusDetailText.text = "Enter a pairing code generated from Dora Web/PC to link this phone."
                
                pairingSectionContainer.visibility = View.VISIBLE
                connectedActionsContainer.visibility = View.GONE
                pairingProgressBar.visibility = View.GONE
                btnPair.isEnabled = true
                errorFeedbackText.visibility = View.GONE
            }
        }
    }

    private fun initiatePairing() {
        val serverUrl = serverUrlInput.text.toString().trim()
        var code = pairingCodeInput.text.toString().trim().uppercase()

        if (serverUrl.isBlank()) {
            Toast.makeText(this, "Please enter the Dora Server URL", Toast.LENGTH_SHORT).show()
            serverUrlInput.requestFocus()
            return
        }

        val urlError = companionClient.validateServerUrl(serverUrl)
        if (urlError != null) {
            Toast.makeText(this, urlError, Toast.LENGTH_LONG).show()
            errorFeedbackText.text = urlError
            errorFeedbackText.visibility = View.VISIBLE
            serverUrlInput.requestFocus()
            return
        }

        if (code.isBlank()) {
            Toast.makeText(this, "Please enter the 6-character pairing code", Toast.LENGTH_SHORT).show()
            pairingCodeInput.requestFocus()
            return
        }

        // Prepend DORA- if user entered only 4 characters
        if (!code.startsWith("DORA-") && code.length == 4) {
            code = "DORA-$code"
            pairingCodeInput.setText(code)
        }

        errorFeedbackText.visibility = View.GONE
        val isAccessibilityEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)

        companionClient.pairDevice(serverUrl, code, isAccessibilityEnabled) { result ->
            if (result.success) {
                Toast.makeText(this@MainActivity, "Paired successfully with Dora!", Toast.LENGTH_LONG).show()
                pairingCodeInput.text.clear()
            } else {
                val err = result.error ?: "Pairing failed"
                Toast.makeText(this@MainActivity, err, Toast.LENGTH_LONG).show()
                errorFeedbackText.text = err
                errorFeedbackText.visibility = View.VISIBLE
            }
        }
    }

    private fun testHeartbeat() {
        Toast.makeText(this, "Testing sync with Dora server...", Toast.LENGTH_SHORT).show()
        val isAccessibility = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)
        companionClient.sendHeartbeat(isAccessibility) { result ->
            if (result.success) {
                Toast.makeText(this@MainActivity, "✓ Sync acknowledged by Dora server", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "Sync failed: ${result.error}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun disconnectDevice() {
        companionClient.unpair {
            DoraCompanionService.stopService(this@MainActivity)
            Toast.makeText(this@MainActivity, "Device disconnected from Dora", Toast.LENGTH_SHORT).show()
        }
    }
}
