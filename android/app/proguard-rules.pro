# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and change the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ---- 本项目原生模块 ----
# WeatherWidgetModule / LocationModule 由 ReactPackage 通过反射实例化，
# AppWidgetProvider 由系统按清单里的类名反射实例化。
# 开启 R8 后如果不 keep，这两类都会被剪掉或在混淆后找不到。
-keep class com.pure.mojiweather.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    <methods>;
}
-keep class * extends android.appwidget.AppWidgetProvider { *; }

# R8 会移除注解与泛型签名，反射读取时会拿不到
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
