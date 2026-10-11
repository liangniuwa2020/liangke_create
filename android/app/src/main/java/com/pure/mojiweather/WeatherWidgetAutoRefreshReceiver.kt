package com.pure.mojiweather

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WeatherWidgetAutoRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == WeatherWidgetSyncHelper.ACTION_AUTO_REFRESH_20MIN ||
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == Intent.ACTION_USER_PRESENT) {
            
            // 使用 goAsync() 延长广播接收器生命周期，保证系统休眠或切后台时异步网络请求能完整执行完毕
            val pendingResult = goAsync()
            val appContext = context.applicationContext

            WeatherWidgetSyncHelper.fetchWeatherInBackground(appContext, showFeedback = false) {
                // 确保执行完毕后再调度下一次 20 分钟闹钟，并结束 Broadcast 生命周期
                try {
                    WeatherWidgetSyncHelper.schedule20MinAutoRefresh(appContext)
                } finally {
                    try {
                        pendingResult.finish()
                    } catch (_: Exception) {}
                }
            }
        }
    }
}
