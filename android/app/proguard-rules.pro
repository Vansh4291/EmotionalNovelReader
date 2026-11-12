# ProGuard and R8 Rules for EmotionalNovelReader

# Flutter Wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.**  { *; }

# SQLite and Drift Native bindings
-keep class org.sqlite.** { *; }
-keepclassmembers class * extends com.almworks.sqlite4java.SQLiteNative { *; }
-dontwarn org.sqlite.**

# AndroidX Security and Crypto (EncryptedSharedPreferences / KeyStore)
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# Flutter TTS platform channel
-keep class com.tundralabs.fluttertts.** { *; }

# Flutter Play Core Split Install (unused deferred components)
-dontwarn com.google.android.play.core.**
