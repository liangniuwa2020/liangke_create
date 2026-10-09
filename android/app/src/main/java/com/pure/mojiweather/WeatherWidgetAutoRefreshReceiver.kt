package com.pure.mojiweather

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WeatherWidgetAutoRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == WeatherWidgetSyncHelper.ACTION_AUTO_REFRESH_20MIN ||
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            
            // 后台静默执行 20 分钟天气同步，更新 SharedPreferences 并重绘所有小部件
            WeatherWidgetSyncHelper.fetchWeatherInBackground(context, showFeedback = false)
            // 重新调度下一次 20 分钟闹钟
            WeatherWidgetSyncHelper.schedule20MinAutoRefresh(context)
        }
    }
}
