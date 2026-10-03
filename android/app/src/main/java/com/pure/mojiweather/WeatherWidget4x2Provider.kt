package com.pure.mojiweather

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.core.content.ContextCompat
import android.util.Log
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WeatherWidget4x2Provider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_WIDGET) {
            updateAllWidgets(context)
        }
    }

    companion object {
        const val ACTION_REFRESH_WIDGET = "com.pure.mojiweather.ACTION_REFRESH_WIDGET_4X2"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, WeatherWidget4x2Provider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (id in appWidgetIds) {
                updateWidget(context, appWidgetManager, id)
            }
        }

        private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_weather_4x2)

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingLaunchIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingLaunchIntent)

            val refreshIntent = Intent(context, WeatherWidget4x2Provider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val pendingRefreshIntent = PendingIntent.getBroadcast(
                context, 2, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingRefreshIntent)

            val prefs = context.getSharedPreferences(WeatherWidget4x3Provider.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(WeatherWidget4x3Provider.KEY_WEATHER_DATA, null)

            var cityName = "南昌"
            var tempStr = "24°"
            var weatherDesc = "晴朗"
            var weatherType = "sunny"
            var aqiText = "优 32"
            var updateTime = SimpleDateFormat("HH:mm 更新", Locale.CHINA).format(Date())

            var hourlyArr: org.json.JSONArray? = null

            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val json = JSONObject(jsonStr)
                    cityName = json.optString("city", cityName)
                    tempStr = "${json.optInt("temp", 24)}°"
                    weatherDesc = json.optString("weatherDesc", weatherDesc)
                    weatherType = json.optString("weatherType", weatherType)
                    
                    val aqiVal = json.optInt("aqi", 32)
                    val aqiLevel = json.optString("aqiLevel", "优")
                    aqiText = "$aqiLevel $aqiVal"

                    updateTime = json.optString("updateTime", updateTime)
                    hourlyArr = json.optJSONArray("hourly24") ?: json.optJSONArray("hourly")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            views.setTextViewText(R.id.widget_city_name, cityName)
            views.setTextViewText(R.id.widget_update_time, updateTime)
            views.setTextViewText(R.id.widget_aqi_text, aqiText)
            views.setTextViewText(R.id.widget_temperature, tempStr)
            views.setTextViewText(R.id.widget_weather_desc, weatherDesc)
            setWidgetIcon(context, views, R.id.widget_weather_icon, getWeatherIconRes(weatherType), 20)

            // 绑定 24 小时逐时天气代表节点 (6 个关键时刻覆盖整整24小时)
            val timeIds = intArrayOf(
                R.id.widget_h1_time, R.id.widget_h2_time, R.id.widget_h3_time,
                R.id.widget_h4_time, R.id.widget_h5_time, R.id.widget_h6_time
            )
            val iconIds = intArrayOf(
                R.id.widget_h1_icon, R.id.widget_h2_icon, R.id.widget_h3_icon,
                R.id.widget_h4_icon, R.id.widget_h5_icon, R.id.widget_h6_icon
            )
            val tempIds = intArrayOf(
                R.id.widget_h1_temp, R.id.widget_h2_temp, R.id.widget_h3_temp,
                R.id.widget_h4_temp, R.id.widget_h5_temp, R.id.widget_h6_temp
            )
            val descIds = intArrayOf(
                R.id.widget_h1_desc, R.id.widget_h2_desc, R.id.widget_h3_desc,
                R.id.widget_h4_desc, R.id.widget_h5_desc, R.id.widget_h6_desc
            )

            val sampleIndices = intArrayOf(0, 4, 8, 12, 16, 20)
            val defaultTimes = arrayOf("现在", "01:00", "05:00", "09:00", "13:00", "17:00")
            val defaultTemps = arrayOf("24°", "22°", "20°", "25°", "27°", "23°")
            val defaultDescs = arrayOf("晴", "多云", "阴", "晴", "晴", "小雨")
            val defaultTypes = arrayOf("sunny", "cloudy", "cloudy", "sunny", "sunny", "rain")

            for (i in 0 until 6) {
                var time = defaultTimes[i]
                var temp = defaultTemps[i]
                var desc = defaultDescs[i]
                var type = defaultTypes[i]

                val targetIdx = sampleIndices[i]
                if (hourlyArr != null && targetIdx < hourlyArr.length()) {
                    val hObj = hourlyArr.optJSONObject(targetIdx)
                    if (hObj != null) {
                        time = hObj.optString("time", time)
                        val tVal = hObj.optInt("temp", 24)
                        temp = "$tVal°"
                        desc = hObj.optString("desc", desc)
                        type = hObj.optString("type", type)
                    }
                }

                views.setTextViewText(timeIds[i], time)
                views.setTextViewText(tempIds[i], temp)
                views.setTextViewText(descIds[i], desc)
                setWidgetIcon(context, views, iconIds[i], getWeatherIconRes(type), 20)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun setWidgetIcon(context: Context, views: RemoteViews, viewId: Int, resId: Int, sizeDp: Int = 20) {
            try {
                val drawable = ContextCompat.getDrawable(context, resId)
                if (drawable != null) {
                    val density = context.resources.displayMetrics.density
                    val sizePx = (sizeDp * density).toInt().coerceAtLeast(1)
                    val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(bitmap)
                    drawable.setBounds(0, 0, canvas.width, canvas.height)
                    drawable.draw(canvas)
                    views.setImageViewBitmap(viewId, bitmap)
                    return
                }
            } catch (e: Exception) {
                Log.e("WeatherWidget4x2", "Failed to render icon to bitmap", e)
            }
            views.setImageViewResource(viewId, resId)
        }

        private fun getWeatherIconRes(weatherType: String): Int {
            return when (weatherType.lowercase()) {
                "sunny" -> R.drawable.ic_weather_sunny
                "cloudy", "overcast" -> R.drawable.ic_weather_cloudy
                "rain" -> R.drawable.ic_weather_rainy
                "snow" -> R.drawable.ic_weather_snowy
                "thunder" -> R.drawable.ic_weather_thunder
                else -> R.drawable.ic_weather_sunny
            }
        }
    }
}
