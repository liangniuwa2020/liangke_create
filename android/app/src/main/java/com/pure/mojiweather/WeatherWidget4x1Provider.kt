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
        WeatherWidgetSyncHelper.schedule20MinAutoRefresh(context)
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_WIDGET) {
            // 点击小部件刷新：直接后台更新天气状态，无需返回主界面
            WeatherWidgetSyncHelper.fetchWeatherInBackground(context, showFeedback = true)
        } else if (intent.action == WeatherWidgetSyncHelper.ACTION_SWITCH_WIDGET_SKIN) {
            // 点击小部件换肤按钮：循环切换皮肤并立即刷新全量微件
            WeatherWidgetSyncHelper.toggleWidgetSkin(context)
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

            // 直接刷新小部件，不返回主界面
            val refreshIntent = Intent(context, WeatherWidget4x1Provider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val pendingRefreshIntent = PendingIntent.getBroadcast(
                context, 3, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingRefreshIntent)
            views.setOnClickPendingIntent(R.id.widget_sub_info, pendingRefreshIntent)

            // 设置小部件皮肤切换按钮的 PendingIntent
            val skinIntent = Intent(context, WeatherWidget4x1Provider::class.java).apply {
                action = WeatherWidgetSyncHelper.ACTION_SWITCH_WIDGET_SKIN
            }
            val pendingSkinIntent = PendingIntent.getBroadcast(
                context, 401, skinIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_skin, pendingSkinIntent)

            val prefs = context.getSharedPreferences(WeatherWidgetSyncHelper.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(WeatherWidgetSyncHelper.KEY_WEATHER_DATA, null)
            val skinType = prefs.getString(WeatherWidgetSyncHelper.KEY_WIDGET_SKIN, "dark") ?: "dark"

            // 根据所选皮肤设置背景样式
            when (skinType.lowercase()) {
                "white" -> {
                    views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_bg_4x1_white)
                    views.setTextColor(R.id.widget_text_clock, 0xFF0F172A.toInt())
                    views.setTextColor(R.id.widget_city_name, 0xFF0F172A.toInt())
                    views.setTextColor(R.id.widget_temperature, 0xFF0F172A.toInt())
                    views.setTextColor(R.id.widget_date_label, 0xFF475569.toInt())
                    views.setTextColor(R.id.widget_weather_desc, 0xFF334155.toInt())
                    views.setTextColor(R.id.widget_sub_info, 0xFF64748B.toInt())
                    views.setInt(R.id.widget_btn_skin, "setColorFilter", 0xFF0F172A.toInt())
                    views.setInt(R.id.widget_btn_refresh, "setColorFilter", 0xFF0F172A.toInt())
                }
                "glass" -> {
                    views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_bg_4x1_glass)
                    views.setTextColor(R.id.widget_text_clock, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_city_name, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_temperature, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_date_label, 0xFFE2E8F0.toInt())
                    views.setTextColor(R.id.widget_weather_desc, 0xFFF1F5F9.toInt())
                    views.setTextColor(R.id.widget_sub_info, 0xFFCBD5E1.toInt())
                    views.setInt(R.id.widget_btn_skin, "setColorFilter", 0xFFFFFFFF.toInt())
                    views.setInt(R.id.widget_btn_refresh, "setColorFilter", 0xFFFFFFFF.toInt())
                }
                else -> { // "dark"
                    views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_bg_4x1)
                    views.setTextColor(R.id.widget_text_clock, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_city_name, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_temperature, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_date_label, 0xFFCBD5E1.toInt())
                    views.setTextColor(R.id.widget_weather_desc, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_sub_info, 0xFF94A3B8.toInt())
                    views.setInt(R.id.widget_btn_skin, "setColorFilter", 0xFFE2E8F0.toInt())
                    views.setInt(R.id.widget_btn_refresh, "setColorFilter", 0xFFE2E8F0.toInt())
                }
            }

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
