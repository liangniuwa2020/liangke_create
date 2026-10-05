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


            var forecastArr: org.json.JSONArray? = null
            var hourlyArr: org.json.JSONArray? = null
            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val json = JSONObject(jsonStr)
                    cityName = json.optString("city", cityName)
                    tempStr = "${json.optInt("temp", 24)}°"
                    weatherDesc = json.optString("weatherDesc", weatherDesc)
                    weatherType = json.optString("weatherType", weatherType)
                    val maxT = json.optInt("maxTemp", 26)
                    val minT = json.optInt("minTemp", 15)
                    val rainProb = json.optInt("rainProb", 0)
                    tempRange = "$maxT° / $minT° · 降雨 $rainProb%"
                    
                    val aqiVal = json.optInt("aqi", 32)
                    val aqiLevel = json.optString("aqiLevel", "优")
                    aqiText = "$aqiLevel $aqiVal"

                    windInfo = json.optString("windInfo", windInfo)
                    humidityInfo = json.optString("humidityInfo", humidityInfo)
                    airDesc = json.optString("airDesc", airDesc)
                    updateTime = json.optString("updateTime", updateTime)

                    forecastArr = json.optJSONArray("forecast7d") ?: json.optJSONArray("forecast")
                    hourlyArr = json.optJSONArray("hourly24")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            // 4. 计算当前中文日期
            val dateFmt = SimpleDateFormat("M月d日 E", Locale.CHINA)
            val currentDateStr = dateFmt.format(Date())

            // 5. 绑定头部与指标数据
            views.setTextViewText(R.id.widget_city_name, cityName)
            views.setTextViewText(R.id.widget_update_time, updateTime)
            views.setTextViewText(R.id.widget_date_label, currentDateStr)
            views.setTextViewText(R.id.widget_temperature, tempStr)
            views.setTextViewText(R.id.widget_weather_desc, weatherDesc)
            views.setTextViewText(R.id.widget_temp_range, tempRange)
            views.setTextViewText(R.id.widget_aqi_text, aqiText)
            views.setTextViewText(R.id.widget_wind_info, windInfo)
            views.setTextViewText(R.id.widget_humidity_info, humidityInfo)

            setWidgetIcon(context, views, R.id.widget_weather_icon, getWeatherIconRes(weatherType), 30)

            // 6. 绑定下半部分第 1 排：间隔 2 小时的天气 (7 个节点: 0h, +2h, +4h, +6h, +8h, +10h, +12h)
            val hourlyTimeIds = intArrayOf(
                R.id.widget_h1_time, R.id.widget_h2_time, R.id.widget_h3_time,
                R.id.widget_h4_time, R.id.widget_h5_time, R.id.widget_h6_time, R.id.widget_h7_time
            )
            val hourlyIconIds = intArrayOf(
                R.id.widget_h1_icon, R.id.widget_h2_icon, R.id.widget_h3_icon,
                R.id.widget_h4_icon, R.id.widget_h5_icon, R.id.widget_h6_icon, R.id.widget_h7_icon
            )
            val hourlyTempIds = intArrayOf(
                R.id.widget_h1_temp, R.id.widget_h2_temp, R.id.widget_h3_temp,
                R.id.widget_h4_temp, R.id.widget_h5_temp, R.id.widget_h6_temp, R.id.widget_h7_temp
            )

            val hourlyIndices = intArrayOf(0, 2, 4, 6, 8, 10, 12)
            val defaultHourlyTimes = arrayOf("现在", "01:00", "03:00", "05:00", "07:00", "09:00", "11:00")
            val defaultHourlyTemps = arrayOf("24°", "22°", "21°", "20°", "23°", "25°", "24°")
            val defaultHourlyTypes = arrayOf("sunny", "cloudy", "cloudy", "sunny", "sunny", "sunny", "rain")

            for (i in 0 until 7) {
                var time = defaultHourlyTimes[i]
                var temp = defaultHourlyTemps[i]
                var type = defaultHourlyTypes[i]

                val targetIdx = hourlyIndices[i]
                if (hourlyArr != null && targetIdx < hourlyArr.length()) {
                    val hObj = hourlyArr.optJSONObject(targetIdx)
                    if (hObj != null) {
                        time = hObj.optString("time", time)
                        val tVal = hObj.optInt("temp", 24)
                        temp = "$tVal°"
                        type = hObj.optString("type", type)
                    }
                }

                views.setTextViewText(hourlyTimeIds[i], time)
                views.setTextViewText(hourlyTempIds[i], temp)
                setWidgetIcon(context, views, hourlyIconIds[i], getWeatherIconRes(type), 18)
            }

            // 7. 绑定下半部分第 2 排：未来 7 天 (每天天气)
            val titleIds = intArrayOf(
                R.id.widget_f1_title, R.id.widget_f2_title, R.id.widget_f3_title,
                R.id.widget_f4_title, R.id.widget_f5_title, R.id.widget_f6_title, R.id.widget_f7_title
            )
            val iconIds = intArrayOf(
                R.id.widget_f1_icon, R.id.widget_f2_icon, R.id.widget_f3_icon,
                R.id.widget_f4_icon, R.id.widget_f5_icon, R.id.widget_f6_icon, R.id.widget_f7_icon
            )
            val tempIds = intArrayOf(
                R.id.widget_f1_temp, R.id.widget_f2_temp, R.id.widget_f3_temp,
                R.id.widget_f4_temp, R.id.widget_f5_temp, R.id.widget_f6_temp, R.id.widget_f7_temp
            )

            val defaultTitles = arrayOf("今天", "明天", "后天", "周二", "周三", "周四", "周五")
            val defaultTypes = arrayOf("sunny", "cloudy", "rain", "cloudy", "sunny", "rain", "sunny")
            val defaultTemps = arrayOf("26°/15°", "25°/14°", "23°/13°", "22°/12°", "24°/13°", "20°/11°", "23°/12°")

            for (i in 0 until 7) {
                var title = defaultTitles[i]
                var type = defaultTypes[i]
                var temp = defaultTemps[i]

                if (forecastArr != null && i < forecastArr.length()) {
                    val d = forecastArr.optJSONObject(i)
                    if (d != null) {
                        title = d.optString("title", title)
                        type = d.optString("type", type)
                        val max = d.optInt("maxTemp", 24)
                        val min = d.optInt("minTemp", 15)
                        temp = "$max°/$min°"
                    }
                }

                views.setTextViewText(titleIds[i], title)
                views.setTextViewText(tempIds[i], temp)
                setWidgetIcon(context, views, iconIds[i], getWeatherIconRes(type), 18)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun setWidgetIcon(context: Context, views: RemoteViews, viewId: Int, resId: Int, sizeDp: Int = 36) {
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
                Log.e("WeatherWidget4x3", "Failed to render icon to bitmap", e)
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
