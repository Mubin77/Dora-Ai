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
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Dora Main Android Activity
 * 
 * Functions as the primary standalone Dora Android application and local device-control agent.
 * Operates locally on the phone using DoraAccessibilityService and DoraAndroidBridgePlugin
 * without requiring pairing codes or computer connection.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var bridgePlugin: DoraAndroidBridgePlugin
    private lateinit var companionClient: DoraCompanionClient

    // UI Elements
    private lateinit var rootScroll: ScrollView
    private lateinit var contentLayout: LinearLayout
    
    // Status Card Views
    private lateinit var statusBadgeText: TextView
    private lateinit var statusDetailText: TextView
    private lateinit var btnOpenAccessibility: Button
    
    // Command Execution Bar
    private lateinit var commandInput: EditText
    private lateinit var btnExecuteCommand: Button
    private lateinit var commandFeedbackText: TextView
    
    // Live Activity Console
    private lateinit var logContainer: LinearLayout
    private lateinit var logScroll: ScrollView
    private val logMessages = mutableListOf<String>()

    // Optional Remote Link Section (Collapsed by default)
    private lateinit var remoteSectionHeader: LinearLayout
    private lateinit var remoteSectionContainer: LinearLayout
    private lateinit var remoteChevronText: TextView
    private var isRemoteExpanded = false
    private lateinit var serverUrlInput: EditText
    private lateinit var pairingCodeInput: EditText
    private lateinit var btnPairRemote: Button
    private lateinit var remoteFeedbackText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        bridgePlugin = DoraAndroidBridgePlugin(this)
        companionClient = DoraCompanionClient.getInstance(this)

        buildUserInterface()
        updateAccessibilityState()
        
        // Start foreground background service to maintain persistent local readiness
        DoraCompanionService.startService(this)
        
        appendLog("Dora initialized in Standalone Local Device Mode.")
    }

    override fun onResume() {
        super.onResume()
        updateAccessibilityState()
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
            setBackgroundColor(0xFF090D16.toInt()) // Deep slate / obsidian
            isFillViewport = true
        }

        contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
        }
        rootScroll.addView(contentLayout)

        // 1. Header Layout
        val headerLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(16))
        }

        val brandRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val appTitle = TextView(this).apply {
            text = "Dora"
            textSize = 28f
            setTextColor(0xFFFFFFFF.toInt())
            setTypeface(null, Typeface.BOLD)
        }
        brandRow.addView(appTitle)

        val localBadge = TextView(this).apply {
            text = " LOCAL AGENT "
            textSize = 10f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFF38BDF8.toInt())
            background = GradientDrawable().apply {
                setColor(0x260284C7.toInt())
                cornerRadius = dp(6).toFloat()
                setStroke(dp(1), 0xFF0284C7.toInt())
            }
            setPadding(dp(6), dp(3), dp(6), dp(3))
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                leftMargin = dp(10)
            }
            layoutParams = params
        }
        brandRow.addView(localBadge)
        headerLayout.addView(brandRow)

        val appSubtitle = TextView(this).apply {
            text = "Autonomous Android Assistant & Local Device Controller"
            textSize = 13f
            setTextColor(0xFF94A3B8.toInt()) // Slate 400
            setPadding(0, dp(4), 0, 0)
        }
        headerLayout.addView(appSubtitle)
        contentLayout.addView(headerLayout)

        // 2. Primary Status & Accessibility Card
        val statusCard = createCardContainer()
        
        val statusHeader = TextView(this).apply {
            text = "LOCAL DEVICE CONTROL"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(6))
        }
        statusCard.addView(statusHeader)

        statusBadgeText = TextView(this).apply {
            text = "Checking status..."
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, dp(6))
        }
        statusCard.addView(statusBadgeText)

        statusDetailText = TextView(this).apply {
            text = "Grant accessibility permission once so Dora can launch apps, tap UI, and assist hands-free."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(12))
        }
        statusCard.addView(statusDetailText)

        btnOpenAccessibility = Button(this).apply {
            text = "Open Accessibility Settings"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF0284C7.toInt(), dp(10))
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Could not open Accessibility Settings", Toast.LENGTH_SHORT).show()
                }
            }
        }
        statusCard.addView(btnOpenAccessibility)
        contentLayout.addView(statusCard)

        addSpacer(dp(16))

        // 3. Command Execution Input Bar ("Execute Assistant Command")
        val commandCard = createCardContainer()
        
        val commandHeader = TextView(this).apply {
            text = "ASSISTANT COMMAND & VOICE INPUT"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        commandCard.addView(commandHeader)

        val commandHint = TextView(this).apply {
            text = "Type any natural voice command in English or Bengali (e.g. \"YouTube kholo\", \"Open WhatsApp\", \"Go Home\", \"Scroll Down\")."
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(10))
        }
        commandCard.addView(commandHint)

        commandInput = EditText(this).apply {
            hint = "e.g. YouTube kholo, Open WhatsApp, Go Home"
            setHintTextColor(0xFF475569.toInt())
            textSize = 14f
            setTextColor(0xFFFFFFFF.toInt())
            background = createInputBackground()
            setPadding(dp(14), dp(12), dp(14), dp(12))
            inputType = InputType.TYPE_CLASS_TEXT
            setSingleLine(true)
        }
        commandCard.addView(commandInput)

        commandFeedbackText = TextView(this).apply {
            textSize = 12f
            setPadding(0, dp(8), 0, 0)
            visibility = View.GONE
        }
        commandCard.addView(commandFeedbackText)

        addSpacer(dp(10), commandCard)

        btnExecuteCommand = Button(this).apply {
            text = "Run Command Locally"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF2563EB.toInt(), dp(10)) // Blue 600
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnClickListener {
                executeUserCommand(commandInput.text.toString())
            }
        }
        commandCard.addView(btnExecuteCommand)
        contentLayout.addView(commandCard)

        addSpacer(dp(16))

        // 4. Quick Action Launchpads Grid
        val quickActionCard = createCardContainer()
        
        val quickHeader = TextView(this).apply {
            text = "QUICK ACTIONS"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(10))
        }
        quickActionCard.addView(quickHeader)

        val gridLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        // Row 1: YouTube & WhatsApp
        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 2f
        }
        val btnYoutube = createQuickActionButton("YouTube", 0xFFE11D48.toInt()) {
            executeUserCommand("Open YouTube")
        }
        val btnWhatsapp = createQuickActionButton("WhatsApp", 0xFF10B981.toInt()) {
            executeUserCommand("Open WhatsApp")
        }
        row1.addView(btnYoutube, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = dp(6) })
        row1.addView(btnWhatsapp, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(6) })
        gridLayout.addView(row1)

        addSpacer(dp(8), gridLayout)

        // Row 2: Chrome & Settings
        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 2f
        }
        val btnChrome = createQuickActionButton("Chrome", 0xFF0284C7.toInt()) {
            executeUserCommand("Open Chrome")
        }
        val btnSettings = createQuickActionButton("Settings", 0xFF64748B.toInt()) {
            executeUserCommand("Open Settings")
        }
        row2.addView(btnChrome, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = dp(6) })
        row2.addView(btnSettings, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(6) })
        gridLayout.addView(row2)

        addSpacer(dp(8), gridLayout)

        // Row 3: Home & Back & Scroll
        val row3 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 3f
        }
        val btnHome = createQuickActionButton("Home", 0xFF8B5CF6.toInt()) {
            executeUserCommand("Go Home")
        }
        val btnBack = createQuickActionButton("Back", 0xFFF59E0B.toInt()) {
            executeUserCommand("Go Back")
        }
        val btnScroll = createQuickActionButton("Scroll Down", 0xFF06B6D4.toInt()) {
            executeUserCommand("Scroll Down")
        }
        row3.addView(btnHome, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = dp(4) })
        row3.addView(btnBack, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(2); rightMargin = dp(2) })
        row3.addView(btnScroll, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(4) })
        gridLayout.addView(row3)

        quickActionCard.addView(gridLayout)
        contentLayout.addView(quickActionCard)

        addSpacer(dp(16))

        // 5. Real-Time Activity Log Console
        val logCard = createCardContainer()
        
        val logHeader = TextView(this).apply {
            text = "LOCAL EXECUTION LOG"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setTypeface(null, Typeface.BOLD)
            letterSpacing = 0.08f
            setPadding(0, 0, 0, dp(8))
        }
        logCard.addView(logHeader)

        logScroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(120)
            )
            background = GradientDrawable().apply {
                setColor(0xFF030712.toInt()) // Gray 950
                cornerRadius = dp(8).toFloat()
                setStroke(dp(1), 0xFF1F2937.toInt())
            }
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }

        logContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        logScroll.addView(logContainer)
        logCard.addView(logScroll)
        contentLayout.addView(logCard)

        addSpacer(dp(16))

        // 6. Optional Advanced Remote / Cloud Sync (Collapsed by default)
        val remoteCard = createCardContainer()
        
        remoteSectionHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 0)
            setOnClickListener {
                toggleRemoteSection()
            }
        }

        val remoteTitle = TextView(this).apply {
            text = "Optional Cloud / Remote Sync"
            textSize = 12f
            setTextColor(0xFF94A3B8.toInt())
            setTypeface(null, Typeface.BOLD)
            val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            layoutParams = params
        }
        remoteSectionHeader.addView(remoteTitle)

        remoteChevronText = TextView(this).apply {
            text = "▼"
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
        }
        remoteSectionHeader.addView(remoteChevronText)
        remoteCard.addView(remoteSectionHeader)

        remoteSectionContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            visibility = View.GONE
            setPadding(0, dp(12), 0, 0)
        }

        val remoteDesc = TextView(this).apply {
            text = "If you wish to control this phone remotely from the Dora Web preview or a PC, you can enter a pairing code below. Otherwise, local device control works standalone without setup."
            textSize = 11f
            setTextColor(0xFF64748B.toInt())
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(10))
        }
        remoteSectionContainer.addView(remoteDesc)

        serverUrlInput = EditText(this).apply {
            setText(companionClient.getStoredServerUrl())
            hint = DoraCompanionClient.DEFAULT_SERVER_URL
            setHintTextColor(0xFF475569.toInt())
            textSize = 12f
            setTextColor(0xFFFFFFFF.toInt())
            background = createInputBackground()
            setPadding(dp(10), dp(8), dp(10), dp(8))
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
        }
        remoteSectionContainer.addView(serverUrlInput)

        addSpacer(dp(8), remoteSectionContainer)

        pairingCodeInput = EditText(this).apply {
            hint = "DORA-XXXX"
            setHintTextColor(0xFF475569.toInt())
            textSize = 14f
            setTextColor(0xFF38BDF8.toInt())
            setTypeface(Typeface.MONOSPACE, Typeface.BOLD)
            background = createInputBackground()
            setPadding(dp(10), dp(8), dp(10), dp(8))
            gravity = Gravity.CENTER
            filters = arrayOf(InputFilter.AllCaps(), InputFilter.LengthFilter(12))
            setSingleLine(true)
        }
        remoteSectionContainer.addView(pairingCodeInput)

        remoteFeedbackText = TextView(this).apply {
            textSize = 11f
            setTextColor(0xFFF43F5E.toInt())
            setPadding(0, dp(6), 0, 0)
            visibility = View.GONE
        }
        remoteSectionContainer.addView(remoteFeedbackText)

        addSpacer(dp(10), remoteSectionContainer)

        btnPairRemote = Button(this).apply {
            text = "Link with Dora Web"
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = createButtonBackground(0xFF0F766E.toInt(), dp(8)) // Teal 700
            setPadding(dp(12), dp(8), dp(12), dp(8))
            setOnClickListener {
                initiateRemotePairing()
            }
        }
        remoteSectionContainer.addView(btnPairRemote)

        remoteCard.addView(remoteSectionContainer)
        contentLayout.addView(remoteCard)

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
                setColor(0xFF131B2E.toInt()) // Slate 900 tint
                cornerRadius = dp(14).toFloat()
                setStroke(dp(1), 0xFF1E293B.toInt()) // Slate 800
            }
        }
    }

    private fun createInputBackground(): GradientDrawable {
        return GradientDrawable().apply {
            setColor(0xFF090D16.toInt())
            cornerRadius = dp(8).toFloat()
            setStroke(dp(1), 0xFF334155.toInt()) // Slate 700
        }
    }

    private fun createButtonBackground(color: Int, radiusDp: Int): GradientDrawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = radiusDp.toFloat()
        }
    }

    private fun createQuickActionButton(label: String, accentColor: Int, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(0xFFE2E8F0.toInt())
            background = GradientDrawable().apply {
                setColor(0xFF1E293B.toInt())
                cornerRadius = dp(8).toFloat()
                setStroke(dp(1), 0xFF334155.toInt())
            }
            setPadding(dp(10), dp(10), dp(10), dp(10))
            setOnClickListener { onClick() }
        }
    }

    private fun toggleRemoteSection() {
        isRemoteExpanded = !isRemoteExpanded
        if (isRemoteExpanded) {
            remoteSectionContainer.visibility = View.VISIBLE
            remoteChevronText.text = "▲"
        } else {
            remoteSectionContainer.visibility = View.GONE
            remoteChevronText.text = "▼"
        }
    }

    private fun updateAccessibilityState() {
        val isEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)
        if (isEnabled) {
            statusBadgeText.text = "● Dora Active & Ready Locally"
            statusBadgeText.setTextColor(0xFF10B981.toInt()) // Emerald 500
            statusDetailText.text = "Accessibility service is running. Dora can operate this device directly with zero pairing required."
            btnOpenAccessibility.text = "Accessibility Active ✓"
            btnOpenAccessibility.background = createButtonBackground(0xFF0F766E.toInt(), dp(10))
        } else {
            statusBadgeText.text = "● Accessibility Permission Required"
            statusBadgeText.setTextColor(0xFFF59E0B.toInt()) // Amber 500
            statusDetailText.text = "Enable Dora once in Android Accessibility settings to unlock autonomous app launching and UI actions."
            btnOpenAccessibility.text = "Open Accessibility Settings"
            btnOpenAccessibility.background = createButtonBackground(0xFF0284C7.toInt(), dp(10))
        }
    }

    private fun executeUserCommand(rawCommand: String) {
        val command = rawCommand.trim()
        if (command.isBlank()) {
            Toast.makeText(this, "Please enter a command", Toast.LENGTH_SHORT).show()
            return
        }

        commandFeedbackText.text = "Executing: \"$command\"..."
        commandFeedbackText.setTextColor(0xFF38BDF8.toInt())
        commandFeedbackText.visibility = View.VISIBLE

        val result: JSONObject = bridgePlugin.executeNaturalCommand(command)
        val success = result.optBoolean("success", false)
        val message = result.optString("message", result.optString("error", "Executed"))

        if (success) {
            commandFeedbackText.text = "✓ $message"
            commandFeedbackText.setTextColor(0xFF10B981.toInt()) // Emerald
            appendLog("[SUCCESS] \"$command\" -> $message")
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        } else {
            commandFeedbackText.text = "✗ $message"
            commandFeedbackText.setTextColor(0xFFF43F5E.toInt()) // Rose
            appendLog("[ERROR] \"$command\" -> $message")
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }

    private fun appendLog(msg: String) {
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val entry = "[$time] $msg"
        logMessages.add(entry)
        if (logMessages.size > 50) {
            logMessages.removeAt(0)
        }

        val logItem = TextView(this).apply {
            text = entry
            textSize = 11f
            setTypeface(Typeface.MONOSPACE)
            setTextColor(if (msg.contains("[ERROR]")) 0xFFFDA4AF.toInt() else 0xFF94A3B8.toInt())
            setPadding(0, dp(2), 0, dp(2))
        }
        logContainer.addView(logItem)
        logScroll.post {
            logScroll.fullScroll(View.FOCUS_DOWN)
        }
    }

    private fun initiateRemotePairing() {
        val serverUrl = serverUrlInput.text.toString().trim()
        var code = pairingCodeInput.text.toString().trim().uppercase()

        if (serverUrl.isBlank() || code.isBlank()) {
            remoteFeedbackText.text = "Enter server URL and 6-character code"
            remoteFeedbackText.visibility = View.VISIBLE
            return
        }

        if (!code.startsWith("DORA-") && code.length == 4) {
            code = "DORA-$code"
            pairingCodeInput.setText(code)
        }

        remoteFeedbackText.text = "Linking with Dora Web..."
        remoteFeedbackText.setTextColor(0xFF38BDF8.toInt())
        remoteFeedbackText.visibility = View.VISIBLE
        btnPairRemote.isEnabled = false

        val isAccessibilityEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this)
        companionClient.pairDevice(serverUrl, code, isAccessibilityEnabled) { result ->
            btnPairRemote.isEnabled = true
            if (result.success) {
                remoteFeedbackText.text = "✓ Remote link active!"
                remoteFeedbackText.setTextColor(0xFF10B981.toInt())
                appendLog("[REMOTE] Linked with Dora Web ($serverUrl)")
                Toast.makeText(this@MainActivity, "Remote link active!", Toast.LENGTH_LONG).show()
            } else {
                val err = result.error ?: "Pairing failed"
                remoteFeedbackText.text = "✗ $err"
                remoteFeedbackText.setTextColor(0xFFF43F5E.toInt())
                appendLog("[REMOTE ERROR] $err")
            }
        }
    }
}
