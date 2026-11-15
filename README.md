# 无广告天气 (No Ad Weather)

一款基于 **React Native + Expo** 开发的**极致纯净、零广告**天气移动应用。

---

## ✨ 核心特性与设计理念

传统商业天气软件充斥着大量开屏 5 秒广告、主页悬浮球、信息流短视频、低俗八卦资讯和电商推荐。本项目彻底剔除所有营销模块，专为追求清爽、高效、精准体验的用户打造：

1. **绝对 0 广告 & 0 资讯**：
   - 🚫 零开屏广告（真正打开即看）
   - 🚫 零弹窗、零悬浮球
   - 🚫 零信息流视频与营销新闻
   - 🚫 零隐私追踪 SDK，极速轻量省电
2. **沉浸式动态气象主屏 (Dynamic Atmosphere)**：
   - 动态拟真天空渐变背景（碧空蓝、星夜深蓝、层云灰青、雨夜暗青等）
   - 原生粒子动效：小雨/大雨雨丝飘落动画、冬季飘雪雪花动效、晴朗夜空微光星宿闪烁
3. **分钟级短时降水出行横幅**：
   - 自动检测当前与未来 2 小时降水趋势（如：“未来两小时无降雨，蓝天开朗，适合出行”或“当前正在降雨，请带好雨具”）
4. **24小时逐小时高精度预报**：
   - 横向流畅滑动查看未来 24 小时气温、天气图标、降水概率百分比与风速
5. **30 天天气预报（16 天精准 + 14 天季节趋势）**：
   - 前 16 天取 Open-Meteo forecast 端点（该端点硬上限 16 天），逐日图标、阴晴状况、降雨概率、紫外线全部为实测值
   - 后 14 天取 Open-Meteo Seasonal 端点补齐到 30 天，界面用「以下为季节趋势预报」分隔标注置信度
   - 独创**高低温相对区间渐变温度条**，温差变化一目了然；点击任意一天查看完整详情并在 30 天之间横滑切换
6. **空气质量 (AQI) 专属监测报告卡**：
   - US-AQI / 国标空气质量等级徽章（优/良/轻度污染/中度污染/重度污染/严重污染），App 与桌面小部件使用同一套六档阈值
   - 六大核心环境污染物监测数据网格：**PM2.5、PM10、O₃、NO₂、SO₂、CO**
   - 实时健康与户外运动防护建议
7. **8 大生活指数 (Living Indices)**：
   - **穿衣、紫外线、感冒、洗车、运动、雨伞、晾晒、舒适度**
   - 点击任一指数卡片可展开详细出行与防寒防晒建议弹窗
8. **深度气象指标网格**：
   - 包含相对湿度、蒲福风力风向、海平面气压、紫外线等级、日出与日落精准时间
9. **全球与全国城市管理 & 实时检索**：
   - 支持通过 Open-Meteo Geocoding 实时搜索全球任何城市（支持中文如“北京”、“成都”、“深圳”或英文拼音）
   - 预设中国 10 大热门城市快捷磁贴一键切换
   - 本地持久化保存收藏城市列表，支持随时删除与增添
10. **三套桌面小部件 + 30 分钟自动刷新**：
    - 4×3 综合天气时钟（一周预报）、4×2 逐时天气、4×1 精简时钟天气
    - 支持深黑 / 极简白卡 / 通透毛玻璃三套皮肤，点击小部件图标即时换肤
    - App 内与桌面小部件统一 30 分钟自动刷新；Android 12+ 无精确闹钟权限时自动降级
11. **多端开箱即用**：
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
- **原生模块**：`WeatherWidgetModule`（小部件数据/皮肤下发）、`LocationModule`（GPS 定位与反地理编码）

---

## 🚀 快速上手与运行

### 1. 启动移动端开发服务器 (Expo)

```bash
npm install
npm start
```

- 控制台将展示一个交互式菜单及 **二维码 (QR Code)**。
- **真机调试体验**：
  - 手机（Android 或 iPhone）在应用商店下载并打开 **Expo Go**。
  - 用 Expo Go 扫描终端里的二维码，即可在手机上以原生 App 效果流畅体验本软件。

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

#### 4.1 首次构建前必须准备正式签名证书

自定义原生目录（`android/`）存在时，EAS 与 Gradle 都依赖 `android/keystore.properties` 里的正式证书。仓库中的 `android/app/debug.keystore` 仅供开发调试，**不能用于发布**。

生成自己的证书（只需一次，请离线备份 keystore 与口令，丢失后无法覆盖升级）：

```bash
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias noadweather \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storetype PKCS12 \
  -dname "CN=No Ad Weather, OU=Mobile, O=Pure Weather Studio, L=Nanchang, ST=Jiangxi, C=CN"
```

然后复制模板并填入口令：

```bash
cp android/keystore.properties.example android/keystore.properties
```

`android/keystore.properties` 字段说明（`storeFile` 相对 `android/` 目录）：

```properties
storeFile=app/release.keystore
storePassword=你的 storePassword
keyAlias=noadweather
keyPassword=你的 keyPassword
```

- `android/keystore.properties` 与 `android/app/release.keystore` 已在 `.gitignore` 中忽略，**切勿提交**。
- 缺少 `android/keystore.properties` 时，`assembleRelease` 会直接抛 `GradleException` 中止，避免误用 debug 证书签出无法上架的包。

#### 4.2 编译

```bash
cd android
./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

#### 4.3 release 构建优化（已默认开启）

- **R8 代码混淆 + 资源裁剪**：`android.enableMinifyInReleaseBuilds=true`、`android.enableShrinkResourcesInReleaseBuilds=true`；`android/app/proguard-rules.pro` 已保留 `com.pure.mojiweather.**`（ReactPackage 反射加载的原生模块）与全部 `AppWidgetProvider`（系统按清单类名反射实例化）。
- **ABI 裁剪**：`reactNativeArchitectures=arm64-v8a,armeabi-v7a`，只打真机需要的架构。需要在模拟器上跑调试包时用：
  ```bash
  ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
  ```
- **JDK**：不再写死 `org.gradle.java.home`，请设置 `JAVA_HOME` 指向 JDK 17，或在 `android/local.properties` 里配置。
- 上述三项叠加，release APK 从 68.94 MB 降到约 33 MB。

#### 4.4 用 EAS 云端构建（可选）

```bash
npx eas-cli build -p android --profile preview
```

---

## ✅ 代码检查与测试

```bash
npm run typecheck                     # tsc --noEmit
npm run lint                          # expo lint（react-hooks / no-unused-vars 均为 error）
npm test                              # 30 分钟自动刷新一致性检查（46 项断言）

npm run test:forecast                 # 30 天预报数据层（真实请求 Open-Meteo，110 项断言）
npm run test:forecast:ui              # 30 天预报 UI 渲染（真实渲染组件，30 项断言）
npm run test:app                      # App 整页冒烟（整页渲染 + 30 行落地，10 项断言）
npm run test:forecast:all             # 上面三项一起跑

python test_widget_skin_verification.py                 # 校验 APK + 源码（需先构建）
python test_widget_skin_verification.py --skip-apk      # 只校验源码与资源
python test_widget_skin_verification.py --apk <apk路径> # 指定 APK
```

- `npm test` 断言 App 内定时器、Kotlin 闹钟、Manifest 权限、三套 `info.xml` 的刷新周期全部统一为 30 分钟，且不存在 20 分钟的旧实现。
- `npm run test:forecast` 真实请求 Open-Meteo，对南昌/北京/漠河/三亚四地核对：30 条逐日数据、16 天精准段 + 14 天趋势段、日期逐日连续无重复、温度/降水概率/紫外线/日出日落全部有效，并把前 16 天与官方 forecast、后 14 天与官方 seasonal 逐日数值交叉比对，防止合并错位。
- `npm run test:forecast:ui` 用 `react-dom/server` 真实渲染 `DailyForecastCard` 与 `DailyDetailModal`（RN 模块走 `scripts/stubs/` 桩），断言 30 行日期全部出现在 DOM、15 天数据渲染 15 行、30 天逐天切换都能正确展示。
- `npm run test:app` 把整个 `App.js` 渲染一遍，确认 30 天改动没有破坏整页渲染链路、加载态不出现空预报区、30 天卡片能落地 30 行。
- `test_widget_skin_verification.py` 断言换肤资源、换肤广播、AQI 六档一致性、更新时间格式化幂等、未使用权限已移除、小部件选择器预览图等；在源码上即可运行，便于 CI 前置拦截。

---

## 📱 核心目录结构

```
no-ad-weather/
├── App.js                         # 应用主入口，负责整体状态流、下拉刷新与页面编排
├── app.json                       # Expo 配置文件
├── package.json                   # 项目依赖与运行脚本
├── scripts/verify_refresh.js      # 30 分钟刷新一致性断言脚本
├── scripts/test_forecast_days.mjs # 30 天预报数据层功能测试（真实请求）
├── scripts/test_forecast_ui.mjs   # 30 天预报 UI 渲染功能测试（react-dom/server）
├── scripts/render-loader.mjs      # JSX 转换 + React Native 桩的模块加载器
├── scripts/stubs/                 # 测试用的 react-native / expo-* 桩实现
├── test_widget_skin_verification.py
├── android/                       # 原生工程（CNG 之外的手工维护目录）
│   ├── keystore.properties.example
│   └── app/src/main/java/com/pure/mojiweather/
│       ├── WeatherWidgetModule.kt           # 小部件数据/皮肤下发
│       ├── WeatherWidgetSyncHelper.kt       # 后台拉取 + 30 分钟闹钟调度
│       ├── WeatherWidgetAutoRefreshReceiver.kt
│       ├── LocationModule.kt                # GPS 定位与反地理编码
│       └── WeatherWidget4x1/4x2/4x3Provider.kt
└── src/
    ├── services/
    │   ├── weatherService.js      # Open-Meteo 气象、AQI、地名编码接口与生活指数算法
    │   └── locationService.js     # 定位与 IP 兜底
    └── components/
        ├── WeatherBackground.js   # 拟真天空渐变与雨滴/飘雪/星光粒子特效
        ├── HeaderBar.js           # 顶部城市状态、定位切换与无广告徽章
        ├── CurrentWeatherCard.js  # 核心大字温度、天气状况、短时降水出行横幅
        ├── HourlyForecastCard.js  # 24小时逐小时预报与降雨概率
        ├── DailyForecastCard.js   # 30天预报（16天精准+14天趋势）与高低温可视化色带
        ├── AirQualityCard.js      # 空气质量 AQI 刻度表与 6 大污染物指标
        ├── LivingIndicesCard.js   # 8 大生活指数与详情弹窗
        ├── WeatherDetailsGrid.js  # 深度传感器指标网格（风力/气压/湿度/日出日落）
        ├── CityManageModal.js     # 城市搜索、热门城市与收藏管理弹窗
        ├── WidgetCenterModal.js   # 桌面小部件皮肤工坊
        └── AboutCleanModal.js     # 纯净版设计理念与版本弹窗
```
