package com.health.companion

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AlphaAnimation
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ip_config) // Reuse config layout's premium dark BG
        
        // Hide standard root layouts and show custom splash elements programmatically
        val container = findViewById<View>(android.R.id.content)
        container.setBackgroundColor(resources.getColor(R.color.bg_dark))

        // Find or build Splash text
        Handler(Looper.getMainLooper()).postDelayed({
            val prefs = getSharedPreferences("SmartCarePrefs", Context.MODE_PRIVATE)
            val serverIp = prefs.getString("server_ip", "")

            // Check if server IP has been established
            if (serverIp.isNullOrEmpty()) {
                startActivity(Intent(this@SplashActivity, IpConfigActivity::class.java))
            } else {
                startActivity(Intent(this@SplashActivity, MainActivity::class.java))
            }
            finish()
        }, 1500) // 1.5 second display transition delay
    }
}
