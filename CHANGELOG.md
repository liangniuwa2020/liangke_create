# 墨迹天气纯净版 (Moji Weather Pure) - 更新日志

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
