package com.pure.mojiweather

import android.content.Context
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

            editor.apply()

            // 每次刷新状态后，把新状态更新到小部件上面显示出来
            WeatherWidget4x3Provider.updateAllWidgets(reactContext)
            WeatherWidget4x2Provider.updateAllWidgets(reactContext)
            WeatherWidget4x1Provider.updateAllWidgets(reactContext)

            // 调度并确保 20 分钟后台定时自动刷新
            WeatherWidgetSyncHelper.schedule20MinAutoRefresh(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
