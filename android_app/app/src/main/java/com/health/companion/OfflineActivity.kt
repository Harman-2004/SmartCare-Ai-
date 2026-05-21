package com.health.companion

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class OfflineActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_offline)

        val tvTargetServer = findViewById<TextView>(R.id.tvTargetServer)
        val btnRetry = findViewById<Button>(R.id.btnRetry)
        val btnConfigIp = findViewById<Button>(R.id.btnConfigIp)

        // Display which server URL failed to connect
        val failedIp = intent.getStringExtra("TARGET_IP") ?: ""
        if (failedIp.isNotEmpty()) {
            tvTargetServer.text = failedIp
        } else {
            val prefs = getSharedPreferences("SmartCarePrefs", Context.MODE_PRIVATE)
            tvTargetServer.text = prefs.getString("server_ip", "http://192.168.1.15:5000")
        }

        // Retry connection triggers MainActivity reloading
        btnRetry.setOnClickListener {
            val intent = Intent(this@OfflineActivity, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }

        // Navigate back to configuration forms to update the endpoint IP
        btnConfigIp.setOnClickListener {
            val intent = Intent(this@OfflineActivity, IpConfigActivity::class.java)
            startActivity(intent)
            // Keep OfflineActivity in backstack so if user presses back in config, they come here
        }
    }
}
