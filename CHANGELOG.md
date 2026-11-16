# 无广告天气 (No Ad Weather) - 更新日志

## [v1.2.6] - 2026-11-16

本轮修复用户实测反馈的「不手动点击刷新，数据就一直不动（停在 16 点，实际已 22 点）」，并按要求在界面顶部直接显示当前版本号。

### ⏱ 自动刷新彻底失效（核心 bug）

用户反馈：「我试过了，不点击刷新，不会自动刷新，现在还是 16 点刷新的。」

**根因：计时挂在了定时器对象上，而不是绝对时间上。**

旧实现是 `setInterval(handleRefresh, 30 分钟)`，而 `handleRefresh` 是 `useCallback`，依赖 `[autoDetectLocation, loadWeather, setRefreshing]`。这三个依赖任意一个身份变化（例如切城市、刷新状态翻转、定位结果更新），React 就会执行提前返回的 cleanup → `clearInterval` → 重新 `setInterval` —— **30 分钟的计时被清零重新数**。用户在城市间切换几次、或定位触发几次 `setState`，就永远等不到那一次 30 分钟到期。叠加 Android 息屏冻结 JS 定时器，表现就是「不点刷新就永远停在几小时前」。

**修复：看门狗轮询 + 绝对时间戳判定。**

- 新增 `src/services/refreshPolicy.js` 的 `AUTO_REFRESH_WATCHDOG_MS = 60 * 1000`（1 分钟）。
- 新增纯函数 `shouldRunWatchdogTick({ lastRefreshAt, now, intervalMs, isRefreshing })`：正在刷新则跳过；否则交给 `shouldRefreshOnForeground()` 判定，只做一次 `Date.now() - lastRefreshAt` 的减法。
- `App.js` 的自动刷新 effect 改成「每 60 秒醒一次 → 算一次时间差 → 差值 ≥30 分钟才真正联网」，并且：
  - 用 `handleRefreshRef` 中转刷新函数（`useEffect` 每次 render 更新 ref），于是定时器 effect 的**依赖数组可以是 `[]`**，永不因身份变化被销毁重建；
  - 启动时**先自检一次**（`tick()` 在 `setInterval` 之前），不必等满第一个 60 秒；
  - 每一拍都刷新「下次刷新还有多久」文案，让用户直接看到定时器还活着。

### 🏷 界面显示当前版本（用户要求）

- 新增 `src/services/appInfo.js`：`getAppVersion()` 优先读原生 `PackageInfo.versionName`（也就是当前 APK 真实版本），读不到才退回打包期常量 `FALLBACK_VERSION_NAME`；`formatVersionLabel()` 统一成 `v1.2.6` 形式，异常时显示 `v—`。
- `WeatherWidgetModule.kt` 新增 `@ReactMethod fun getAppVersion(promise: Promise)`，读 `PackageInfo`（`versionCode` 走 `longVersionCode`，兼容 API < 28）。
- `HeaderBar` 顶部新增一行元信息：**版本号 + 下次自动刷新倒计时**（如 `v1.2.6 · 下次刷新 12 分钟后`），用户不必再进弹窗才能看到版本。
- `AboutCleanModal` 的版本号不再硬编码 `v1.2.5`：改为接收 `versionLabel`，缺失时回退到 `FALLBACK_VERSION_NAME`。**从此升级版本只需改三处版本号文件，界面自动跟着变**。

### 🧪 测试

- `scripts/verify_refresh.js` 从 68 项扩到 **92 项**：
  - 第 1 节定时器断言整体重写：不再要求 `setInterval(..., AUTO_REFRESH_INTERVAL_MS)`，改为断言第二参是 `AUTO_REFRESH_WATCHDOG_MS`、且看门狗周期 `0 < ms < 1800000` 并与刷新周期严格区分；断言依赖数组为 `[]`；断言 `handleRefreshRef.current = handleRefresh`、`shouldRunWatchdogTick(`、`Date.now() - lastRefreshTimestampRef.current` 三处核心接线。
  - 新增第 10 节「看门狗自动刷新与版本号展示」14 项：时间戳判据、ref 中转、轮询周期、纯函数调用、倒计时提示、启动自检、`getAppVersion` 原生方法、`PackageInfo`/`longVersionCode` 读取、`appInfo.js` 两个导出、`App.js` 读版本写入 state、传给 HeaderBar/AboutCleanModal、HeaderBar 渲染标签。
  - 第 6 节版本一致性断言改为「禁止组件里写死 `版本信息：vX.Y.Z`」，改为断言 `appInfo.js` 的 `FALLBACK_VERSION_NAME` 与 `package.json` 一致。
- `scripts/test_refresh_policy.mjs` 从 113 项扩到 **138 项**：新增 `[5e]` 看门狗 14 项（周期范围、正在刷新不重复触发、过期/未过期/从未刷新、**多次 tick 不累积计时**、六种倒计时文案含系统时间倒退）与 `[5f]` 版本号 11 项（`appInfo` 导出、兜底版本号与 `package.json` 一致、优先读原生、`App.js` 接线、看门狗依赖数组为空、`handleRefreshRef` 中转）。
- `scripts/test_app_smoke.mjs` 从 10 项扩到 **16 项**：新增 `[5]` 真实渲染 `HeaderBar` —— 断言版本号与倒计时出现在 DOM、更新时间仍在、未刷新时不显示「同步中...」、版本号缺失时显示 `v—` 占位符而非 `undefined`。

### 🔢 版本

- `package.json` / `app.json` / `android/app/build.gradle` 统一升到 **1.2.6 / versionCode 15**；`appInfo.js` 的 `FALLBACK_VERSION_NAME` 同步为 `1.2.6`。

## [v1.2.5] - 2026-11-16

本轮修复「关屏以后不自动刷新，睡一夜起来还是昨天的数据」的问题，并补齐一整套可自动化的刷新链路验证。

### 😴 关屏 / 后台 / 过夜刷新（核心）

用户反馈：「关屏以后，不会自动刷新数据，睡觉以后，起来时间和数据还是昨天的。」

**三条独立失效链路，逐一修掉：**

1. **JS 定时器在息屏时根本不跑**（根因）
   - 屏幕熄灭后 JS 引擎被系统冻结，App 内的 `setInterval` 不会执行 —— 也就是说用 App 内定时器做「30 分钟刷新」这条路，锁屏后必然失效。
   - 现状不依赖它：原生侧独立承担周期抓取，JS 定时器只负责「App 亮屏在使用时」的补充刷新。

2. **原生闹钟是「一次性链式调度」，断一次就永久停摆**
   - 旧实现只用 `setExactAndAllowWhileIdle` 排下一次闹钟，而且**要等抓取完成后的 finally 回调里才排**。进程被杀、抓取中途被回收、或 Android 12+ 无精确闹钟权限，链条就断，从此再不刷新。
   - 修复：`scheduleAutoRefresh()` 拆成两路 —— `scheduleExactOnce()`（一次性精确闹钟，≥30 分钟）+ `scheduleRepeatingBackup()`（`setInexactRepeating` 系统级重复闹钟，独立 `BACKUP_REQUEST_CODE = 10031`，不受单次失败影响，进程被杀也能自愈）。
   - `WeatherWidgetAutoRefreshReceiver` 改为**先排下次闹钟、再发起网络请求**，抓取途中被回收也不影响下一次。

3. **原生抓到了新数据，但 App 界面拿不到**
   - 旧实现后台抓取只写入 `SharedPreferences` 并刷新桌面小部件，React state 完全不知道；回到 App 仍显示旧数据。
   - 修复：新增 `KEY_LAST_SYNC_AT` 记录同步时间戳；`WeatherWidgetModule` 新增 `readCachedWeather()` / `refreshInBackground()` 两个 `@ReactMethod`；App 启动与回前台时先 `hydrateFromCache()` 把原生缓存补水到界面。

**配套增强：**
- `MainApplication` 动态注册 `ACTION_SCREEN_ON` + `ACTION_USER_PRESENT`（Android 8+ 收不到 manifest 静态注册的隐式广播），亮屏即触发一次调度 + 抓取。
- `WeatherWidgetAutoRefreshReceiver` 增加 `ACTION_LOCKED_BOOT_COMPLETED`（直接启动，免解锁即可恢复闹钟）。
- App 回前台不再只看 30 分钟阈值：新增 `src/services/refreshPolicy.js` 的 `shouldRefreshOnForeground()`，时间戳无效、为 0、系统时间被改到过去（elapsed < 0）一律强制刷新。
- 新增 `STORAGE_LAST_WEATHER_KEY` 完整快照持久化：冷启动弱网时先显示上次的完整 30 天数据，不再白屏等待。
- 缓存合并策略：`nativePayloadToWeather()` 用缓存覆盖当前温度/天气/AQI，但**保留**已有的 30 天预报与生活指数 —— 绝不把 30 天降级成原生缓存里的 7 天。
- 新增跨夜保护 `isDailyCoveringToday()`：原生后台可能 5 分钟前刚刷过缓存（时间戳很新），但逐日列表还是昨晚落下的那份，首行会挂着昨天的日期。现在只要首日不是今天，回前台就强制联网重拉，不再出现「时间新、日期旧」的错位。
- 前台恢复判定收敛为单一纯函数 `decideForegroundRefresh()`：一次返回「时间是否过期 / 列表是否跨夜 / 该不该刷 / 原因」，App 只按 `decision.shouldRefresh` 分支，避免两条判据在多处各写一份而走偏。
- `MainApplication` 的动态注册补上 Android 13+ 必需的 `Context.RECEIVER_NOT_EXPORTED`，避免 Android 14 上直接抛 SecurityException 导致亮屏刷新整条链路失效。

### 🧪 测试

- `scripts/verify_refresh.js` 从 46 项扩到 **68 项**，新增第 9 节「关屏与后台刷新可靠性」22 项断言（重复兜底闹钟、精确/兜底拆分、Receiver 调度顺序、亮屏广播覆盖、动态注册、Android 13+ 导出性声明、同步时间戳落盘、两个新 `@ReactMethod`、refreshPolicy 三个导出、跨夜列表检测、App 补水接线）。
- 新增 `scripts/test_refresh_policy.mjs`（`npm run test:policy`）：**113 项断言**，覆盖时间戳异常（0/null/NaN/负数/未来值）、边界（29:59 不刷 / 30:00 刷）、整夜 9 小时场景、系统时间倒退、缓存解析的 12 种脏数据、跨夜列表判定（昨天 / 去年同月同日 / 跨年夜 / 无日期结构）、`decideForegroundRefresh` 的六种合并场景（缓存 4 分钟但列表停在昨天、时间戳在未来等）、以及「合并后仍是 30 天不被降级」。
- 新增 `scripts/test_overnight_refresh.mjs`（`npm run test:overnight`）：**33 项断言**，用「23:00 最后完整刷新 → 整夜 16 次原生后台刷新 → 07:55 亮屏补刷 → 08:00 睁眼」的真实时间线，把回前台的三步（读原生缓存 → 与完整快照合并上屏 → 判断是否需联网重拉）跑成真实函数调用，并核对原生侧三个必要产物（重复兜底闹钟、同步时间戳、缓存回读接口）。这条直接复现并回归了用户反馈的「睡一觉起来还是昨天的数据」。
- 新增 `npm run test:refresh` = `verify_refresh` + `test:policy` + `test:overnight` 一条命令跑完刷新链路。

### 🔖 版本
- versionCode 13 → 14，versionName 1.2.4 → 1.2.5。

## [v1.2.4] - 2026-11-15

本轮修复「7-15 天预报实际只有 6-7 天」的问题，并把逐日预报扩展到 30 天。

### 📅 逐日预报天数（核心）
- **根因**：`weatherService.js` 的 Open-Meteo forecast 请求没有传 `forecast_days`，该接口默认只返回 7 天，所以标题写着「7-15天」，实际只有 6-7 行数据。
- **15 天**：forecast 请求显式传 `forecast_days=16`（含今天即「今天 + 未来 15 天」）。实测该端点硬上限为 16 天，传 17 及以上会直接 HTTP 400。
- **30 天**：新增 Open-Meteo Seasonal Forecast 端点 `seasonal-api.open-meteo.com/v1/seasonal`，补齐第 17-30 天。
  - 该端点不提供 `precipitation_probability_max` 与 `uv_index_max`，因此降水概率由 `precipitation_sum` 反推，紫外线按「正午太阳高度角 + 云量折减」估算（不能只看天气代码，否则漠河 12 月会算出 UV7 这种物理不可能值）。
  - seasonal 请求失败时静默降级为只显示 16 天，不影响主天气数据。
- 两个端点按日期合并：用 `seenDates` 去重、按 `dailyList.length` 连续编号，保证「今天/明天/后天」跨端点不错位。

### 🎨 界面
- `DailyForecastCard` 标题由写死的「7-15天趋势预报」改为动态 `{daily.length}天天气预报`。
- 新增两枚摘要 chip：「近 16 天精准预报」/「后 14 天趋势」。
- 精准段与趋势段之间插入分隔提示「以下为季节趋势预报（置信度较低，仅供参考）」。
- 每条数据带 `isExtended` 标记，详情弹窗的 30 天横滑切换全部可用。

### 🧪 新增功能测试（本次交付的关键证据）
- `scripts/test_forecast_days.mjs`（`npm run test:forecast`）：真实请求 Open-Meteo，南昌/北京/漠河/三亚四地共 **110 项断言** —— 30 条数据、16+14 分段、日期逐日连续无重复、温度/降水概率/紫外线/日出日落有效、降水类天气与降水概率自洽、前 16 天与官方 forecast 及后 14 天与官方 seasonal 逐日数值交叉比对、UV 纬度合理性、以及 current/today/hourly/aqi/livingIndices 未被破坏。
- `scripts/test_forecast_ui.mjs`（`npm run test:forecast:ui`）：用 `react-dom/server` 真实渲染组件，**30 项断言** —— 30 行日期全部进入 DOM、15 天数据渲染 15 行且无趋势提示、空数据/单日不崩、30 天逐天在详情弹窗都能正确展示。
- 配套 `scripts/render-loader.mjs` + `scripts/stubs/`（react-native / safe-area / linear-gradient / vector-icons / async-storage 桩），让 RN 组件可以在 Node 里被真实渲染。

### 🔖 版本
- versionCode 12 → 13，versionName 1.2.3 → 1.2.4。

## [v1.2.3] - 2026-11-15

本轮为「全面体检 + 修复」版本，针对代码审计发现的 24 项问题逐条处理。

### 🔐 发布签名（P0）
- **release 不再使用 debug 证书**：新增 `signingConfigs.release`，从 `android/keystore.properties` 读取正式 keystore；缺少该文件时 `assembleRelease` 直接抛 `GradleException` 中止。
- 新增 `android/keystore.properties.example` 模板与 README 生成流程（keytool 命令、口令字段、备份提醒）。
- 实测签名证书由 `CN=Android Debug` 变为 `CN=No Ad Weather, O=Pure Weather Studio`。

### 📦 体积与构建（P0）
- 开启 R8 代码混淆与资源裁剪（`enableMinifyInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds`），补齐 `proguard-rules.pro` 中 `com.pure.mojiweather.**` 与 `AppWidgetProvider` 的 keep 规则。
- ABI 从 4 套裁剪为 `arm64-v8a,armeabi-v7a`；模拟器改用 `-PreactNativeArchitectures=x86_64` 临时覆盖。
- Gradle 内存与并行度重配：`-Xmx2048m`、`parallel=true`、`workers.max=4`、`caching=true`；移除写死的 `org.gradle.java.home` 与调试残留 `EX_DEV_CLIENT_NETWORK_INSPECTOR`。
- **APK 体积：68.94 MB → 33.14 MB（降 52%）**，`classes.dex` 由 2 个合并为 1 个。

### 🐞 网络与刷新可靠性（P0/P1）
- `weatherService.js` 三处裸 `fetch` 全部改为 `fetchWithTimeout`（天气 12s、AQI 8s、地名 8s），弱网不再无限 loading。
- 修复下拉刷新在 GPS 位置变化分支提前收起指示器的问题：统一走 `loadWeather` 后再 `setRefreshing(false)`。
- 首启城市列表不再出现两条「南昌」（`NANCHANG_DEFAULT` 与 `DEFAULT_CITIES[0]` 去重）。
- `LocationModule` 增加坐标时效校验：缓存位置超过 10 分钟即丢弃，改用实时定位；定位超时 / 定位服务关闭时在 JS 侧给出明确告警。

### 🎨 小部件与文案一致性（P1）
- AQI 分档在 Kotlin 侧由 5 档补齐为与 JS 一致的 6 档（含「严重污染」）。
- 新增 `formatUpdateTimeLabel()` 幂等格式化，彻底消除「刚刚更新 更新」双后缀。
- 三套小部件 `info.xml` 补充 `previewLayout`，系统选择器终于有预览图。
- 小部件工坊在天气数据未就绪时不再空白，改为展示皮肤预览 + 提示条。

### 🛡️ 权限与隐私（P1）
- 移除 4 个零引用权限：`SYSTEM_ALERT_WINDOW`、`VIBRATE`、`READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE`；并用 `tools:node="remove"` 阻止 `expo.modules.filesystem` 在清单合并阶段把它们注回。
- `allowBackup="false"`，新增 `data_extraction_rules.xml` 与 `backup_rules.xml`，城市与皮肤不再进云备份。
- `WeatherWidgetAutoRefreshReceiver` 改为 `exported="false"`，删除遗留的 `ACTION_AUTO_REFRESH_20MIN`，第三方 App 无法再伪造广播触发网络刷新。

### 🏷️ 品牌统一
- 应用名、三套小部件名、系统内 `app_name` 统一为「无广告天气」，`aapt2` 实测 APK label 已从「墨迹纯净天气」变为「无广告天气」。
- 清理源码、README、CHANGELOG 与界面文案中全部对标品牌表述。
- 新增「纯净承诺」入口：`AboutCleanModal` 此前没有任何打开路径。

### 🧹 工程卫生（P2）
- `.gitignore` 新增 `*.apk` / `*.aab` / `*.exe` / `keystore.properties` / `release.keystore` 规则。
- `.git` 历史重写：清除 21 个历史 APK/EXE 对象，仓库从 466.8 MB 降至 3.7 MB。
- `tsconfig.json`、`eslint.config.js`、`scripts/verify_refresh.js`、`scripts/` 等关键文件纳入版本管理。
- ESLint 收紧：`react-hooks/exhaustive-deps`、`react-hooks/rules-of-hooks` 改为 error，`no-unused-vars` 恢复为 error。
- 依赖对齐：补装 `expo-font` 直接依赖；`expo` 升至 ~57.0.33、`@expo/metro-runtime` 升至 ~57.0.18。

### ✅ 回归
- `npx tsc --noEmit`、`npx eslint .`、`node scripts/verify_refresh.js`（46 项）、`python test_widget_skin_verification.py --apk`（52 项）全部通过。

---
## [v1.1.9] - 2026-10-06
### ⏱️ 20 分钟全自动天气刷新体系
- **前后台双通道 20 分钟刷新**：
  - 前台每 20 分钟（1200秒）自动轮询拉取最新气象与空气质量，并在 App 切回前台时智能检测更新；
  - 原生 Android 接入 `AlarmManager` 20 分钟后台定时唤醒机制（`WeatherWidgetAutoRefreshReceiver`），App 退出或手机息屏也能自动静默同步。
- **全量小部件即时同步**：
  - 每次天气状态刷新后，自动重绘 4×3、4×2、4×1 全系列桌面小部件。
- **小部件独立点击更新（免返回主界面）**：
  - 优化刷新热区与「正在刷新...」即时视觉反馈；
  - 点击小部件上的更新按钮时，底层直接在后台发起气象请求并刷新小部件数据，**绝不跳转回 App 主界面**。

### 📦 安装包产物清单 (v1.1.9)
- Android 手机安装包：
  - [MojiWeather_v1.1.9.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.9.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.9.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.9.apk)

---

## [v1.1.4] - 2026-10-03
### 🛠️ 桌面小部件“无法加载”根因修复 (RemoteViews Crash Fix)
- **根除 RemoteViews XML 非法标签与属性导致微件加载失败的问题**：
  - 彻底将小部件布局文件中的非法 `<View>` 标签替换为安全 `@RemoteView` 容器 `<FrameLayout>`，解决安卓启动器解析抛出 `InflateException: Class not allowed to be inflated` 导致的灰屏/无法加载；
  - 将所有高版本专属 padding/margin 属性降级为全安卓版本通用的基础边距属性；
  - 升级图标动态绘制机制：在 Kotlin 底层通过 `Bitmap` 直接进行内存绘制传递，避免手机桌面 Launcher 对 VectorDrawable 矢量图解析异常。

### 📍 高精度 GPS / 网络自动定位与街道级识别 (High-Precision Geolocation)
- **软件启动自动定位**：
  - 打开 App 时自动调起 GPS 与网络高精度定位，实时精准识别用户所在城市（如默认精准定位南昌市）；
  - 引入高精度逆地理编码（Geocoder + Nominatim），定位粒度深度细化至“区县·街道/商圈/标志地标”（如“南昌·东湖区 阳明路” / “南昌·八一广场”）；
  - 下拉刷新自动重新扫描当前 GPS 定位与微气象；
  - 城市管理页提供显目的【GPS 智能精确定位】入口，一键重新定位并加入关注列表。

### 📦 安装包产物清单 (v1.1.4)
- Android 手机安装包：
  - [MojiWeather_v1.1.4.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.4.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.4.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.4.apk)
- Windows 电脑端安装运行包：
  - [MojiWeather_v1.1.4.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.4.exe)
  - [MojiWeather.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.exe)
  - [墨迹天气纯净版_v1.1.4.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.4.exe)

---

## [v1.1.3] - 2026-10-03
### 📱 原生 Android 桌面小部件全面落地 (Native App Widgets)
- **真机桌面长按即显 (System-level AppWidget)**：
  - 接入标准 Android `AppWidgetProvider` 与 `RemoteViews` 架构；
  - 在手机系统主屏幕空白处长按或双指捏合，点击【微件 / 小部件】即可直接找到【墨迹天气】添加到手机桌面！
- **全新 4×3 综合天气时钟旗舰大微件 (4x3 Comprehensive Widget)**：
  - **实时数字时钟与日期**：大字体系统实时走时钟表、星期几与城市地理定位；
  - **实时天气大看板**：大号实时温度、精细矢量天气图标、体感温度、当日高低温差区间；
  - **多维气象胶囊**：集成实时 AQI 空气质量评级徽章、风向风力与环境相对湿度；
  - **未来 3 天气象趋势**：底部直观显示明天、后天、大后天的天气图标与温差预测；
  - **一键点击交互**：点击时钟直接打开天气主页，点击刷新按钮立即静默同步最新天气。
- **经典 4×2 墨迹翻牌时钟微件 (4x2 Classic Widget)**：
  - 紧凑精致布局，左侧时间日期，右侧天气温标与空气质量胶囊。
- **全自动跨端数据桥接 (React Native <-> Native Android SharedPreferences)**：
  - App 每次更新气象数据时自动静默分发至桌面微件并触发即时刷新重绘。

### 📦 安装包产物清单 (v1.1.3)
- Android 手机安装包：
  - [MojiWeather_v1.1.3.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.3.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.3.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.3.apk)
- Windows 电脑端安装运行包：
  - [MojiWeather_v1.1.3.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.3.exe)
  - [MojiWeather.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.exe)
  - [墨迹天气纯净版_v1.1.3.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.3.exe)

---

## [v1.1.2] - 2026-10-03
### 🚀 启动崩溃排查与全架构兼容修复 (Critical Bugfix)
- **修复离线 JS Bundle 打包缺失导致的启动崩溃**：
  - 深度排查发现此前因打包内存限制导致 `assets/index.android.bundle` 未写入 APK，App 启动找不到 JS 核心而闪退；
  - 现已通过优化内存分配成功将 1.5MB 完整业务离线代码束与字体图标资源硬编译打包进 APK 的 `assets/` 目录，无需依赖任何网络服务即可秒开启动。
- **全架构原生库通用支持 (Universal ABI)**：
  - 此前仅打包了 `arm64-v8a`，在部分电脑模拟器（夜神、雷电等 x86/x86_64）或 32 位手机上缺少原生 `.so` 动态库导致闪退；
  - 现已开放全 CPU 架构集成（包含 `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`），全面兼容市面所有主流安卓真机与各品牌电脑模拟器！

### 📦 安装包产物清单 (v1.1.2)
- Android 手机安装包：
  - [MojiWeather_v1.1.2.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.2.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.2.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.2.apk)
- Windows 电脑端安装运行包：
  - [MojiWeather_v1.1.2.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.2.exe)
  - [MojiWeather.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.exe)
  - [墨迹天气纯净版_v1.1.2.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.2.exe)

---

## [v1.1.1] - 2026-10-03
### 🌟 视觉重构与防眩光抗白底专项修复
- **彻底杜绝纯白刺眼与无法看清问题**：
  - **天幕深邃沉浸重构**：重新精调所有天气的色系梯度（如晴天由浅白蓝重构为深邃湛蓝 `#075985` -> `#0284c7` -> `#0369a1`），绝不含有刺眼苍白色；
  - **多层底色防穿透兜底机制**：为 Android 窗口背景、启动屏 `splashscreen_background`、Web 容器、RN 根节点统一配置天蓝色底色兜底，杜绝任何白闪或渐变渲染丢失导致的白屏问题；
  - **全组件升级暗调高对比微光磨砂玻璃卡片**：
    - 主页 4x2 翻牌时钟部件、Weather Hero 看板、24 小时预报、7 天趋势、空气质量、生活指数等卡片全部升级为 `rgba(8, 16, 32, 0.65)` 深邃微光磨砂玻璃质感；
    - 配备柔和深色阴影与细致边框，白色字号与图标在任何天气背景下形成超强视觉反差，无论白天室外还是夜间均能一秒看清所有天气数据！

### 📦 安装包产物清单 (v1.1.1)
- Android 手机安装包：
  - [MojiWeather_v1.1.1.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.1.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.1.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.1.apk)
- Windows 电脑端安装运行包：
  - [MojiWeather_v1.1.1.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.1.exe)
  - [MojiWeather.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.exe)
  - [墨迹天气纯净版_v1.1.1.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.1.exe)

---

## [v1.1.0] - 2026-10-03
### 🌟 新增功能与体验革新
- **全天气动态高亮拟真背景**：
  - 晴天金色旋转日冕光晕与高透碧蓝天幕；
  - 阴天与多云流云平移动画；
  - 雨天高亮拟真垂直雨丝坠落；
  - 雪天多层次旋转飘雪粒子；
  - 雷暴天气随机脉冲雷闪电弧；
  - 雾霾天朦胧泛黄微尘视效；
  - 夜间皓月星空与星座微光。
- **墨迹经典 4x2 翻牌时钟天气小部件（集成主页）**：
  - 高对比度白底黑字拟物翻牌数字时钟，实时走秒；
  - 伴随阴历公历日期、实时天气图标、温度与实时空气质量指数（AQI）胶囊。
- **动态皮肤中心（Skin Theme Center）**：
  - 提供【跟随实时天气动态切换】开关；
  - 内置 6 套高定主题：墨迹经典蓝、极光夜空、翡翠竹林、落日余晖、赛博朋克、极简浅灰；
  - 支持即刻预览、一键换装并持久化保存在本地。
- **桌面小部件工坊（Widget Center）**：
  - 提供 4x2 翻牌时钟天气、4x1 简约栏、2x2 四宫格等多种桌面部件样式预览；
  - 支持毛玻璃（Glass）、高光纯白（White）、夜间极黑（Dark）三种材质实时切换；
  - 提供 Android 原生桌面添加指引。
- **高对比度 Weather Hero Billboard**：
  - 增大核心温度字号至 54px，天气图标扩大至 56px 配合发光外衬，文字添加抗背景阴影，点开软件瞬间无论何种背景均一目了然看清天气！

### 📦 安装包产物清单
- Android 手机安装包：
  - [MojiWeather_v1.1.0.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.0.apk)
  - [MojiWeather.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.apk)
  - [墨迹天气纯净版_v1.1.0.apk](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.0.apk)
- Windows 电脑端安装运行包：
  - [MojiWeather_v1.1.0.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather_v1.1.0.exe)
  - [MojiWeather.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/MojiWeather.exe)
  - [墨迹天气纯净版_v1.1.0.exe](file:///E:/Antigravity%20ex_project/moji-weather-app/墨迹天气纯净版_v1.1.0.exe)

---

## [v1.0.0] - 2026-10-03
### 初始版本发布
- 100% 纯净无广告架构，无任何开屏/弹窗/信息流广告；
- 接入 Open-Meteo 真实气象 API，支持全国各主要城市一键切换；
- 48 小时精细逐小时预报与 7 天趋势折线图；
- 墨迹经典 8 格生活指数卡片（穿衣、紫外线、感冒、洗车、运动、雨伞、晾晒、舒适度）；
- 支持多城市搜索管理、深色/浅色自适应、摄氏度/华氏度单位切换。
