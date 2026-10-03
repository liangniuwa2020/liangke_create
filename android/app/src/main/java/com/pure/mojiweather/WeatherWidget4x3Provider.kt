package com.pure.mojiweather

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WeatherWidget4x3Provider : AppWidgetProvider() {

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
        const val ACTION_REFRESH_WIDGET = "com.pure.mojiweather.ACTION_REFRESH_WIDGET_4X3"
        const val PREFS_NAME = "MojiWeatherWidgetPrefs"
        const val KEY_WEATHER_DATA = "widget_weather_json"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, WeatherWidget4x3Provider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (id in appWidgetIds) {
                updateWidget(context, appWidgetManager, id)
            }
        }

        private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_weather_4x3)

            // 1. 设置打开 App 主界面的 PendingIntent
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingLaunchIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingLaunchIntent)

            // 2. 设置点击刷新按钮的 PendingIntent
            val refreshIntent = Intent(context, WeatherWidget4x3Provider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val pendingRefreshIntent = PendingIntent.getBroadcast(
                context, 1, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingRefreshIntent)

            // 3. 读取本地保存的天气数据
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_WEATHER_DATA, null)

            var cityName = "北京"
            var tempStr = "24°"
            var weatherDesc = "晴朗"
            var weatherType = "sunny"
            var tempRange = "26° / 15°"
            var aqiText = "优 32"
            var windInfo = "微风 2级"
            var humidityInfo = "湿度 48%"
            var airDesc = "体感舒适"
            var updateTime = SimpleDateFormat("HH:mm 更新", Locale.CHINA).format(Date())

            var f1Title = "明天"
            var f1Desc = "晴"
            var f1Type = "sunny"
            var f1Temp = "25° / 14°"

            var f2Title = "后天"
            var f2Desc = "多云"
            var f2Type = "cloudy"
            var f2Temp = "23° / 13°"

            var f3Title = "周一"
            var f3Desc = "小雨"
            var f3Type = "rain"
            var f3Temp = "21° / 12°"

            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val json = JSONObject(jsonStr)
                    cityName = json.optString("city", cityName)
                    tempStr = "${json.optInt("temp", 24)}°"
                    weatherDesc = json.optString("weatherDesc", weatherDesc)
                    weatherType = json.optString("weatherType", weatherType)
                    val maxT = json.optInt("maxTemp", 26)
                    val minT = json.optInt("minTemp", 15)
                    tempRange = "$maxT° / $minT°"
                    
                    val aqiVal = json.optInt("aqi", 32)
                    val aqiLevel = json.optString("aqiLevel", "优")
                    aqiText = "$aqiLevel $aqiVal"

                    windInfo = json.optString("windInfo", windInfo)
                    humidityInfo = json.optString("humidityInfo", humidityInfo)
                    airDesc = json.optString("airDesc", airDesc)
                    updateTime = json.optString("updateTime", updateTime)

                    // 读取未来预报
                    val forecastArr = json.optJSONArray("forecast")
                    if (forecastArr != null && forecastArr.length() >= 3) {
                        val d1 = forecastArr.getJSONObject(0)
                        f1Title = d1.optString("title", f1Title)
                        f1Desc = d1.optString("desc", f1Desc)
                        f1Type = d1.optString("type", f1Type)
                        f1Temp = "${d1.optInt("maxTemp", 25)}° / ${d1.optInt("minTemp", 14)}°"

                        val d2 = forecastArr.getJSONObject(1)
                        f2Title = d2.optString("title", f2Title)
                        f2Desc = d2.optString("desc", f2Desc)
                        f2Type = d2.optString("type", f2Type)
                        f2Temp = "${d2.optInt("maxTemp", 23)}° / ${d2.optInt("minTemp", 13)}°"

                        val d3 = forecastArr.getJSONObject(2)
                        f3Title = d3.optString("title", f3Title)
                        f3Desc = d3.optString("desc", f3Desc)
                        f3Type = d3.optString("type", f3Type)
                        f3Temp = "${d3.optInt("maxTemp", 21)}° / ${d3.optInt("minTemp", 12)}°"
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            // 4. 计算当前中文日期
            val dateFmt = SimpleDateFormat("M月d日 E", Locale.CHINA)
            val currentDateStr = dateFmt.format(Date())

            // 5. 绑定视图数据
            views.setTextViewText(R.id.widget_city_name, cityName)
            views.setTextViewText(R.id.widget_update_time, updateTime)
            views.setTextViewText(R.id.widget_date_label, currentDateStr)
            views.setTextViewText(R.id.widget_temperature, tempStr)
            views.setTextViewText(R.id.widget_weather_desc, weatherDesc)
            views.setTextViewText(R.id.widget_temp_range, tempRange)
            views.setTextViewText(R.id.widget_aqi_text, aqiText)
            views.setTextViewText(R.id.widget_wind_info, windInfo)
            views.setTextViewText(R.id.widget_humidity_info, humidityInfo)
            views.setTextViewText(R.id.widget_air_desc, airDesc)

            views.setImageViewResource(R.id.widget_weather_icon, getWeatherIconRes(weatherType))

            // 预报 Day 1
            views.setTextViewText(R.id.widget_f1_title, f1Title)
            views.setTextViewText(R.id.widget_f1_desc, f1Desc)
            views.setTextViewText(R.id.widget_f1_temp, f1Temp)
            views.setImageViewResource(R.id.widget_f1_icon, getWeatherIconRes(f1Type))

            // 预报 Day 2
            views.setTextViewText(R.id.widget_f2_title, f2Title)
            views.setTextViewText(R.id.widget_f2_desc, f2Desc)
            views.setTextViewText(R.id.widget_f2_temp, f2Temp)
            views.setImageViewResource(R.id.widget_f2_icon, getWeatherIconRes(f2Type))

            // 预报 Day 3
            views.setTextViewText(R.id.widget_f3_title, f3Title)
            views.setTextViewText(R.id.widget_f3_desc, f3Desc)
            views.setTextViewText(R.id.widget_f3_temp, f3Temp)
            views.setImageViewResource(R.id.widget_f3_icon, getWeatherIconRes(f3Type))

            appWidgetManager.updateAppWidget(appWidgetId, views)
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
