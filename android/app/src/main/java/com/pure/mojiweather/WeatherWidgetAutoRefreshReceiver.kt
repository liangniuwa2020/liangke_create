package com.pure.mojiweather

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 30 分钟后台自动刷新的广播接收器。
 *
 * 触发来源：
 *  - ACTION_AUTO_REFRESH_30MIN —— 由 WeatherWidgetSyncHelper 的一次性精确闹钟与系统重复兜底闹钟投递
 *  - BOOT_COMPLETED / MY_PACKAGE_REPLACED —— 开机或升级后立即补一次并重建闹钟链
 *  - USER_PRESENT / SCREEN_ON —— 用户解锁点亮屏幕时补一次（系统可能不投递 manifest 注册的
 *    隐式广播，MainApplication 里还有一份动态注册的监听做兜底）
 *
 * 关键点：**先排下一次闹钟，再发起网络请求**。历史 bug（v1.2.5 修复）是等抓取结束后的
 * finally 回调里才 scheduleAutoRefresh，一旦某次抓取过程中进程被系统杀掉，回调永远不执行，
 * 整条闹钟链就永久断开 —— 用户看到的现象就是「关屏过夜后再也不刷新」。
 */
class WeatherWidgetAutoRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == WeatherWidgetSyncHelper.ACTION_AUTO_REFRESH_30MIN ||
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == Intent.ACTION_USER_PRESENT ||
            action == Intent.ACTION_SCREEN_ON) {

            val appContext = context.applicationContext

            // 1) 先把下一次闹钟钉死，保证链路自愈，不依赖本次抓取是否成功
            WeatherWidgetSyncHelper.scheduleAutoRefresh(appContext)

            // 2) 使用 goAsync() 延长广播接收器生命周期，
            //    保证系统休眠或切后台时异步网络请求能完整执行完毕
            val pendingResult = goAsync()
            WeatherWidgetSyncHelper.fetchWeatherInBackground(appContext, showFeedback = false) {
                try {
                    // 抓取结束后再校准一次，把漂移拉回来
                    WeatherWidgetSyncHelper.scheduleAutoRefresh(appContext)
                } finally {
                    try {
                        pendingResult.finish()
                    } catch (_: Exception) {}
                }
            }
        }
    }
}
