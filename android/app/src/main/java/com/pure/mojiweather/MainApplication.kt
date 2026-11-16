package com.pure.mojiweather

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  /** 亮屏/解锁监听的动态注册句柄，避免重复注册 */
  private var screenOnReceiver: BroadcastReceiver? = null

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(WeatherWidgetPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    // 应用启动时校准桌面小部件的 30 分钟后台定时自动刷新调度
    // （一次性精确闹钟 + 系统级重复兜底闹钟，进程被杀也不会停止）
    WeatherWidgetSyncHelper.scheduleAutoRefresh(this)

    registerScreenOnReceiver()
  }

  /**
   * 动态注册亮屏 / 解锁监听。
   *
   * Android 8.0 起，隐式广播（ACTION_SCREEN_ON、ACTION_USER_PRESENT 等）**无法**通过
   * AndroidManifest 静态注册收到，只能在代码里动态注册。这就是为什么清单里虽然写了
   * USER_PRESENT 过滤器却依然「解锁后不刷新」的原因之一。
   *
   * 注册后每次点亮屏幕都会立刻走一次原生后台抓取，配合 30 分钟闹钟，
   * 用户半夜关屏、早上睁开眼看手机，数据已经是新的。
   */
  private fun registerScreenOnReceiver() {
    if (screenOnReceiver != null) return
    try {
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          val action = intent.action ?: return
          if (action == Intent.ACTION_SCREEN_ON || action == Intent.ACTION_USER_PRESENT) {
            Log.d("WeatherWidget", "Screen on / user present -> trigger background refresh")
            // 重新校准闹钟，防止长时间息屏期间 Doze 把闹钟推迟太多
            WeatherWidgetSyncHelper.scheduleAutoRefresh(context)
            WeatherWidgetSyncHelper.fetchWeatherInBackground(context, showFeedback = false)
          }
        }
      }
      val filter = IntentFilter().apply {
        addAction(Intent.ACTION_SCREEN_ON)
        addAction(Intent.ACTION_USER_PRESENT)
      }
      // Android 13 (API 33) 起，动态注册需要显式声明导出性；
      // Android 14 起对非系统广播强制要求，不声明会直接抛 SecurityException。
      // 亮屏/解锁属于系统广播，这里声明 NOT_EXPORTED：只有系统能投递，第三方 App 无法伪造。
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        registerReceiver(receiver, filter)
      }
      screenOnReceiver = receiver
    } catch (e: Exception) {
      Log.e("WeatherWidget", "Failed to register screen-on receiver", e)
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
