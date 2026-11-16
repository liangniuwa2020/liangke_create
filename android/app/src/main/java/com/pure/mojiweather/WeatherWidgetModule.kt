package com.pure.mojiweather

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class WeatherWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WeatherWidgetModule"
    }

    @ReactMethod
    fun setWidgetSkin(skinType: String) {
        try {
            val prefs = reactContext.getSharedPreferences(WeatherWidgetSyncHelper.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(WeatherWidgetSyncHelper.KEY_WIDGET_SKIN, skinType).apply()

            // 立即刷新所有桌面小部件以应用新皮肤
            WeatherWidget4x3Provider.updateAllWidgets(reactContext)
            WeatherWidget4x2Provider.updateAllWidgets(reactContext)
            WeatherWidget4x1Provider.updateAllWidgets(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun updateWidgetData(dataJson: String) {
        try {
            val prefs = reactContext.getSharedPreferences(WeatherWidgetSyncHelper.PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit().putString(WeatherWidgetSyncHelper.KEY_WEATHER_DATA, dataJson)

            // 解析经纬度与城市名称并持久化保存，以便小部件脱离前台时可自主后台定时刷新
            try {
                val json = JSONObject(dataJson)
                if (json.has("skin")) {
                    editor.putString(WeatherWidgetSyncHelper.KEY_WIDGET_SKIN, json.getString("skin"))
                }
                if (json.has("latitude")) {
                    editor.putFloat(WeatherWidgetSyncHelper.KEY_LATITUDE, json.getDouble("latitude").toFloat())
                }
                if (json.has("longitude")) {
                    editor.putFloat(WeatherWidgetSyncHelper.KEY_LONGITUDE, json.getDouble("longitude").toFloat())
                }
                if (json.has("city")) {
                    editor.putString(WeatherWidgetSyncHelper.KEY_CITY_NAME, json.getString("city"))
                }
            } catch (je: Exception) {
                je.printStackTrace()
            }

            // JS 主动写入的一定是刚联网拿到的新鲜数据，同步刷新时间戳，
            // 免得 App 回到前台时又因为「原生缓存放旧」而多打一次请求。
            editor.putLong(WeatherWidgetSyncHelper.KEY_LAST_SYNC_AT, System.currentTimeMillis())
            editor.apply()

            // 每次刷新状态后，把新状态更新到小部件上面显示出来
            WeatherWidget4x3Provider.updateAllWidgets(reactContext)
            WeatherWidget4x2Provider.updateAllWidgets(reactContext)
            WeatherWidget4x1Provider.updateAllWidgets(reactContext)

            // 重新校准 30 分钟后台自动刷新（一次性精确闹钟 + 系统重复兜底闹钟）
            WeatherWidgetSyncHelper.scheduleAutoRefresh(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 供 JS 读取当前安装包的真实版本号。
     *
     * 为什么不由 JS 侧硬编码：版本号散落在 package.json / app.json / build.gradle 三处，
     * 界面上再写一份字符串，升级时必然漏改。这里直接读 PackageInfo.versionName，
     * 屏幕上显示的一定就是当前这个 APK 的版本（versionCode 一并返回便于排查）。
     */
    @ReactMethod
    fun getAppVersion(promise: Promise) {
        try {
            val info = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            val versionName = info.versionName ?: "unknown"
            val versionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                info.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                info.versionCode.toLong()
            }
            val result = Arguments.createMap().apply {
                putString("versionName", versionName)
                putDouble("versionCode", versionCode.toDouble())
                putString("packageName", reactContext.packageName)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("E_VERSION", e)
        }
    }

    /**
     * 供 JS 在 App 回到前台 / 从息屏唤醒时调用：
     * 读回原生后台线程最近一次成功抓取的缓存与时间戳。
     * 有缓存就先用它立即上屏，再静默联网刷新，避免「打开 App 先看到昨天的数据」。
     */
    @ReactMethod
    fun readCachedWeather(promise: Promise) {
        try {
            val (json, lastSyncAt) = WeatherWidgetSyncHelper.readCachedWeather(reactContext)
            val result = Arguments.createMap().apply {
                if (json != null) putString("data", json) else putNull("data")
                putDouble("lastSyncAt", lastSyncAt.toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("E_READ_CACHE", e)
        }
    }

    /**
     * 供 JS 直接触发一次原生后台抓取（走 WakeLock + 独立线程），
     * 用于 JS 侧网络失败后的兜底重试。
     */
    @ReactMethod
    fun refreshInBackground(promise: Promise) {
        try {
            WeatherWidgetSyncHelper.fetchWeatherInBackground(reactContext, false) {
                WeatherWidgetSyncHelper.scheduleAutoRefresh(reactContext)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("E_REFRESH", e)
        }
    }
}
