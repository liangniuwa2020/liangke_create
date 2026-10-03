# 墨迹天气纯净版 v1.1.7 发布日志

**发布版本**: v1.1.7 (versionCode: 9)  
**发布时间**: 2026-10-03  
**仓库地址**: `https://github.com/liangniuwa2020/liangke_create`

---

## 🌟 本次核心升级：4×3 与 4×2 桌面小部件「双排全量饱满矩阵」深度重构

根据用户反馈与美化需求：
1. **解决 4×3 小部件最下方空间过空问题**：
   - 彻底优化 4×3 大微件下半部分结构，将其分为均匀饱满的 **上下两排** 布局。
   - **第一排（逐时预报 · 间隔2小时）**：精选当前及未来间隔2小时的 7 个时间节点（如：现在、01:00、03:00、05:00、07:00、09:00、11:00），包含时间、专属天气矢量小图标、实时温度。
   - **第二排（未来天气 · 每天预报）**：展示未来连续 7 天天气矩阵（今天、明天、后天、周X、周X...），包含星期标签、高质感天气矢量小图标、最高/最低温差区间（如 12°/7°）。
   - 两排采用 `layout_weight="1"` 紧凑弹性网格容器，彻底消除底部多余空白，信息丰富充实、视觉层次分明。

2. **4×2 小部件同步优化为双排精美矩阵**：
   - 顶部精简横条：集成城市定位、实时 AQI 胶囊指示标签，右侧紧凑呈现当前温标与天气图标。
   - **第一排（2小时间隔逐时天气）**：6个时间段气象预测（时间 + 天气图标 + 实时温度）。
   - **第二排（未来连续6天逐日预报）**：6天日程气象预测（星期 + 天气图标 + 高低温差）。

3. **内置「墨迹桌面小部件工坊」实时高保真渲染更新**：
   - 软件内微件工坊弹窗同步升级 4×3 和 4×2 的全量双排预演排版，支持毛玻璃、白卡与深黑质感切换，直观呈现添加到手机桌面后的真实效果。

---

## 🛠️ 代码与资源变更清单
- `android/app/src/main/res/layout/widget_weather_4x3.xml`: 重写为双排 7 列矩阵网格 (`widget_h1~h7` 与 `widget_f1~f7`)。
- `android/app/src/main/java/com/pure/mojiweather/WeatherWidget4x3Provider.kt`: 绑定双排数据，第1排按 2 小时步长（0, 2, 4, 6, 8, 10, 12）抽样 hourly 数据，第2排绑定未来 7 天日预报。
- `android/app/src/main/res/layout/widget_weather_4x2.xml`: 重写为双排 6 列紧凑矩阵网格 (`widget_h1~h6` 与 `widget_f1~f6`)。
- `android/app/src/main/java/com/pure/mojiweather/WeatherWidget4x2Provider.kt`: 绑定双排 6 列数据。
- `src/components/WidgetCenterModal.js`: 同步更新 4×3 与 4×2 预览卡片视觉结构。
- `src/components/AboutCleanModal.js`: 更新版本说明与发布亮点至 v1.1.7。
- `package.json` & `android/app/build.gradle`: 升级至 versionName `1.1.7`，versionCode `9`。
- `MojiWeather_v1.1.7.apk` & `MojiWeather.apk`: 全新打包编译并在安卓模拟器中运行测试通过。

---

## 📱 安装包下载与使用
- 项目根目录下已编译生成最新安装包：`MojiWeather_v1.1.7.apk`（通用标准 release 版）。
- 欢迎在手机桌面长按空白处或通过应用内「微件工坊」指引添加全新的 4×3 与 4×2 双排桌面小部件！
