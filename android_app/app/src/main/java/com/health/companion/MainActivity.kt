package com.health.companion

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var hasError = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        loadServerUrl()
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
        }

        // Catching connection failures and redirecting to offline diagnosis
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
                hasError = false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                // If loaded successfully, show webview
                if (!hasError) {
                    webView.visibility = View.VISIBLE
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // Check if it's the main page loading that failed (not some random asset)
                if (request?.isForMainFrame == true) {
                    hasError = true
                    webView.visibility = View.INVISIBLE
                    
                    // Route to Offline diagnostics activity
                    startActivity(Intent(this@MainActivity, OfflineActivity::class.java).apply {
                        putExtra("TARGET_IP", request.url.toString())
                    })
                    finish()
                }
            }
        }
    }

    private fun loadServerUrl() {
        val prefs = getSharedPreferences("SmartCarePrefs", Context.MODE_PRIVATE)
        val serverIp = prefs.getString("server_ip", "")

        if (serverIp.isNullOrEmpty()) {
            // Safe fallback to IP config
            startActivity(Intent(this, IpConfigActivity::class.java))
            finish()
        } else {
            // Verify active wifi or network access first
            if (isNetworkAvailable()) {
                webView.loadUrl(serverIp)
            } else {
                startActivity(Intent(this, OfflineActivity::class.java).apply {
                    putExtra("TARGET_IP", serverIp)
                })
                finish()
            }
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
        }
    }

    // Capture standard hardware physical back button to navigate WebView history
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
