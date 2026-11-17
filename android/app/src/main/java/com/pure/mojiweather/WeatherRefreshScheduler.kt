package com.pure.mojiweather

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * 后台周期刷新的调度入口（WorkManager 侧）。
 *
 * 与 WeatherWidgetSyncHelper.scheduleAutoRefresh 的分工：
 *  - scheduleAutoRefresh 负责 AlarmManager 双通道（一次性精确 + 系统重复），
 *    优点是准点，缺点是在国产 ROM 上容易被「后台限制」拦掉；
 *  - 本类负责 WorkManager 周期任务，优点是进程被杀/重启后依然会被系统拉起，
 *    是「一定能跑」的兜底。两者同时存在，谁先跑起来谁干活，内部用 isRefreshing 门闩去重。
 *
 * 为什么周期不能低于 15 分钟：WorkManager 的 PeriodicWorkRequest 硬性下限就是
 * MIN_PERIODIC_INTERVAL_MILLIS = 15 分钟，传更小的值会被自动夹到 15 分钟。
 */
object WeatherRefreshScheduler {

    private const val TAG = "WeatherRefreshScheduler"

    /** 周期任务的唯一名字：用 KEEP 策略入队，重复调用不会堆叠出多个任务 */
    const val PERIODIC_WORK_NAME = "weather_periodic_refresh"

    /** 一次性补刷任务名 */
    const val ONESHOT_WORK_NAME = "weather_oneshot_refresh"

    /** 与 AlarmManager 侧保持一致的 30 分钟周期 */
    private const val REFRESH_INTERVAL_MINUTES = 30L

    /**
     * 注册 30 分钟周期后台任务。
     *
     * 使用 ExistingPeriodicWorkPolicy.KEEP：任务已存在时保持原样，
     * 这样每次 App 启动 / 每次闹钟触发都调用它也不会不断重置周期
     * （UPDATE 会让周期从当前时刻重新计时，等于永远等不到下一次）。
     */
    fun enqueuePeriodic(context: Context) {
        try {
            val constraints = Constraints.Builder()
                // 没网就别唤醒设备，等有网了系统再跑
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<WeatherRefreshWorker>(
                REFRESH_INTERVAL_MINUTES, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.d(TAG, "Enqueued periodic weather refresh every $REFRESH_INTERVAL_MINUTES min")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enqueue periodic work", e)
        }
    }

    /**
     * 立即补跑一次（亮屏、开机、用户点刷新、App 回前台都可以调）。
     * 用 REPLACE 保证「现在就要最新的」，不会被排队中的旧任务挡住。
     */
    fun enqueueImmediate(context: Context) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<WeatherRefreshWorker>()
                .setConstraints(constraints)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                ONESHOT_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
            Log.d(TAG, "Enqueued immediate weather refresh")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enqueue immediate work", e)
        }
    }

    /**
     * 取消全部后台任务（用户关闭自动刷新时使用）。
     */
    fun cancelAll(context: Context) {
        try {
            val wm = WorkManager.getInstance(context.applicationContext)
            wm.cancelUniqueWork(PERIODIC_WORK_NAME)
            wm.cancelUniqueWork(ONESHOT_WORK_NAME)
            Log.d(TAG, "Cancelled all weather refresh work")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel work", e)
        }
    }

    /**
     * 读回周期任务在系统里的真实状态（阻塞调用，必须在后台线程执行）。
     *
     * 为什么需要它：用户在 MyOS / MIUI 这类 ROM 上「睡一觉起来数据还是昨天的」时，
     * 光看界面无法区分两种情况 ——
     *   ①任务还在队列里，只是被系统压着没跑（ENQUEUED 且 nextScheduleTime 一直往后推）；
     *   ②任务已经被 ROM 连同 App 后台权限一起清掉了（列表为空）。
     * 这两种的处置方式完全不同，所以必须把 WorkInfo 状态端出来给用户看。
     *
     * @return 形如 "ENQUEUED|runs=0"，查询失败或任务不存在时返回 "MISSING" / "ERROR: ..."
     */
    fun describePeriodicState(context: Context): String {
        return try {
            val infos = WorkManager.getInstance(context.applicationContext)
                .getWorkInfosForUniqueWork(PERIODIC_WORK_NAME)
                .get(3, TimeUnit.SECONDS)

            if (infos.isNullOrEmpty()) {
                "MISSING"
            } else {
                val info = infos[0]
                // WorkInfo.State 是枚举且已全部覆盖，不需要 else 分支
                val state = when (info.state) {
                    WorkInfo.State.ENQUEUED -> "ENQUEUED"
                    WorkInfo.State.RUNNING -> "RUNNING"
                    WorkInfo.State.SUCCEEDED -> "SUCCEEDED"
                    WorkInfo.State.FAILED -> "FAILED"
                    WorkInfo.State.BLOCKED -> "BLOCKED"
                    WorkInfo.State.CANCELLED -> "CANCELLED"
                }
                "$state|runs=${info.runAttemptCount}"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to describe work state", e)
            "ERROR:${e.javaClass.simpleName}"
        }
    }
}
