# 墨迹天气纯净版 (Moji Weather Pure) - 更新日志

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
