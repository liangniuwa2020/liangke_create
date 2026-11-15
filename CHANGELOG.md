# 无广告天气 (No Ad Weather) - 更新日志

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
