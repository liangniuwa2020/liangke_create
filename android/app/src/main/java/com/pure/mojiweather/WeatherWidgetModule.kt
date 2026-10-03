package com.pure.mojiweather

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WeatherWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WeatherWidgetModule"
    }

    @ReactMethod
    fun updateWidgetData(dataJson: String) {
        try {
            val prefs = reactContext.getSharedPreferences(WeatherWidget4x3Provider.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(WeatherWidget4x3Provider.KEY_WEATHER_DATA, dataJson).apply()

            WeatherWidget4x3Provider.updateAllWidgets(reactContext)
            WeatherWidget4x2Provider.updateAllWidgets(reactContext)
            WeatherWidget4x1Provider.updateAllWidgets(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
