package com.pure.mojiweather

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.RemoteViews
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

object WeatherWidgetSyncHelper {
    private const val TAG = "WidgetSyncHelper"
    const val PREFS_NAME = "MojiWeatherWidgetPrefs"
    const val KEY_WEATHER_DATA = "widget_weather_json"
    const val KEY_LATITUDE = "widget_lat"
    const val KEY_LONGITUDE = "widget_lon"
    const val KEY_CITY_NAME = "widget_city_name"
    const val KEY_WIDGET_SKIN = "widget_skin_type" // "dark" | "white" | "glass"
    const val ACTION_SWITCH_WIDGET_SKIN = "com.pure.mojiweather.ACTION_SWITCH_WIDGET_SKIN"

    const val ACTION_AUTO_REFRESH_20MIN = "com.pure.mojiweather.ACTION_AUTO_REFRESH_20MIN"
    private const val REFRESH_INTERVAL_MILLIS = 20 * 60 * 1000L // 20 分钟

    @Volatile
    private var isRefreshing = false

    /**
     * 循环切换小部件皮肤 (dark -> white -> glass -> dark) 并立即刷新
     */
    fun toggleWidgetSkin(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val currentSkin = prefs.getString(KEY_WIDGET_SKIN, "dark") ?: "dark"
        val nextSkin = when (currentSkin.lowercase()) {
            "dark" -> "white"
            "white" -> "glass"
            "glass" -> "dark"
            else -> "white"
        }
        prefs.edit().putString(KEY_WIDGET_SKIN, nextSkin).apply()

        // 立即更新所有小部件
        WeatherWidget4x3Provider.updateAllWidgets(context)
        WeatherWidget4x2Provider.updateAllWidgets(context)
        WeatherWidget4x1Provider.updateAllWidgets(context)

        val skinName = when (nextSkin) {
            "white" -> "极简白卡"
            "glass" -> "通透毛玻璃"
            else -> "沉浸深黑"
        }
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, "已切换桌面小部件皮肤：$skinName", Toast.LENGTH_SHORT).show()
        }
        Log.d(TAG, "Toggled widget skin from $currentSkin to $nextSkin")
    }

    /**
     * 启动或校准 20 分钟后台自动刷新闹钟 (支持低电耗模式下唤醒执行)
     */
    fun schedule20MinAutoRefresh(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, WeatherWidgetAutoRefreshReceiver::class.java).apply {
                action = ACTION_AUTO_REFRESH_20MIN
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 10020, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val triggerAtMillis = System.currentTimeMillis() + REFRESH_INTERVAL_MILLIS
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            }
            Log.d(TAG, "Scheduled 20-min auto refresh alarm at $triggerAtMillis")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule auto refresh", e)
        }
    }

    /**
     * 在后台线程直接拉取气象数据，更新本地缓存并刷新全部桌面小部件
     * @param showFeedback 是否在桌面显示交互反馈（如点击小部件刷新时提示 Toast 与界面状态）
     */
    fun fetchWeatherInBackground(context: Context, showFeedback: Boolean = true) {
        if (isRefreshing) {
            if (showFeedback) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "正在更新天气，请稍候...", Toast.LENGTH_SHORT).show()
                }
            }
            return
        }

        isRefreshing = true

        // 1. 如果需要反馈，先在所有小部件的“更新时间”位置即时显示“正在刷新...”
        if (showFeedback) {
            setWidgetsUpdatingState(context, "正在刷新...")
        }

        Thread {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val lat = prefs.getFloat(KEY_LATITUDE, 28.6829f).toDouble()
                val lon = prefs.getFloat(KEY_LONGITUDE, 115.8906f).toDouble()
                val savedCity = prefs.getString(KEY_CITY_NAME, "南昌市") ?: "南昌市"

                // 2. HTTP 请求 Open-Meteo 实时预报接口
                val weatherUrlStr = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto"
                val weatherJsonStr = httpGet(weatherUrlStr)

                // 3. HTTP 请求 Open-Meteo 空气质量接口
                val aqiUrlStr = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=$lat&longitude=$lon&current=us_aqi&timezone=auto"
                val aqiJsonStr = try { httpGet(aqiUrlStr) } catch (_: Exception) { null }

                if (!weatherJsonStr.isNullOrEmpty()) {
                    val weatherObj = JSONObject(weatherJsonStr)
                    val currentObj = weatherObj.optJSONObject("current")
                    val dailyObj = weatherObj.optJSONObject("daily")
                    val hourlyObj = weatherObj.optJSONObject("hourly")

                    val currentTemp = currentObj?.optDouble("temperature_2m", 24.0)?.toInt() ?: 24
                    val weatherCode = currentObj?.optInt("weather_code", 0) ?: 0
                    val isDay = currentObj?.optInt("is_day", 1) ?: 1
                    val (wLabel, wType) = mapWmoCode(weatherCode, isDay == 1)

                    val maxT = dailyObj?.optJSONArray("temperature_2m_max")?.optDouble(0, 26.0)?.toInt() ?: 26
                    val minT = dailyObj?.optJSONArray("temperature_2m_min")?.optDouble(0, 15.0)?.toInt() ?: 15
                    val rainProb = dailyObj?.optJSONArray("precipitation_probability_max")?.optInt(0, 0) ?: 0

                    val humidity = currentObj?.optInt("relative_humidity_2m", 48) ?: 48
                    val windSpeed = currentObj?.optDouble("wind_speed_10m", 8.0) ?: 8.0
                    val windDir = currentObj?.optDouble("wind_direction_10m", 0.0) ?: 0.0
                    val windInfo = formatWind(windDir, windSpeed)

                    // 空气质量 (AQI)
                    var aqi = 32
                    if (!aqiJsonStr.isNullOrEmpty()) {
                        try {
                            val aqiObj = JSONObject(aqiJsonStr).optJSONObject("current")
                            aqi = aqiObj?.optInt("us_aqi", 32) ?: 32
                        } catch (_: Exception) {}
                    }
                    val aqiLevel = when {
                        aqi <= 50 -> "优"
                        aqi <= 100 -> "良"
                        aqi <= 150 -> "轻度"
                        aqi <= 200 -> "中度"
                        else -> "重度"
                    }

                    val nowTimeStr = SimpleDateFormat("HH:mm 更新", Locale.CHINA).format(Date())

                    // 构造 7 天预测
                    val forecast7d = JSONArray()
                    val dayNames = arrayOf("今天", "明天", "后天")
                    val calendar = Calendar.getInstance()
                    val weekDays = arrayOf("周日", "周一", "周二", "周三", "周四", "周五", "周六")
                    val dailyCodes = dailyObj?.optJSONArray("weather_code")
                    val dailyMaxs = dailyObj?.optJSONArray("temperature_2m_max")
                    val dailyMins = dailyObj?.optJSONArray("temperature_2m_min")

                    for (i in 0 until 7) {
                        val itemObj = JSONObject()
                        val title = if (i < 3) {
                            dayNames[i]
                        } else {
                            val tempCal = Calendar.getInstance()
                            tempCal.add(Calendar.DAY_OF_YEAR, i)
                            weekDays[tempCal.get(Calendar.DAY_OF_WEEK) - 1]
                        }
                        itemObj.put("title", title)
                        val code = dailyCodes?.optInt(i, 0) ?: 0
                        val (_, type) = mapWmoCode(code, true)
                        itemObj.put("type", type)
                        itemObj.put("maxTemp", dailyMaxs?.optDouble(i, 24.0)?.toInt() ?: 24)
                        itemObj.put("minTemp", dailyMins?.optDouble(i, 15.0)?.toInt() ?: 15)
                        forecast7d.put(itemObj)
                    }

                    // 构造 24 小时预测
                    val hourly24 = JSONArray()
                    val hourlyTemps = hourlyObj?.optJSONArray("temperature_2m")
                    val hourlyCodes = hourlyObj?.optJSONArray("weather_code")
                    val currentHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                    for (i in 0 until 24) {
                        val hObj = JSONObject()
                        val targetHour = (currentHour + i) % 24
                        hObj.put("time", if (i == 0) "现在" else String.format(Locale.CHINA, "%02d:00", targetHour))
                        hObj.put("temp", hourlyTemps?.optDouble(i, 22.0)?.toInt() ?: 22)
                        val hCode = hourlyCodes?.optInt(i, 0) ?: 0
                        val isDayHour = targetHour in 6..18
                        val (_, hType) = mapWmoCode(hCode, isDayHour)
                        hObj.put("type", hType)
                        hourly24.put(hObj)
                    }

                    // 组装完整 JSON Payload 并持久化
                    val payload = JSONObject().apply {
                        put("city", savedCity)
                        put("temp", currentTemp)
                        put("weatherDesc", wLabel)
                        put("weatherType", wType)
                        put("maxTemp", maxT)
                        put("minTemp", minT)
                        put("rainProb", rainProb)
                        put("aqi", aqi)
                        put("aqiLevel", aqiLevel)
                        put("windInfo", windInfo)
                        put("humidityInfo", "湿度 $humidity%")
                        put("airDesc", "空气质量$aqiLevel")
                        put("updateTime", nowTimeStr)
                        put("forecast", forecast7d)
                        put("forecast7d", forecast7d)
                        put("hourly24", hourly24)
                    }

                    prefs.edit().putString(KEY_WEATHER_DATA, payload.toString()).apply()

                    // 立即更新全部 4x3, 4x2, 4x1 小部件
                    WeatherWidget4x3Provider.updateAllWidgets(context)
                    WeatherWidget4x2Provider.updateAllWidgets(context)
                    WeatherWidget4x1Provider.updateAllWidgets(context)

                    if (showFeedback) {
                        Handler(Looper.getMainLooper()).post {
                            Toast.makeText(context, "${savedCity}天气已更新 ($nowTimeStr)", Toast.LENGTH_SHORT).show()
                        }
                    }
                    Log.d(TAG, "Weather sync succeeded: $nowTimeStr, temp=$currentTemp")
                } else {
                    throw Exception("Empty weather response from Open-Meteo")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Weather sync failed", e)
                // 恢复此前微件界面
                WeatherWidget4x3Provider.updateAllWidgets(context)
                WeatherWidget4x2Provider.updateAllWidgets(context)
                WeatherWidget4x1Provider.updateAllWidgets(context)
                if (showFeedback) {
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(context, "天气更新失败，请检查网络连接", Toast.LENGTH_SHORT).show()
                    }
                }
            } finally {
                isRefreshing = false
            }
        }.start()
    }

    private fun setWidgetsUpdatingState(context: Context, statusText: String) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)

            // 4x3
            val c4x3 = ComponentName(context, WeatherWidget4x3Provider::class.java)
            val ids4x3 = appWidgetManager.getAppWidgetIds(c4x3)
            if (ids4x3.isNotEmpty()) {
                val views = RemoteViews(context.packageName, R.layout.widget_weather_4x3)
                views.setTextViewText(R.id.widget_update_time, statusText)
                appWidgetManager.partiallyUpdateAppWidget(ids4x3, views)
            }

            // 4x2
            val c4x2 = ComponentName(context, WeatherWidget4x2Provider::class.java)
            val ids4x2 = appWidgetManager.getAppWidgetIds(c4x2)
            if (ids4x2.isNotEmpty()) {
                val views = RemoteViews(context.packageName, R.layout.widget_weather_4x2)
                views.setTextViewText(R.id.widget_update_time, statusText)
                appWidgetManager.partiallyUpdateAppWidget(ids4x2, views)
            }

            // 4x1
            val c4x1 = ComponentName(context, WeatherWidget4x1Provider::class.java)
            val ids4x1 = appWidgetManager.getAppWidgetIds(c4x1)
            if (ids4x1.isNotEmpty()) {
                val views = RemoteViews(context.packageName, R.layout.widget_weather_4x1)
                views.setTextViewText(R.id.widget_sub_info, statusText)
                appWidgetManager.partiallyUpdateAppWidget(ids4x1, views)
            }
        } catch (e: Exception) {
            Log.e(TAG, "setWidgetsUpdatingState error", e)
        }
    }

    private fun httpGet(urlStr: String): String? {
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 9000
        conn.readTimeout = 9000
        conn.setRequestProperty("User-Agent", "MojiWeatherPure/1.1.9")
        if (conn.responseCode == HttpURLConnection.HTTP_OK) {
            val reader = BufferedReader(InputStreamReader(conn.inputStream))
            val sb = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                sb.append(line)
            }
            reader.close()
            return sb.toString()
        }
        return null
    }

    private fun mapWmoCode(code: Int, isDay: Boolean): Pair<String, String> {
        return when (code) {
            0 -> Pair("晴", "sunny")
            1 -> Pair("大部晴朗", "sunny")
            2 -> Pair("多云", "cloudy")
            3 -> Pair("阴", "overcast")
            45, 48 -> Pair("雾", "cloudy")
            51, 53, 55, 56, 57 -> Pair("毛毛雨", "rain")
            61, 63 -> Pair("小雨", "rain")
            65, 66, 67 -> Pair("大雨", "rain")
            71, 73, 75, 77 -> Pair("小雪", "snow")
            80, 81, 82 -> Pair("阵雨", "rain")
            85, 86 -> Pair("阵雪", "snow")
            95, 96, 99 -> Pair("雷阵雨", "thunder")
            else -> Pair("晴", "sunny")
        }
    }

    private fun formatWind(deg: Double, speedKmh: Double): String {
        val dirs = arrayOf("北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风")
        val dirIdx = (((deg + 22.5) % 360) / 45).toInt().coerceIn(0, 7)
        val dirStr = dirs[dirIdx]
        val scale = when {
            speedKmh < 12.0 -> "2级"
            speedKmh < 20.0 -> "3级"
            speedKmh < 29.0 -> "4级"
            speedKmh < 39.0 -> "5级"
            else -> "6级以上"
        }
        return "$dirStr $scale"
    }
}
