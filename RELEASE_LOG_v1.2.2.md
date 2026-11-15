# 墨迹天气纯净版 v1.2.2 发布日志

**发布版本**: v1.2.2 (versionCode: 11)  
**发布时间**: 2026-11-02  
**项目路径**: `E:\Antigravity ex_project\no-ad-weather`

---

## 🐞 本次修复的核心问题：时间一直不会自动刷新

用户反馈「本来设置的是半小时刷新一次，但时间一直不会自动刷新」。排查后确认这是**四个独立缺陷叠加**的结果：

### 0. 构建配置让所有 JS 修改都进不了 APK（最致命，且掩盖了下面全部问题）
`android/app/build.gradle` 里写着：

```groovy
debuggableVariants = ["release"]
```

这行把 `release` 变体声明成「可调试变体」。React Native 的 Gradle 插件对可调试变体的处理是
**不执行 `createBundleReleaseJsAndAssets`**（认为 JS 由 Metro 开发服务器提供）。于是每次
`assembleRelease` 打进 APK 的，都是仓库中被 git 跟踪的
`android/app/src/main/assets/index.android.bundle` —— 一份停留在 **2026-10-06** 的旧快照。

后果：**任何对 `App.js` / `src/` 的修改都不会出现在安装包里**。用户装的新 APK 跑的仍是旧 JS，
所以「改了没用」；这也是为什么历史上多次尝试修自动刷新都无效。

修复：
1. `debuggableVariants = ["debug", "debugOptimized"]`；
2. `git rm --cached android/app/src/main/assets/index.android.bundle` 并从工作区删除；
3. `.gitignore` 增加 `android/app/src/main/assets/*.bundle` 与 `*.hbc`。

实测对比（解包 APK 的 `assets/index.android.bundle`）：旧 **1,533,635 B**（含 `18:48`、`ip-api.com`、
不含任何新常量）→ 新 **1,675,452 B**（含 `AUTO_REFRESH_INTERVAL_MS`、`buildStableLocationId`、
`30分钟自动刷新`，不含 `18:48` / `ip-api.com`）。

### 1. JS 定时器被反复销毁重建（根因）
`App.js` 中自动刷新的 `useEffect` 依赖数组里写了 `currentCity`，而每次 GPS 定位返回的城市对象
`id` 都带 `Date.now()`（如 `loc_gps_1759900000123`），所以每定位一次城市对象就是「新对象」→
依赖变化 → 定时器 `clearInterval` 后重新 `setInterval` → **计时永远从 0 开始，30 分钟永远等不到**。

修复：依赖数组只保留稳定的 `handleRefresh`，城市通过 `currentCityRef` 读取；同时把定位 id
改成按经纬度生成的稳定值（`loc_gps_28.683_115.891`），同一位置重复定位不再产生新对象。

### 2. 刷新周期本身就不对（20 分钟 vs 半小时）
- `App.js` 用 `const TWENTY_MINUTES = 20 * 60 * 1000`，注释却写「每 20 分钟」；
- `WeatherWidgetSyncHelper.kt` 的 `REFRESH_INTERVAL_MILLIS = 20 * 60 * 1000L`；
- `ClockWeatherWidget.js` 里还有一个独立的 **1 小时** 定时器，且依赖 `[onRefresh, isRefreshing]`
  会被频繁重建，与全局定时器互相干扰。

修复：统一为 **30 分钟**。JS 侧收敛到 `AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000`，
原生侧收敛到 `REFRESH_INTERVAL_MILLIS = 30 * 60 * 1000L`，并删除组件内的重复定时器。

### 3. 原生闹钟在 Android 12+ 静默失效
`AndroidManifest.xml` 缺少 `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` 权限，
`setExactAndAllowWhileIdle()` 会抛 `SecurityException`，闹钟注册失败且无任何提示，
桌面小部件从此不再自动更新。

修复：补齐两个权限；调度前检查 `canScheduleExactAlarms()`，无权限时降级为
`setAndAllowWhileIdle()`，保证在未授予精确闹钟权限的设备上也能刷新（只是不精确）。

---

## 🌟 本次一并修复的其他问题

| # | 问题 | 位置 | 修复 |
|---|------|------|------|
| 1 | 逐小时预报时间与温度错位（最多差 24 小时） | `WeatherWidgetSyncHelper.kt` | 按 `hourly.time` 数组对齐 `hourlyStartIndex` |
| 2 | 更新时间重复显示「08:30 更新 更新」 | 原生 `updateTime` + `HeaderBar.js` | 原生只输出 `HH:mm`，界面统一拼接；`HeaderBar` 增加去重兜底 |
| 3 | 4×2 小部件深色皮肤误用 4×3 背景 | `WeatherWidget4x2Provider.kt` | 新增 `widget_bg_4x2.xml` 并修正引用 |
| 4 | IP 定位兜底走明文 HTTP 必失败 | `locationService.js` | `http://ip-api.com` → `https://ipwho.is/` |
| 5 | 「刷新中」状态可能永久卡死，导致后续自动刷新全部被跳过 | `App.js` | `try/finally` 复位 + `isRefreshingRef` 立即生效 |
| 6 | 小部件预览时间写死 `20:30` | `WidgetCenterModal.js` | 改为实时跳动的当前时间 |
| 7 | 三处版本号互相矛盾（1.1.9 / 1.1.4 / versionCode 6、10） | 三个配置文件 | 统一为 1.2.2 / versionCode 11 |
| 8 | 无 lint / typecheck / test 脚本，无法在提交前发现问题 | 项目根 | 新增 ESLint flat config、tsconfig 与三个 npm 脚本 |

---

## ✅ 测试结果

| 检查项 | 命令 | 结果 |
|--------|------|------|
| 自动刷新周期一致性回归（46 项断言） | `npm test` | ✅ 全部通过 |
| TypeScript 类型检查 | `npx tsc --noEmit` | ✅ 无错误 |
| ESLint 静态检查 | `npx eslint .` | ✅ 0 error / 0 warning |
| 小部件源码一致性 | `python test_widget_skin_verification.py --skip-apk` | ✅ 全部通过 |
| APK 产物校验（含 DEX/resources 断言） | `python test_widget_skin_verification.py --apk android\app\build\outputs\apk\release\app-release.apk` | ✅ ALL TESTS PASSED |
| Kotlin 编译 | `android\gradlew.bat :app:assembleRelease` | ✅ BUILD SUCCESSFUL |
| **运行时实测（30 分钟真的会触发）** | headless Chrome 加载 `expo export` 产物 | ✅ 见下 |

### 运行时实测细节
把 `npx expo export --platform web` 的产物用本地静态服务器托管，再用 headless Chrome
（`--virtual-time-budget` 快进虚拟时钟）加载，抓取控制台输出：

```
[AutoRefresh] 已启动 30 分钟自动刷新定时器
[AutoRefresh] 达到 30 分钟，自动刷新天气并同步至桌面小部件
```

- 「启动」只出现 **1 次**、「清理」出现 **0 次** → 证明定时器不再被反复重建（历史 bug 的直接反证）；
- 虚拟时间推进 30 分钟后定时器**确实触发**，说明周期与回调都正确；
- 渲染出的 DOM 中确认文案为「30分钟自动刷新 · 09:56 更新」（无「1小时」「18:48」「更新 更新」）。

`scripts/verify_refresh.js` 会在以下情况直接失败，防止问题回归：
- `AUTO_REFRESH_INTERVAL_MS` 不是 30 分钟；
- 自动刷新 `useEffect` 的依赖数组里重新出现 `currentCity`；
- Kotlin 的 `REFRESH_INTERVAL_MILLIS` 不是 30 分钟；
- Manifest 缺少精确闹钟权限或 30 分钟广播注册；
- 三个 Provider 又回去调用 `schedule20MinAutoRefresh`；
- `info.xml` 的 `updatePeriodMillis` 小于 1800000；
- `package.json` / `app.json` / `build.gradle` 版本号不一致。

---

## 📱 安装包

已在本机构建：`android\app\build\outputs\apk\release\app-release.apk`
（68.8 MB，`aapt2 dump badging` → `versionCode='11' versionName='1.2.2'`，minSdk 24 / targetSdk 36）。

仓库根目录的 `NoAdWeather_v1.2.1.apk` 等历史产物是旧代码的构建结果，**不含本次修复**，请勿混淆。

> ⚠️ 安装前请先卸载旧版，或确认新 APK 的 `versionCode 11` 高于设备上已装版本，否则系统会拒绝覆盖安装。
