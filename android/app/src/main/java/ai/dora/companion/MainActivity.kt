package ai.dora.companion

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * Dora Main Android Activity
 * 
 * Provides setup, pairing, and direct access to Android Accessibility settings.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var bridgePlugin: DoraAndroidBridgePlugin

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bridgePlugin = DoraAndroidBridgePlugin(this)

        handleIntent(intent)
        setupViews()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "dora" && data.host == "pair") {
            val pairingCode = data.getQueryParameter("code")
            val serverUrl = data.getQueryParameter("server")
            if (!pairingCode.isNullOrBlank()) {
                Toast.makeText(this, "Pairing with Dora ($pairingCode)...", Toast.LENGTH_LONG).show()
                // In production, initiate pairing handshake with serverUrl
            }
        }
    }

    private fun setupViews() {
        // Fallback programmatic layout if XML layout is not inflated
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 64, 48, 48)
            setBackgroundColor(0xFF0F172A.toInt())
        }

        val title = TextView(this).apply {
            text = "Dora"
            textSize = 28f
            setTextColor(0xFFFFFFFF.toInt())
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(title)

        val subtitle = TextView(this).apply {
            text = "AI Voice Assistant & Device Companion"
            textSize = 14f
            setTextColor(0xFF94A3B8.toInt())
            setPadding(0, 8, 0, 32)
        }
        layout.addView(subtitle)

        val statusText = TextView(this).apply {
            val isEnabled = DoraAccessibilityService.isAccessibilitySettingsEnabled(this@MainActivity)
            text = if (isEnabled) "✓ Accessibility Access: Enabled" else "⚠ Accessibility Access: Disabled"
            textSize = 15f
            setTextColor(if (isEnabled) 0xFF34D399.toInt() else 0xFFFBBF24.toInt())
            setPadding(0, 16, 0, 24)
        }
        layout.addView(statusText)

        val btnEnable = Button(this).apply {
            text = "Open Accessibility Settings"
            setBackgroundColor(0xFF0284C7.toInt())
            setTextColor(0xFFFFFFFF.toInt())
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
        layout.addView(btnEnable)

        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        setupViews()
    }
}
