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
     * 供 JS 读取同步健康度：最近一次成功时间、连续失败次数、最近一次失败时间、缓存城市名。
     *
     * 为什么要单独暴露：用户「睡一觉起来看到昨天的数据」时，界面必须能说清是
     * 「一直没刷新成功」还是「刷新了但没拿到新数据」。只有把失败计数和失败时间
     * 端上来，才能判断是网络问题、权限问题还是 ROM 把后台任务杀了。
     */
    @ReactMethod
    fun readSyncStatus(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(WeatherWidgetSyncHelper.PREFS_NAME, Context.MODE_PRIVATE)
            val result = Arguments.createMap().apply {
                putDouble("lastSyncAt", prefs.getLong(WeatherWidgetSyncHelper.KEY_LAST_SYNC_AT, 0L).toDouble())
                putInt("failCount", prefs.getInt(WeatherWidgetSyncHelper.KEY_SYNC_FAIL_COUNT, 0))
                putDouble("lastFailAt", prefs.getLong(WeatherWidgetSyncHelper.KEY_LAST_FAIL_AT, 0L).toDouble())
                putString("city", prefs.getString(WeatherWidgetSyncHelper.KEY_CITY_NAME, null))
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("E_SYNC_STATUS", e)
        }
    }

    /**
     * 供 JS 手动把 WorkManager 周期任务重新登记一遍。
     * 部分 ROM 清理后台后会把 JobScheduler 里的任务一并删掉，
     * 用户在设置里把 App 加入白名单后点一下即可立即恢复。
     */
    @ReactMethod
    fun ensureBackgroundScheduler(promise: Promise) {
        try {
            WeatherRefreshScheduler.enqueuePeriodic(reactContext)
            WeatherRefreshScheduler.enqueueImmediate(reactContext)
            WeatherWidgetSyncHelper.scheduleAutoRefresh(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_SCHEDULER", e)
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

    /**
     * 后台保活体检：一次性把排查「过夜不刷新」需要的全部事实端出来。
     *
     * 为什么要这么细：MyOS / MIUI 这类 ROM 上，用户看到「数据还是昨天的」时，
     * 可能是四个完全不同的原因，处置办法也完全不同 ——
     *   ①WorkManager 周期任务被 ROM 删了（workState = MISSING）→ 点「立即恢复」重登记；
     *   ②任务还在但一直被压着没跑（workState = ENQUEUED 且 lastSyncAt 很旧）→ 需要加电池白名单；
     *   ③系统压根不允许精确闹钟（exactAlarmAllowed = false）→ 只能在设置里手动开；
     *   ④任务跑了但网络全失败（failCount 一直在涨）→ 查网络/查是否被流量限制。
     * 把这些都显示在界面上，用户不用连电脑也能自己判断。
     */
    @ReactMethod
    fun readBackgroundDiagnostics(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(WeatherWidgetSyncHelper.PREFS_NAME, Context.MODE_PRIVATE)
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            val am = reactContext.getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager

            val exactAlarmAllowed = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                am?.canScheduleExactAlarms() ?: false
            } else {
                true
            }

            val result = Arguments.createMap().apply {
                putString("workState", WeatherRefreshScheduler.describePeriodicState(reactContext))
                putBoolean("batteryOptimizationIgnored", pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false)
                putBoolean("exactAlarmAllowed", exactAlarmAllowed)
                putDouble("lastSyncAt", prefs.getLong(WeatherWidgetSyncHelper.KEY_LAST_SYNC_AT, 0L).toDouble())
                putInt("failCount", prefs.getInt(WeatherWidgetSyncHelper.KEY_SYNC_FAIL_COUNT, 0))
                putDouble("lastFailAt", prefs.getLong(WeatherWidgetSyncHelper.KEY_LAST_FAIL_AT, 0L).toDouble())
                putString("manufacturer", android.os.Build.MANUFACTURER ?: "")
                putString("brand", android.os.Build.BRAND ?: "")
                putString("model", android.os.Build.MODEL ?: "")
                putInt("sdkInt", android.os.Build.VERSION.SDK_INT)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("E_DIAGNOSTICS", e)
        }
    }

    /**
     * 跳到系统的「电池优化 / 后台耗电管理」页面。
     *
     * 不用 ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS（那条要申请敏感权限、上架审核容易被拒），
     * 只做「把用户送到能自己点的地方」，落在系统自带的设置页，安全且无权限要求。
     */
    @ReactMethod
    fun openBatterySettings(promise: Promise) {
        try {
            val candidates = listOf(
                android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
                android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            )
            var opened = false
            for (action in candidates) {
                try {
                    val intent = android.content.Intent(action).apply {
                        if (action == android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS) {
                            data = android.net.Uri.parse("package:${reactContext.packageName}")
                        }
                        addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                    opened = true
                    break
                } catch (_: Exception) {
                    // 换下一个候选
                }
            }
            promise.resolve(opened)
        } catch (e: Exception) {
            promise.reject("E_OPEN_SETTINGS", e)
        }
    }
}
