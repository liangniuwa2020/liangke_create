package com.pure.mojiweather

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
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
    /** 最近一次成功联网抓取的时间戳（毫秒）。JS 侧唤醒时会读取它判断要不要立刻补一次刷新。 */
    const val KEY_LAST_SYNC_AT = "widget_last_sync_at"
    /** 连续失败次数：WorkManager 据此判断是否需要进入退避重试 */
    const val KEY_SYNC_FAIL_COUNT = "widget_sync_fail_count"
    /** 最近一次失败时间戳（毫秒），用于界面提示「数据已陈旧多久」 */
    const val KEY_LAST_FAIL_AT = "widget_last_fail_at"
    const val ACTION_SWITCH_WIDGET_SKIN = "com.pure.mojiweather.ACTION_SWITCH_WIDGET_SKIN"

    const val ACTION_AUTO_REFRESH_30MIN = "com.pure.mojiweather.ACTION_AUTO_REFRESH_30MIN"
    private const val REFRESH_INTERVAL_MILLIS = 30 * 60 * 1000L // 30 分钟
    private const val ALARM_REQUEST_CODE = 10030
    /** 兜底周期闹钟用另一个 requestCode，才能和上面的一次性精确闹钟共存 */
    private const val BACKUP_REQUEST_CODE = 10031

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
     * 启动或校准 30 分钟后台自动刷新闹钟。
     *
     * 关键设计：一次精确闹钟 + 一次重复闹钟**双通道并存**。
     * 历史 bug（v1.2.5 修复）：原来只用 setExactAndAllowWhileIdle 做一次性链式调度，
     * 只有等到抓取成功后的 finally 回调里才排下一次。只要某次广播丢失、进程被杀、
     * 或用户手动清理后台，整条链就永久断开 —— 表现就是「关屏过夜后再也不刷新」。
     * 现在额外注册一个 setInexactRepeating 的兜底闹钟：它由系统自己维持，不依赖任何一次
     * 抓取是否成功，即使进程被杀掉系统也会在到点时重新拉起广播接收器。
     *
     * Android 12 (API 31) 之后，没有 SCHEDULE_EXACT_ALARM 授权时调用
     * setExactAndAllowWhileIdle 会直接抛 SecurityException，此时降级为
     * setAndAllowWhileIdle，牺牲精确性换取「一定能刷新」。
     */
    fun scheduleAutoRefresh(context: Context) {
        scheduleExactOnce(context)
        scheduleRepeatingBackup(context)
    }

    /** 一次性精确闹钟：优先享受系统精确唤醒，能压到 30 分钟准点 */
    private fun scheduleExactOnce(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, WeatherWidgetAutoRefreshReceiver::class.java).apply {
                action = ACTION_AUTO_REFRESH_30MIN
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, ALARM_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val triggerAtMillis = System.currentTimeMillis() + REFRESH_INTERVAL_MILLIS

            val canScheduleExact = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }

            if (canScheduleExact) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
                Log.d(TAG, "Scheduled exact 30-min auto refresh alarm at $triggerAtMillis")
            } else {
                // 无精确闹钟权限：降级为允许 Doze 期间唤醒的非精确闹钟
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
                Log.w(TAG, "No exact-alarm permission, downgraded to setAndAllowWhileIdle at $triggerAtMillis")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule exact auto refresh", e)
        }
    }

    /**
     * 重复兜底闹钟：由系统自行维持的周期调度，不依赖 JS、不依赖上一次抓取结果。
     * setInexactRepeating 在 Doze 下可能被推迟（这是系统行为），但绝不会「永久不再触发」。
     * 幂等：同 requestCode 重复调用只会覆盖，不会堆叠出多个闹钟。
     */
    private fun scheduleRepeatingBackup(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, WeatherWidgetAutoRefreshReceiver::class.java).apply {
                action = ACTION_AUTO_REFRESH_30MIN
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, BACKUP_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.setInexactRepeating(
                AlarmManager.RTC_WAKEUP,
                System.currentTimeMillis() + REFRESH_INTERVAL_MILLIS,
                REFRESH_INTERVAL_MILLIS,
                pendingIntent
            )
            Log.d(TAG, "Scheduled repeating 30-min backup alarm (survives process death)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule repeating backup alarm", e)
        }
    }

    /**
     * 供 JS 读取：原生后台线程最近一次成功抓取的完整 JSON 与时间戳。
     * 用户从息屏/后台回到 App 时，JS 先用这份缓存立即上屏，再联网刷新，
     * 避免「打开 App 先看到昨天的数据」。
     * @return Pair(weatherJson, lastSyncAtMillis)；无缓存时分别为 null / 0
     */
    fun readCachedWeather(context: Context): Pair<String?, Long> {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_WEATHER_DATA, null)
            val lastSync = prefs.getLong(KEY_LAST_SYNC_AT, 0L)
            Pair(json, lastSync)
        } catch (e: Exception) {
            Log.e(TAG, "readCachedWeather error", e)
            Pair(null, 0L)
        }
    }

    /**
     * 统一的更新时间展示：只保存 HH:mm，后缀由界面侧集中拼接。
     * 本函数幂等 —— 传入值已带「更新」时不会重复追加，
     * 传入空值或「刚刚更新」时也不会拼出「刚刚更新 更新」。
     */
    fun formatUpdateTimeLabel(raw: String?): String {
        val text = (raw ?: "").trim()
        if (text.isEmpty()) return "刚刚更新"
        if (text.endsWith("更新")) return text
        return "$text 更新"
    }

    /**
     * 在后台线程直接拉取气象数据，更新本地缓存并刷新全部桌面小部件
     * @param showFeedback 是否在桌面显示交互反馈（如点击小部件刷新时提示 Toast 与界面状态）
     * @param onComplete 网络请求与小部件更新完毕后的回调（用于释放 WakeLock 或调度下次任务）
     */
    fun fetchWeatherInBackground(context: Context, showFeedback: Boolean = true, onComplete: (() -> Unit)? = null) {
        if (isRefreshing) {
            if (showFeedback) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "正在更新天气，请稍候...", Toast.LENGTH_SHORT).show()
                }
            }
            onComplete?.invoke()
            return
        }

        isRefreshing = true

        // 1. 如果需要反馈，先在所有小部件的“更新时间”位置即时显示“正在刷新...”
        if (showFeedback) {
            setWidgetsUpdatingState(context, "正在刷新...")
        }

        // 获取短暂 WakeLock (最长 60 秒超时防泄漏)，防止系统休眠中断后台网络请求
        val appContext = context.applicationContext
        val powerManager = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pure_moji:widget_refresh_lock")?.apply {
            setReferenceCounted(false)
            acquire(60000L)
        }

        Thread {
            try {
                performSync(appContext, showFeedback)
            } catch (e: Exception) {
                Log.e(TAG, "fetchWeatherInBackground unexpected error", e)
            } finally {
                isRefreshing = false
                try {
                    if (wakeLock?.isHeld == true) {
                        wakeLock.release()
                    }
                } catch (_: Exception) {}
                onComplete?.invoke()
            }
        }.start()
    }

    /**
     * 同步执行一次完整抓取（阻塞调用线程）。
     *
     * 抽出来的原因：WorkManager 的 Worker 在后台线程同步执行 `doWork()`，
     * 它需要拿到「这次到底成功没有」的确定结果才能决定 Result.success / Result.retry（退避重试）。
     * 原来的 `fetchWeatherInBackground` 是 fire-and-forget + 回调，无法表达成败。
     *
     * @return true 表示成功拿到并落盘了新的天气数据
     */
    fun performSync(appContext: Context, showFeedback: Boolean): Boolean {
        return try {
                val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val lat = prefs.getFloat(KEY_LATITUDE, 28.6829f).toDouble()
                val lon = prefs.getFloat(KEY_LONGITUDE, 115.8906f).toDouble()
                val savedCity = prefs.getString(KEY_CITY_NAME, "南昌市") ?: "南昌市"

                val ua = "NoAdWeather/${appVersion(appContext)}"

                // 2. HTTP 请求 Open-Meteo 实时预报接口
                val weatherUrlStr = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto"
                val weatherJsonStr = httpGet(weatherUrlStr, ua)

                // 3. HTTP 请求 Open-Meteo 空气质量接口
                val aqiUrlStr = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=$lat&longitude=$lon&current=us_aqi&timezone=auto"
                val aqiJsonStr = try { httpGet(aqiUrlStr, ua) } catch (_: Exception) { null }

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

                    // 空气质量 (AQI)：六档，与 JS 侧 getAqiLevel 完全一致
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
                        aqi <= 150 -> "轻度污染"
                        aqi <= 200 -> "中度污染"
                        aqi <= 300 -> "重度污染"
                        else -> "严重污染"
                    }

                    // 只保存 HH:mm，界面侧统一拼接「更新」后缀
                    val nowTimeStr = SimpleDateFormat("HH:mm", Locale.CHINA).format(Date())

                    // 构造 7 天预测
                    val forecast7d = JSONArray()
                    val dayNames = arrayOf("今天", "明天", "后天")
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

                    // 构造 24 小时预测：必须按 current.time 的小时值对齐 hourly 数组，
                    // 否则 hourly[0] 永远是 00:00，时间与温度会整体错位。
                    val hourly24 = JSONArray()
                    val hourlyTemps = hourlyObj?.optJSONArray("temperature_2m")
                    val hourlyCodes = hourlyObj?.optJSONArray("weather_code")
                    val currentTimeStr = currentObj?.optString("time", "") ?: ""
                    val hourlyStartIndex = if (currentTimeStr.length >= 13) {
                        currentTimeStr.substring(11, 13).toIntOrNull() ?: 0
                    } else {
                        Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                    }
                    for (i in 0 until 24) {
                        val hObj = JSONObject()
                        val sourceIdx = hourlyStartIndex + i
                        val targetHour = (hourlyStartIndex + i) % 24
                        hObj.put("time", if (i == 0) "现在" else String.format(Locale.CHINA, "%02d:00", targetHour))
                        hObj.put("temp", hourlyTemps?.optDouble(sourceIdx, 22.0)?.toInt() ?: 22)
                        val hCode = hourlyCodes?.optInt(sourceIdx, 0) ?: 0
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

                    // 缓存 + 同步时间戳一起落盘：JS 在 App 回到前台时据此判断缓存是否新鲜
                    // 成功一次就把连续失败计数清零，WorkManager 的退避才有意义
                    prefs.edit()
                        .putString(KEY_WEATHER_DATA, payload.toString())
                        .putLong(KEY_LAST_SYNC_AT, System.currentTimeMillis())
                        .putInt(KEY_SYNC_FAIL_COUNT, 0)
                        .apply()

                    // 立即更新全部 4x3, 4x2, 4x1 小部件
                    WeatherWidget4x3Provider.updateAllWidgets(appContext)
                    WeatherWidget4x2Provider.updateAllWidgets(appContext)
                    WeatherWidget4x1Provider.updateAllWidgets(appContext)

                    if (showFeedback) {
                        Handler(Looper.getMainLooper()).post {
                            Toast.makeText(appContext, "${savedCity}天气已更新 ($nowTimeStr)", Toast.LENGTH_SHORT).show()
                        }
                    }
                    Log.d(TAG, "Weather sync succeeded: $nowTimeStr, temp=$currentTemp")
                } else {
                    throw Exception("Empty weather response from Open-Meteo")
                }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Weather sync failed", e)
            // 失败也要把「上次成功时间」保留，界面会据此显示数据已陈旧
            recordFailure(appContext)
            // 恢复此前微件界面
            WeatherWidget4x3Provider.updateAllWidgets(appContext)
            WeatherWidget4x2Provider.updateAllWidgets(appContext)
            WeatherWidget4x1Provider.updateAllWidgets(appContext)
            if (showFeedback) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(appContext, "天气更新失败，请检查网络连接", Toast.LENGTH_SHORT).show()
                }
            }
            false
        }
    }

    /**
     * 记录一次失败：连续失败次数 + 最近失败时间。
     * 用途：WorkManager 的退避重试需要知道「是不是网络持续不可用」，
     * 界面也需要在长时间拿不到数据时提示用户而不是静默显示旧数据。
     */
    private fun recordFailure(context: Context) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val fails = prefs.getInt(KEY_SYNC_FAIL_COUNT, 0) + 1
            prefs.edit()
                .putInt(KEY_SYNC_FAIL_COUNT, fails)
                .putLong(KEY_LAST_FAIL_AT, System.currentTimeMillis())
                .apply()
        } catch (_: Exception) {}
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

    /**
     * 读取安装包真实 versionName，避免 UA 里的版本号与构建版本脱节。
     */
    private fun appVersion(context: Context): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
        } catch (_: Exception) {
            "unknown"
        }
    }

    private fun httpGet(urlStr: String, userAgent: String): String? {
        var conn: HttpURLConnection? = null
        try {
            val url = URL(urlStr)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 9000
            conn.readTimeout = 9000
            conn.setRequestProperty("User-Agent", userAgent)
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader(InputStreamReader(conn.inputStream)).use { reader ->
                    val sb = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        sb.append(line)
                    }
                    return sb.toString()
                }
            }
            return null
        } finally {
            conn?.disconnect()
        }
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
