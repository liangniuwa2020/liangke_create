package com.pure.mojiweather

import android.content.Context
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters

/**
 * 后台周期刷新的 WorkManager Worker。
 *
 * 为什么不用 BroadcastReceiver + AlarmManager 就够了：
 *  - AlarmManager 的一次性精确闹钟（setExactAndAllowWhileIdle）在国产 ROM 上会被
 *    「自启动管理 / 后台运行限制 / 省电策略」直接拦掉，用户睡一觉起来，闹钟一次都没投递；
 *  - setInexactRepeating 在 Doze 深度休眠里可能被推迟数小时，跨夜 8 小时只能触发一两次；
 *  - BroadcastReceiver 的 goAsync() 只有约 10 秒预算，网络慢时抓取会被系统直接砍断。
 *
 * WorkManager 由系统 JobScheduler 托管：进程被杀、设备重启后任务仍然保留，
 * 并且会遵守 Doze 的维护窗口在合适的时机把 Worker 拉起来，是目前官方唯一推荐的
 * 「可靠周期后台任务」方案。它不能保证 30 分钟分秒不差（系统会做批量合并），
 * 但能保证「一定会执行」，这正是用户要的「睡醒后有新数据」。
 *
 * 失败时返回 Result.retry()，WorkManager 会用指数退避（初始 10 分钟）重试，
 * 避免弱网环境下每次都白跑一遍。
 */
class WeatherRefreshWorker(
    appContext: Context,
    params: WorkerParameters
) : Worker(appContext, params) {

    override fun doWork(): Result {
        val context = applicationContext
        return try {
            Log.d(TAG, "WorkManager periodic refresh started")
            val ok = WeatherWidgetSyncHelper.performSync(context, showFeedback = false)
            if (ok) {
                // 成功后顺手校准一次闹钟链，让前台/桌面小部件两侧的时间戳保持一致
                WeatherWidgetSyncHelper.scheduleAutoRefresh(context)
                Log.d(TAG, "WorkManager periodic refresh succeeded")
                Result.success()
            } else {
                Log.w(TAG, "WorkManager periodic refresh failed, will retry with backoff")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "WorkManager periodic refresh threw", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "WeatherRefreshWorker"
    }
}
