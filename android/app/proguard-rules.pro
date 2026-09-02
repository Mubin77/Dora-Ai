# ProGuard / R8 Rules for Dora Android Application

# Keep JavaScript Interface methods in bridge plugins
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native Dora services & clients
-keep class ai.dora.companion.** { *; }

# Keep OkHttp & Okio internals
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
