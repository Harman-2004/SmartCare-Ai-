# Proguard rules for shrinking, optimization, and obfuscation.
# Add project specific Proguard rules here.
# You can keep your custom classes or third-party libraries if needed.

# Keep WebView and JavaScript interfaces intact
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
