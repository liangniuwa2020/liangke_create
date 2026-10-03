# 墨迹天气 · 纯净无广告版 (Pure Moji Weather App)

一款参考**墨迹天气**视觉与功能精髓、基于 **React Native + Expo** 开发的**极致纯净、零广告**天气移动应用。

---

## ✨ 核心特性与设计理念

传统商业天气软件（包括墨迹天气）充斥着大量开屏 5 秒广告、主页悬浮球、信息流短视频、低俗八卦资讯和电商推荐。本项目彻底剔除所有营销模块，专为追求清爽、高效、精准体验的用户打造：

1. **绝对 0 广告 & 0 资讯**：
   - 🚫 零开屏广告（真正打开即看）
   - 🚫 零弹窗、零悬浮球
   - 🚫 零信息流视频与营销新闻
   - 🚫 零隐私追踪 SDK，极速轻量省电
2. **沉浸式动态气象主屏 (Dynamic Atmosphere)**：
   - 动态拟真天空渐变背景（碧空蓝、星夜深蓝、层云灰青、雨夜暗青等）
   - 原生粒子动效：小雨/大雨雨丝飘落动画、冬季飘雪雪花动效、晴朗夜空微光星宿闪烁
3. **墨迹招牌：分钟级短时降水出行横幅**：
   - 自动检测当前与未来 2 小时降水趋势（如：“未来两小时无降雨，蓝天开朗，适合出行”或“当前正在降雨，请带好雨具”）
4. **24小时逐小时高精度预报**：
   - 横向流畅滑动查看未来 24 小时气温、天气图标、降水概率百分比与风速
5. **7~15天超长趋势预报**：
   - 包含多日天气图标、阴晴状况、降雨概率，独创**高低温相对区间渐变温度条**，温差变化一目了然
6. **空气质量 (AQI) 专属监测报告卡**：
   - US-AQI / 国标空气质量等级徽章（优/良/轻度/中度/重度/严重）
   - 六大核心环境污染物监测数据网格：**PM2.5、PM10、O₃、NO₂、SO₂、CO**
   - 实时健康与户外运动防护建议
7. **墨迹经典生活指数 (Living Indices)**：
   - 完整复刻 8 大日常指数：**穿衣、紫外线、感冒、洗车、运动、雨伞、晾晒、舒适度**
   - 点击任一指数卡片可展开详细出行与防寒防晒建议弹窗
8. **深度气象指标网格**：
   - 包含相对湿度、蒲福风力风向、海平面气压、紫外线等级、日出与日落精准时间
9. **全球与全国城市管理 & 实时检索**：
   - 支持通过 Open-Meteo Geocoding 实时搜索全球任何城市（支持中文如“北京”、“成都”、“深圳”或英文拼音）
   - 预设中国 10 大热门城市快捷磁贴一键切换
   - 本地持久化保存收藏城市列表，支持随时删除与增添
10. **多端开箱即用**：
    - 支持 Android 原生、iOS 原生（通过 Expo Go 扫码即开），同时完美兼容 Web 网页端与移动端浏览器

---

## 🛠️ 技术架构

- **跨平台框架**：React Native (v0.86) + Expo SDK 57
- **气象与地理数据源**：
  - [Open-Meteo Forecast API](https://open-meteo.com/)（全球气象模型，免 API Key，开箱即用）
  - [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)（高精度大气质量传感器网络）
  - [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)（全球地理编码查询）
- **持久化存储**：`@react-native-async-storage/async-storage`
- **渐变渲染与动效**：`expo-linear-gradient` + React Native Animated 原生粒子动画
- **图标库**：`@expo/vector-icons` (Ionicons)

---

## 🚀 快速上手与运行

项目位于本地路径：
```bash
C:\Users\liangke\.gemini\antigravity\scratch\moji-weather-app
```

### 1. 启动移动端开发服务器 (Expo)
进入项目目录后执行：
```bash
cd C:\Users\liangke\.gemini\antigravity\scratch\moji-weather-app
npm start
```
- 控制台将展示一个交互式菜单及 **二维码 (QR Code)**。
- **真机调试体验**：
  - 手机（Android 或 iPhone）在应用商店下载并打开 **Expo Go**。
  - 用 Expo Go 扫描终端里的二维码，即可在手机上以原生 App 效果流畅体验本软件！

### 2. 在电脑或手机浏览器中直接预览 (Web)
```bash
npm run web
```
将在本地自动启动 Web 服务并打开浏览器（如 `http://localhost:8081`）。界面具备完美的响应式移动端视口适配。

### 3. 打包导出静态 Web 站点
```bash
npx expo export --platform web --output-dir dist
```
打包产物位于 `dist/` 目录，可直接部署到任何静态服务器或托管平台（GitHub Pages、Vercel、Cloudflare Pages 等）。

### 4. 打包为 Android 原生 APK
如果需要打包独立的 Android 安装包：
```bash
npx eas-cli build -p android --profile preview
```

---

## 📱 核心目录结构

```
moji-weather-app/
├── App.js                         # 应用主入口，负责整体状态流、下拉刷新与页面编排
├── app.json                       # Expo 与移动端原生配置文件
├── package.json                   # 项目依赖与运行脚本
├── dist/                          # 已编译就绪的生产环境 Web / PWA 产物
└── src/
    ├── services/
    │   └── weatherService.js      # Open-Meteo 气象、AQI、地名编码接口与生活指数算法
    └── components/
        ├── WeatherBackground.js   # 拟真天空渐变与雨滴/飘雪/星光粒子特效
        ├── HeaderBar.js           # 顶部城市状态、定位切换与无广告徽章
        ├── CurrentWeatherCard.js  # 核心大字温度、天气状况、短时降水出行横幅
        ├── HourlyForecastCard.js  # 24小时逐小时预报与降雨概率
        ├── DailyForecastCard.js   # 7~15天趋势预报与高低温可视化色带
        ├── AirQualityCard.js      # 空气质量 AQI 刻度表与 6 大污染物指标
        ├── LivingIndicesCard.js   # 墨迹特色 8 大生活指数与详情弹窗
        ├── WeatherDetailsGrid.js  # 深度传感器指标网格（风力/气压/湿度/日出日落）
        ├── CityManageModal.js     # 城市搜索、热门城市与收藏管理弹窗
        └── AboutCleanModal.js     # 纯净版设计理念与版本弹窗
```
