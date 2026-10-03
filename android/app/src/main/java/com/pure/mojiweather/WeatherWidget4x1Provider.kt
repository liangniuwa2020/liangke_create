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

class WeatherWidget4x1Provider : AppWidgetProvider() {

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
        const val ACTION_REFRESH_WIDGET = "com.pure.mojiweather.ACTION_REFRESH_WIDGET_4X1"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, WeatherWidget4x1Provider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (id in appWidgetIds) {
                updateWidget(context, appWidgetManager, id)
            }
        }

        private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_weather_4x1)

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingLaunchIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingLaunchIntent)

            val refreshIntent = Intent(context, WeatherWidget4x1Provider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val pendingRefreshIntent = PendingIntent.getBroadcast(
                context, 3, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingRefreshIntent)

            val prefs = context.getSharedPreferences(WeatherWidget4x3Provider.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(WeatherWidget4x3Provider.KEY_WEATHER_DATA, null)

            var cityName = "南昌"
            var tempStr = "24°"
            var weatherDesc = "晴朗"
            var weatherType = "sunny"
            var tempRange = "26°/15°"
            var aqiText = "优 32"
            var windInfo = "微风 2级"
            var humidityInfo = "湿度 48%"

            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val json = JSONObject(jsonStr)
                    cityName = json.optString("city", cityName)
                    tempStr = "${json.optInt("temp", 24)}°"
                    weatherDesc = json.optString("weatherDesc", weatherDesc)
                    weatherType = json.optString("weatherType", weatherType)
                    val maxT = json.optInt("maxTemp", 26)
                    val minT = json.optInt("minTemp", 15)
                    tempRange = "$maxT°/$minT°"
                    
                    val aqiVal = json.optInt("aqi", 32)
                    val aqiLevel = json.optString("aqiLevel", "优")
                    aqiText = "$aqiLevel $aqiVal"

                    windInfo = json.optString("windInfo", windInfo)
                    humidityInfo = json.optString("humidityInfo", humidityInfo)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            val dateFmt = SimpleDateFormat("M月d日 E", Locale.CHINA)
            val currentDateStr = dateFmt.format(Date())

            views.setTextViewText(R.id.widget_city_name, cityName)
            views.setTextViewText(R.id.widget_date_label, currentDateStr)
            views.setTextViewText(R.id.widget_temperature, tempStr)
            views.setTextViewText(R.id.widget_weather_desc, "$weatherDesc $tempRange")
            views.setTextViewText(R.id.widget_aqi_text, aqiText)
            views.setTextViewText(R.id.widget_sub_info, "$windInfo · $humidityInfo")

            val iconRes = when (weatherType.lowercase()) {
                "sunny" -> R.drawable.ic_weather_sunny
                "cloudy", "overcast" -> R.drawable.ic_weather_cloudy
                "rain" -> R.drawable.ic_weather_rainy
                "snow" -> R.drawable.ic_weather_snowy
                "thunder" -> R.drawable.ic_weather_thunder
                else -> R.drawable.ic_weather_sunny
            }
            setWidgetIcon(context, views, R.id.widget_weather_icon, iconRes, 28)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun setWidgetIcon(context: Context, views: RemoteViews, viewId: Int, resId: Int, sizeDp: Int = 28) {
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
                Log.e("WeatherWidget4x1", "Failed to render icon to bitmap", e)
            }
            views.setImageViewResource(viewId, resId)
        }
    }
}
