package com.health.companion

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class IpConfigActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ip_config)

        val etIpAddress = findViewById<EditText>(R.id.etIpAddress)
        val btnConnect = findViewById<Button>(R.id.btnConnect)

        val prefs = getSharedPreferences("SmartCarePrefs", Context.MODE_PRIVATE)
        
        // Auto fill last saved IP if exists
        val savedIp = prefs.getString("server_ip", "")
        if (!savedIp.isNullOrEmpty()) {
            etIpAddress.setText(savedIp)
        }

        btnConnect.setOnClickListener {
            val ipInput = etIpAddress.text.toString().trim()

            if (ipInput.isEmpty()) {
                etIpAddress.error = getString(R.string.error_invalid_ip)
                Toast.makeText(this, R.string.error_invalid_ip, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Smart formatting: if user forgot http:// protocol prefix, add it automatically
            var formattedIp = ipInput
            if (!formattedIp.startsWith("http://") && !formattedIp.startsWith("https://")) {
                formattedIp = "http://$formattedIp"
            }

            // Save IP address locally
            prefs.edit().putString("server_ip", formattedIp).apply()

            // Navigate to WebView dashboard
            Toast.makeText(this, "Connecting to $formattedIp", Toast.LENGTH_SHORT).show()
            val intent = Intent(this@IpConfigActivity, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }
    }
}
