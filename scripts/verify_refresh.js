#!/usr/bin/env node
/**
 * 自动刷新一致性回归测试
 * ------------------------------------------------------------
 * 历史问题：界面声称「半小时刷新一次」，但 JS 定时器与原生闹钟实际是 20 分钟，
 * 且 JS 定时器依赖了每次定位都会变化的 currentCity，导致定时器被反复重建、
 * 永远不会真正触发（表现为时间一直不自动刷新）。
 *
 * 本脚本静态校验「30 分钟」这条时间线在 JS / Kotlin / AndroidManifest / 布局中
 * 完全一致，防止以后再被改回去。
 *
 * 用法：node scripts/verify_refresh.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXPECTED_MINUTES = 30;
const EXPECTED_MS = EXPECTED_MINUTES * 60 * 1000;

let failures = 0;
let checks = 0;

function read(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`文件不存在：${relPath}`);
  }
  return fs.readFileSync(full, 'utf8');
}

function ok(name, detail) {
  checks += 1;
  console.log(`  \u2713 ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks += 1;
  failures += 1;
  console.error(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
}

function assert(cond, name, detail) {
  if (cond) ok(name, detail);
  else fail(name, detail);
}

function section(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------
// 1. JS 端：App.js 的自动刷新周期
// ---------------------------------------------------------------
section('1. JS 自动刷新周期 (App.js)');
const appJs = read('App.js');

const jsIntervalMatch = appJs.match(/export const AUTO_REFRESH_INTERVAL_MS\s*=\s*([^;]+);/);
assert(Boolean(jsIntervalMatch), '存在导出的 AUTO_REFRESH_INTERVAL_MS 常量');

if (jsIntervalMatch) {
  const expr = jsIntervalMatch[1].trim();
  // 只接受 30 * 60 * 1000 这类纯算术表达式，避免 eval 之外的歧义
  const normalized = expr.replace(/\s+/g, '');
  assert(
    normalized === `${EXPECTED_MINUTES}*60*1000`,
    `AUTO_REFRESH_INTERVAL_MS 为 ${EXPECTED_MINUTES} 分钟`,
    `实际表达式：${expr}`
  );
  const evaluated = Function(`"use strict";return (${expr});`)();
  assert(
    evaluated === EXPECTED_MS,
    'AUTO_REFRESH_INTERVAL_MS 求值等于 1800000ms',
    `实际：${evaluated}ms`
  );
}

assert(
  /export const AUTO_REFRESH_INTERVAL_MINUTES\s*=\s*AUTO_REFRESH_INTERVAL_MS\s*\/\s*60000\s*;/.test(appJs),
  'AUTO_REFRESH_INTERVAL_MINUTES 由毫秒常量派生（不重复硬编码）'
);

// 定时器必须使用看门狗常量，且不能直接把刷新周期当 setInterval 周期
//
// 历史 bug（v1.2.6 修复）：旧实现是 setInterval(handleRefresh, 30 分钟)。计时挂在
// 「定时器对象」上，handleRefresh 身份一变（依赖 autoDetectLocation / loadWeather /
// setRefreshing）React 就 cleanup 重建，30 分钟计时清零，用户表现就是「不点刷新
// 永远不刷新」。现在改成 60 秒看门狗轮询 + 绝对时间戳判定。
const intervalBlockMatch = appJs.match(
  /const timer = setInterval\(([A-Za-z_$][\w$]*),\s*([A-Za-z_$][\w$]*)\);/
);
assert(Boolean(intervalBlockMatch), '存在 setInterval 自动刷新看门狗定时器');
if (intervalBlockMatch) {
  assert(
    intervalBlockMatch[2] === 'AUTO_REFRESH_WATCHDOG_MS',
    'setInterval 周期使用 AUTO_REFRESH_WATCHDOG_MS（细粒度轮询，不是 30 分钟）',
    `实际：${intervalBlockMatch[2]}`
  );
  assert(
    intervalBlockMatch[2] !== 'AUTO_REFRESH_INTERVAL_MS',
    'setInterval 不再直接把 30 分钟当轮询周期（否则计时会被重建清零）',
    `实际：${intervalBlockMatch[2]}`
  );
}

// 看门狗周期必须是比刷新周期更细的粒度，否则失去「计时不受重建影响」的意义
const policySrc = read('src/services/refreshPolicy.js');
const watchdogMatch = policySrc.match(/export const AUTO_REFRESH_WATCHDOG_MS\s*=\s*([^;]+);/);
assert(Boolean(watchdogMatch), 'refreshPolicy 导出 AUTO_REFRESH_WATCHDOG_MS');
if (watchdogMatch) {
  const watchdogMs = Function(`"use strict";return (${watchdogMatch[1]});`)();
  assert(
    Number.isFinite(watchdogMs) && watchdogMs > 0 && watchdogMs < EXPECTED_MS,
    '看门狗周期小于 30 分钟刷新周期',
    `watchdog=${watchdogMs}ms interval=${EXPECTED_MS}ms`
  );
  assert(
    watchdogMs <= 5 * 60 * 1000,
    '看门狗周期不超过 5 分钟（保证唤醒后能及时判定到期）',
    `watchdog=${watchdogMs}ms`
  );
}
assert(
  /export function shouldRunWatchdogTick/.test(policySrc),
  'refreshPolicy 导出 shouldRunWatchdogTick（每拍是否该刷新的纯函数）'
);

// 自动刷新 effect 必须是空依赖 + 通过 ref 调 handleRefresh，才能永不重建
const autoRefreshEffectMatch = appJs.match(
  /useEffect\(\(\) => \{\s*console\.log\(`\[AutoRefresh\][\s\S]*?\}, (\[[^\]]*\])\);/
);
assert(Boolean(autoRefreshEffectMatch), '定位到自动刷新 useEffect 的依赖数组');
if (autoRefreshEffectMatch) {
  const deps = autoRefreshEffectMatch[1].replace(/\s+/g, '');
  assert(
    deps === '[]',
    '自动刷新 useEffect 依赖为空数组（定时器永不因身份变化重建）',
    `依赖：${autoRefreshEffectMatch[1]}`
  );
}
assert(
  /handleRefreshRef\.current\s*=\s*handleRefresh/.test(appJs),
  'App.js 用 handleRefreshRef 镜像刷新函数，供定时器闭包安全调用'
);
assert(
  /shouldRunWatchdogTick\(/.test(appJs),
  'App.js 的看门狗每拍用 shouldRunWatchdogTick 判定是否到期'
);
assert(
  /lastRefreshTimestampRef\.current/.test(appJs) &&
    /Date\.now\(\)\s*-\s*lastRefreshTimestampRef\.current/.test(appJs),
  '看门狗以绝对时间戳为计时基准（不依赖定时器自身寿命）'
);

// AppState 前台恢复阈值也必须用同一常量
assert(
  /elapsed\s*>=\s*AUTO_REFRESH_INTERVAL_MS/.test(appJs) ||
    /intervalMs:\s*AUTO_REFRESH_INTERVAL_MS/.test(appJs),
  'AppState 前台恢复使用 AUTO_REFRESH_INTERVAL_MS 阈值'
);
assert(
  !/20\s*\*\s*60\s*\*\s*1000/.test(appJs),
  'App.js 中不存在遗留的 20 分钟硬编码'
);
assert(
  !/TWENTY_MINUTES/.test(appJs),
  'App.js 中不存在遗留的 TWENTY_MINUTES 常量'
);

// ---------------------------------------------------------------
// 2. 原生端：Kotlin 闹钟周期
// ---------------------------------------------------------------
section('2. 原生闹钟周期 (WeatherWidgetSyncHelper.kt)');
const helperPath = 'android/app/src/main/java/com/pure/mojiweather/WeatherWidgetSyncHelper.kt';
const helper = read(helperPath);

assert(
  new RegExp(`REFRESH_INTERVAL_MILLIS\\s*=\\s*${EXPECTED_MINUTES}\\s*\\*\\s*60\\s*\\*\\s*1000L`).test(helper),
  `REFRESH_INTERVAL_MILLIS 为 ${EXPECTED_MINUTES} 分钟`
);
assert(
  /canScheduleExactAlarms\(\)/.test(helper),
  '闹钟调度前检查 canScheduleExactAlarms()（Android 12+ 无权限会 SecurityException）'
);
assert(
  /setAndAllowWhileIdle/.test(helper),
  '无精确闹钟权限时降级为 setAndAllowWhileIdle'
);
assert(
  /ACTION_AUTO_REFRESH_30MIN/.test(helper),
  '定义了 ACTION_AUTO_REFRESH_30MIN 广播 Action'
);
assert(
  /SimpleDateFormat\("HH:mm"/.test(helper),
  'updateTime 不再自带「更新」后缀（由界面侧统一拼接）'
);
assert(
  !/"HH:mm 更新"/.test(helper),
  'Kotlin 中不存在 "HH:mm 更新" 旧格式'
);

// hourly24 不能再用 i 直接索引数组（会导致时间与温度错位）
assert(
  /hourlyStartIndex/.test(helper),
  'hourly24 通过 hourlyStartIndex 对齐真实小时（修复时间/温度错位）'
);

// ---------------------------------------------------------------
// 3. AndroidManifest：权限与广播注册
// ---------------------------------------------------------------
section('3. AndroidManifest 权限与广播注册');
const manifest = read('android/app/src/main/AndroidManifest.xml');

assert(
  /android\.permission\.SCHEDULE_EXACT_ALARM/.test(manifest),
  '声明 SCHEDULE_EXACT_ALARM 权限'
);
assert(
  /android\.permission\.USE_EXACT_ALARM/.test(manifest),
  '声明 USE_EXACT_ALARM 权限'
);
assert(
  /com\.pure\.mojiweather\.ACTION_AUTO_REFRESH_30MIN/.test(manifest),
  'receiver 注册了 ACTION_AUTO_REFRESH_30MIN'
);
assert(
  /WeatherWidgetAutoRefreshReceiver/.test(manifest),
  '注册了 WeatherWidgetAutoRefreshReceiver'
);
assert(
  /android\.permission\.RECEIVE_BOOT_COMPLETED/.test(manifest),
  '声明 RECEIVE_BOOT_COMPLETED（开机后恢复闹钟）'
);

// ---------------------------------------------------------------
// 4. 三个 Widget Provider 都使用统一的调度函数
// ---------------------------------------------------------------
section('4. Widget Provider 调度一致性');
const providers = [
  'WeatherWidget4x1Provider.kt',
  'WeatherWidget4x2Provider.kt',
  'WeatherWidget4x3Provider.kt',
];
for (const provider of providers) {
  const src = read(`android/app/src/main/java/com/pure/mojiweather/${provider}`);
  assert(
    /scheduleAutoRefresh\(/.test(src),
    `${provider} 调用 scheduleAutoRefresh`
  );
  assert(
    !/schedule20MinAutoRefresh\(/.test(src),
    `${provider} 不再直接调用 schedule20MinAutoRefresh`
  );
}

// ---------------------------------------------------------------
// 5. 小部件 info.xml：系统 updatePeriodMillis 不得小于 30 分钟
// ---------------------------------------------------------------
section('5. 小部件 info.xml 更新周期');
for (const size of ['4x1', '4x2', '4x3']) {
  const info = read(`android/app/src/main/res/xml/weather_widget_${size}_info.xml`);
  const m = info.match(/android:updatePeriodMillis="(\d+)"/);
  if (!m) {
    fail(`weather_widget_${size}_info.xml 含 updatePeriodMillis`);
    continue;
  }
  const period = Number(m[1]);
  // Android 系统最小允许 30 分钟（1800000ms），小于该值会被系统强制抬到 30 分钟
  assert(
    period >= EXPECTED_MS,
    `weather_widget_${size}_info.xml updatePeriodMillis >= ${EXPECTED_MS}`,
    `实际：${period}`
  );
}

// ---------------------------------------------------------------
// 6. 界面文案与版本号一致性
// ---------------------------------------------------------------
section('6. 界面文案与版本号');
const clockWidget = read('src/components/ClockWeatherWidget.js');
assert(
  /30分钟自动刷新/.test(clockWidget),
  'ClockWeatherWidget 文案为「30分钟自动刷新」'
);
assert(
  !/1小时自动刷新/.test(clockWidget),
  'ClockWeatherWidget 不再出现「1小时自动刷新」'
);

const aboutModal = read('src/components/AboutCleanModal.js');
const pkg = JSON.parse(read('package.json'));
const appJson = JSON.parse(read('app.json'));
const version = pkg.version;

// 版本号不能再在组件里写死：写死就会出现「装了 1.2.6，界面还显示 1.2.5」。
// 组件必须从 appInfo 读（原生 PackageInfo 优先，打包期常量兜底）。
assert(
  /from '\.\.\/services\/appInfo'/.test(aboutModal),
  'AboutCleanModal 从 appInfo 读取版本号（而非写死字符串）'
);
assert(
  /versionLabel/.test(aboutModal) && /formatVersionLabel\(FALLBACK_VERSION_NAME\)/.test(aboutModal),
  'AboutCleanModal 优先使用传入的 versionLabel，缺失时回退到打包期常量'
);
assert(
  !/版本信息：v\d+\.\d+\.\d+/.test(aboutModal),
  'AboutCleanModal 不再出现硬编码的「版本信息：vX.Y.Z」'
);

const appInfoSrc = read('src/services/appInfo.js');
const fallbackMatch = appInfoSrc.match(/FALLBACK_VERSION_NAME\s*=\s*'([^']+)'/);
assert(
  fallbackMatch && fallbackMatch[1] === version,
  'appInfo.js 兜底版本号与 package.json 一致',
  `appInfo=${fallbackMatch ? fallbackMatch[1] : 'N/A'} package.json=${version}`
);
assert(
  appJson.expo && appJson.expo.version === version,
  'app.json version 与 package.json 一致',
  `app.json=${appJson.expo ? appJson.expo.version : 'N/A'} package.json=${version}`
);

const gradle = read('android/app/build.gradle');
const versionNameMatch = gradle.match(/versionName\s+"([^"]+)"/);
const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);
assert(
  versionNameMatch && versionNameMatch[1] === version,
  'build.gradle versionName 与 package.json 一致',
  `build.gradle=${versionNameMatch ? versionNameMatch[1] : 'N/A'} package.json=${version}`
);
assert(
  Boolean(versionCodeMatch),
  'build.gradle 声明了 versionCode',
  `versionCode=${versionCodeMatch ? versionCodeMatch[1] : 'N/A'}`
);

// ---------------------------------------------------------------
// 7. 定位服务：id 稳定 + 无明文 HTTP
// ---------------------------------------------------------------
section('7. 定位服务稳定性');
const locService = read('src/services/locationService.js');
assert(
  /buildStableLocationId/.test(locService),
  '定位 id 由经纬度生成稳定值（不再用 Date.now()）'
);
assert(
  !/loc_(gps|ip|h5)_\$\{Date\.now\(\)\}/.test(locService),
  '不存在 loc_*_${Date.now()} 形式的易变 id'
);
assert(
  !/['"]http:\/\/ip-api\.com/.test(locService),
  '不再使用明文 HTTP 的 ip-api.com（Android 9+ cleartext 会被拦截）'
);

// ---------------------------------------------------------------
// 8. 构建配置：release 必须真正打包 JS
// ---------------------------------------------------------------
section('8. 构建配置（release 必须重新打包 JS）');
// 历史 bug：debuggableVariants = ["release"] 会让 Gradle 把 release 当可调试变体，
// 跳过 createBundleReleaseJsAndAssets，APK 里打进仓库残留的陈旧 index.android.bundle，
// 结果是源码怎么改都不生效（用户看到的「时间不刷新」正是被这层掩盖的）。
const debuggableMatch = gradle.match(/debuggableVariants\s*=\s*\[([^\]]*)\]/);
assert(Boolean(debuggableMatch), 'build.gradle 显式声明 debuggableVariants');
if (debuggableMatch) {
  assert(
    !/["']release["']/.test(debuggableMatch[1]),
    'debuggableVariants 不含 release（否则 release 不会打包 JS）',
    `实际：${debuggableMatch[1].trim()}`
  );
}

const gitignore = read('.gitignore');
assert(
  /assets\/\*\.bundle/.test(gitignore),
  '.gitignore 忽略 android/app/src/main/assets/*.bundle（避免陈旧快照被提交）'
);
assert(
  !fs.existsSync(path.join(ROOT, 'android/app/src/main/assets/index.android.bundle')),
  '工作区不存在预置的 index.android.bundle（由构建期生成）'
);

// ---------------------------------------------------------------
// 9. 关屏 / 后台 / 整夜待机后仍要能刷新（v1.2.5 新增）
// ---------------------------------------------------------------
section('9. 关屏与后台刷新可靠性');

// 9.1 原生闹钟必须是「一次性精确 + 系统重复兜底」双通道。
// 历史 bug：只用 setExactAndAllowWhileIdle 做链式调度，下一次闹钟要等抓取成功后的
// finally 才排；进程一旦被杀，链就永久断开，表现为「关屏过夜后不再刷新」。
assert(
  /setInexactRepeating/.test(helper),
  '原生注册了 setInexactRepeating 重复兜底闹钟（进程被杀也能自愈）'
);
assert(
  /fun scheduleAutoRefresh\(/.test(helper) && /scheduleExactOnce\(/.test(helper),
  'scheduleAutoRefresh 拆分为精确闹钟 + 兜底闹钟两路'
);
assert(
  /BACKUP_REQUEST_CODE/.test(helper),
  '兜底闹钟使用独立 requestCode，避免覆盖一次性精确闹钟'
);

// 9.2 广播接收器必须「先排下次闹钟，再投递抓取任务」，否则抓取中途被杀就再也不会排。
//     v1.2.8 起抓取改由 WorkManager 的一次性任务执行（见第 12 节），
//     所以在 Receiver 里紧跟其后的动作是 enqueueImmediate 而不是 fetchWeatherInBackground。
const receiver = read('android/app/src/main/java/com/pure/mojiweather/WeatherWidgetAutoRefreshReceiver.kt');
const scheduleIdx = receiver.indexOf('scheduleAutoRefresh(appContext)');
const fetchIdx = receiver.indexOf('WeatherRefreshScheduler.enqueueImmediate');
assert(
  scheduleIdx !== -1 && fetchIdx !== -1 && scheduleIdx < fetchIdx,
  'Receiver 先调用 scheduleAutoRefresh 再投递抓取任务（链路自愈）'
);
assert(
  /ACTION_SCREEN_ON/.test(receiver) && /ACTION_LOCKED_BOOT_COMPLETED/.test(receiver),
  'Receiver 覆盖亮屏与直接启动完成广播'
);

// 9.3 Android 8+ 隐式广播无法静态注册，亮屏/解锁必须动态注册。
const mainApp = read('android/app/src/main/java/com/pure/mojiweather/MainApplication.kt');
assert(
  /registerReceiver\(/.test(mainApp) && /ACTION_SCREEN_ON/.test(mainApp),
  'MainApplication 动态注册亮屏监听（manifest 静态注册收不到隐式广播）'
);

// 9.4 原生后台抓取必须记录同步时间戳，否则 JS 无法判断缓存新旧。
assert(
  /KEY_LAST_SYNC_AT/.test(helper),
  '原生缓存写入同步时间戳 KEY_LAST_SYNC_AT'
);
assert(
  /putLong\(KEY_LAST_SYNC_AT/.test(helper),
  '抓取成功后把时间戳一起落盘'
);

// 9.5 JS 必须能读回原生缓存并立即上屏。
const widgetModule = read('android/app/src/main/java/com/pure/mojiweather/WeatherWidgetModule.kt');
assert(
  /fun readCachedWeather\(/.test(widgetModule),
  'WeatherWidgetModule 暴露 readCachedWeather() 供 JS 读原生缓存'
);
assert(
  /fun refreshInBackground\(/.test(widgetModule),
  'WeatherWidgetModule 暴露 refreshInBackground() 供 JS 兜底触发'
);

const policy = read('src/services/refreshPolicy.js');
assert(
  /export function shouldRefreshOnForeground/.test(policy),
  'refreshPolicy 导出 shouldRefreshOnForeground（前台恢复判定抽成纯函数）'
);
assert(
  /export function parseNativeCache/.test(policy),
  'refreshPolicy 导出 parseNativeCache（防御式解析原生缓存）'
);
assert(
  /export function nativePayloadToWeather/.test(policy),
  'refreshPolicy 导出 nativePayloadToWeather（缓存转页面结构）'
);

assert(
  /hydrateFromCache/.test(appJs) && /readCachedWeather/.test(appJs),
  'App.js 在启动/前台恢复时先用原生缓存补水再联网'
);
assert(
  /STORAGE_LAST_WEATHER_KEY/.test(appJs),
  'App.js 持久化完整天气快照（冷启动弱网也有内容可显示）'
);
assert(
  /decideForegroundRefresh\(/.test(appJs),
  'App.js 前台恢复改用 decideForegroundRefresh 合并判据'
);

// 9.6 跨夜保护：原生缓存可能「时间很新但逐日列表还是昨天的」。
// 实测表现：用户睡一觉醒来，顶部时间是新的，逐日第一行却写着「今天」加昨天的日期。
assert(
  /registerReceiver\(receiver, filter, Context\.RECEIVER_NOT_EXPORTED\)/.test(mainApp) ||
    /Context\.RECEIVER_NOT_EXPORTED/.test(mainApp),
  '动态注册在 Android 13+ 传 RECEIVER_NOT_EXPORTED（否则 Android 14 抛 SecurityException）'
);
assert(
  /export function isDailyCoveringToday/.test(policy),
  'refreshPolicy 导出 isDailyCoveringToday（判断逐日列表是否还从今天开始）'
);
assert(
  /export function decideForegroundRefresh/.test(policy),
  'refreshPolicy 导出 decideForegroundRefresh（时间 + 跨夜合并判据）'
);
assert(
  /isDailyCoveringToday\(/.test(policy),
  'decideForegroundRefresh 内部复用 isDailyCoveringToday 跨夜判定'
);
assert(
  /decision\.shouldRefresh/.test(appJs),
  'App.js 按合并判据决定是否刷新（时间过期或跨夜任一成立）'
);
assert(
  /weatherDataRef\.current\s*=\s*weatherData/.test(appJs),
  'App.js 用 weatherDataRef 镜像天气数据，避免闭包读到旧 state'
);

// ---------------------------------------------------------------
// 10. 看门狗自动刷新与版本号展示
// ---------------------------------------------------------------
section('10. 看门狗自动刷新与版本号展示');

// 10.1 计时必须挂在绝对时间戳上，而不是「定时器自己跑满一轮」。
// 历史 bug：setInterval(handleRefresh, 30min) 的依赖里有 handleRefresh，
// 任一 useCallback 身份变化都会 cleanup 重建定时器，30 分钟计时反复清零，
// 用户实测表现为「不手动点刷新就永远停在 16 点」。
assert(
  /Date\.now\(\)\s*-\s*lastRefreshTimestampRef\.current/.test(appJs),
  'App.js 用「当前时间 - 上次成功刷新时间」判断是否到期（而非依赖定时器累积）'
);
assert(
  /handleRefreshRef\.current\s*=\s*handleRefresh/.test(appJs),
  'App.js 用 handleRefreshRef 镜像刷新函数，定时器依赖可保持为空数组'
);
assert(
  /const timer = setInterval\(tick,\s*AUTO_REFRESH_WATCHDOG_MS\)/.test(appJs),
  'App.js 看门狗按 AUTO_REFRESH_WATCHDOG_MS 短周期轮询'
);
assert(
  /shouldRunWatchdogTick\(/.test(appJs) && /export function shouldRunWatchdogTick/.test(policy),
  '看门狗每拍调用 shouldRunWatchdogTick 纯函数判定'
);
assert(
  /formatNextRefreshHint\(/.test(appJs) && /export function formatNextRefreshHint/.test(policy),
  '看门狗每拍刷新「下次刷新还有多久」提示'
);
assert(
  /tick\(\);\s*\n\s*const timer = setInterval/.test(appJs),
  '看门狗启动时先自检一次（不必等满第一个轮询周期）'
);

// 10.2 版本号：必须来自原生 PackageInfo，绝不写死在组件里。
assert(
  /fun getAppVersion\(\s*promise: Promise\s*\)/.test(widgetModule),
  'WeatherWidgetModule 暴露 getAppVersion() 供 JS 读真实 versionName'
);
assert(
  /getPackageInfo\(/.test(widgetModule) && /longVersionCode/.test(widgetModule),
  'getAppVersion 读取 PackageInfo（versionCode 走 longVersionCode）'
);
assert(
  /export async function getAppVersion/.test(appInfoSrc) && /formatVersionLabel/.test(appInfoSrc),
  'appInfo.js 提供 getAppVersion 与 formatVersionLabel'
);
assert(
  /getAppVersion\(\s*\)/.test(appJs) && /setVersionLabel\(/.test(appJs),
  'App.js 启动时读版本号并写入 state'
);
assert(
  /versionLabel=\{versionLabel\}/.test(appJs),
  'App.js 把版本号传给 HeaderBar（界面直接可见）'
);
assert(
  /nextRefreshHint=\{nextRefreshHint\}/.test(appJs),
  'App.js 把下次刷新提示传给 HeaderBar'
);
const headerBar = read('src/components/HeaderBar.js');
assert(
  /versionLabel/.test(headerBar) && /versionTag/.test(headerBar),
  'HeaderBar 渲染版本号标签'
);
assert(
  /nextRefreshHint/.test(headerBar) && /refreshHint/.test(headerBar),
  'HeaderBar 渲染下次刷新提示'
);

// ---------------------------------------------------------------
// 11. 小部件刷新按钮必须存在、固定宽度、可点击（回归「按钮被挤出屏幕」）
// ---------------------------------------------------------------
section('11. 小部件刷新按钮可见性');

const layoutDir = 'android/app/src/main/res/layout';
const blockOf = (src, id) => {
  // 反向找最近一个 '<' 起点、正向找最近的 '/>' 结束，截取该 View 的属性块
  const at = src.indexOf(`@+id/${id}`);
  if (at < 0) return '';
  const start = src.lastIndexOf('<', at);
  const end = src.indexOf('/>', at);
  if (start < 0 || end < 0) return '';
  return src.slice(start, end + 2);
};

for (const size of ['4x1', '4x2', '4x3']) {
  const layout = read(`${layoutDir}/widget_weather_${size}.xml`);

  const refreshBlock = blockOf(layout, 'widget_btn_refresh');
  assert(
    refreshBlock.length > 0,
    `widget_weather_${size}.xml 含刷新按钮 widget_btn_refresh`,
    '缺少该 id 时 Provider 绑定点击会静默失效'
  );

  // 固定 dp 宽度：wrap_content 会让按钮在窄屏被其它子 View 抢位，match_parent 会占满整行
  const widthMatch = refreshBlock.match(/android:layout_width="(\d+)dp"/);
  assert(
    Boolean(widthMatch) && Number(widthMatch[1]) >= 16 && Number(widthMatch[1]) <= 32,
    `widget_weather_${size}.xml 刷新按钮为固定 16-32dp 宽度`,
    widthMatch ? `实际：${widthMatch[1]}dp` : '未找到 dp 宽度声明'
  );

  assert(
    /android:contentDescription="@string\/widget_btn_refresh_desc"/.test(refreshBlock),
    `widget_weather_${size}.xml 刷新按钮带 contentDescription（无障碍可识别）`
  );

  // 按钮不能挂 layout_weight：一旦可伸缩，窄屏时会被压到 0 宽度而「消失」
  assert(
    !/android:layout_weight=/.test(refreshBlock),
    `widget_weather_${size}.xml 刷新按钮不参与 layout_weight 伸缩`
  );

  const skinBlock = blockOf(layout, 'widget_btn_skin');
  assert(
    skinBlock.length > 0 && /android:contentDescription="@string\/widget_btn_skin_desc"/.test(skinBlock),
    `widget_weather_${size}.xml 换肤按钮存在且带 contentDescription`
  );

  const provider = read(`android/app/src/main/java/com/pure/mojiweather/WeatherWidget${size}Provider.kt`);
  assert(
    /onClickPendingIntent\(R\.id\.widget_btn_refresh,\s*pendingRefreshIntent\)/.test(provider)
      || /setOnClickPendingIntent\(\s*R\.id\.widget_btn_refresh/.test(provider),
    `WeatherWidget${size}Provider 给刷新按钮绑定点击事件`
  );
}

// 4x1 的关键修复点：中间信息列必须可伸缩（weight=1），否则按钮会被溢出裁掉
const layout4x1 = read(`${layoutDir}/widget_weather_4x1.xml`);
assert(
  /android:layout_width="0dp"\s*\n\s*android:layout_weight="1"/.test(layout4x1),
  '4×1 中间信息列使用 0dp + layout_weight=1（唯一可伸缩区），保证右侧按钮不被挤出'
);

const stringsXml = read('android/app/src/main/res/values/strings.xml');
assert(
  /name="widget_btn_refresh_desc"/.test(stringsXml) && /name="widget_btn_skin_desc"/.test(stringsXml),
  'strings.xml 定义小部件按钮的 contentDescription 文案'
);

// ---------------------------------------------------------------
// 第 12 节：过夜/关屏后台刷新的兜底链路（WorkManager）
//
// 真机反馈（v1.2.7 之后）：睡一觉起来小部件还是昨晚的时间和日期。
// 前三轮修复都不足以穿透国产 ROM 的后台限制：
//   · setExactAndAllowWhileIdle 的一次性精确闹钟会被「自启动管理 / 省电策略」整条拦掉；
//   · setInexactRepeating 在 Doze 深度休眠里可能被推迟数小时；
//   · BroadcastReceiver.goAsync() 只有约 10 秒执行预算，弱网请求会被系统砍断。
// 所以新增 WorkManager 通道（JobScheduler 托管，进程被杀后仍会拉起、遵守 Doze 维护窗口）。
// 这一节把这条链路钉死，防止后续重构悄悄把它删掉。
// ---------------------------------------------------------------
section('第 12 节：WorkManager 兜底刷新链路（穿透 ROM 后台限制）');

const workerSrc = read('android/app/src/main/java/com/pure/mojiweather/WeatherRefreshWorker.kt');
const schedulerSrc = read('android/app/src/main/java/com/pure/mojiweather/WeatherRefreshScheduler.kt');
const helperSrc12 = read('android/app/src/main/java/com/pure/mojiweather/WeatherWidgetSyncHelper.kt');
const receiverSrc12 = read('android/app/src/main/java/com/pure/mojiweather/WeatherWidgetAutoRefreshReceiver.kt');
const mainAppSrc12 = read('android/app/src/main/java/com/pure/mojiweather/MainApplication.kt');
const moduleSrc12 = read('android/app/src/main/java/com/pure/mojiweather/WeatherWidgetModule.kt');
const gradleSrc12 = read('android/app/build.gradle');

// —— 依赖声明 ——
assert(
  /androidx\.work:work-runtime-ktx:\s*\d/.test(gradleSrc12),
  'build.gradle 声明 androidx.work 依赖（没有它 Worker 无法编译）'
);

// —— Worker 的成败语义 ——
assert(
  /class\s+WeatherRefreshWorker\b[\s\S]*?\bWorker\s*\(/.test(workerSrc),
  'WeatherRefreshWorker 继承 androidx.work.Worker'
);
assert(
  /override\s+fun\s+doWork\(\)\s*:\s*Result/.test(workerSrc),
  'WeatherRefreshWorker 实现 doWork(): Result'
);
assert(
  /WeatherWidgetSyncHelper\.performSync\(/.test(workerSrc),
  'Worker 复用 performSync（与小部件刷新同一套逻辑，避免两套代码漂移）'
);
assert(
  /Result\.retry\(\)/.test(workerSrc),
  'Worker 失败时返回 Result.retry()（交给 WorkManager 指数退避，而不是静默丢弃）'
);

// —— performSync 必须返回成败 ——
assert(
  /fun\s+performSync\([^)]*\)\s*:\s*Boolean/.test(helperSrc12),
  'WeatherWidgetSyncHelper.performSync 返回 Boolean 成败（Worker 需要确定结果）'
);
assert(
  /KEY_SYNC_FAIL_COUNT/.test(helperSrc12) && /KEY_LAST_FAIL_AT/.test(helperSrc12),
  '记录连续失败次数与最近失败时间（界面据此区分「没跑」与「跑了但失败」）'
);
assert(
  /putInt\(KEY_SYNC_FAIL_COUNT,\s*0\)/.test(helperSrc12),
  '同步成功时把失败计数清零（否则退避永远处于惩罚状态）'
);

// —— 调度器 ——
assert(
  /PeriodicWorkRequestBuilder<\s*WeatherRefreshWorker\s*>/.test(schedulerSrc),
  'WeatherRefreshScheduler 使用 PeriodicWorkRequestBuilder 建周期任务'
);
assert(
  /ExistingPeriodicWorkPolicy\.KEEP/.test(schedulerSrc),
  '周期任务用 KEEP 入队（用 UPDATE 会把 30 分钟周期不断重置，等于永远等不到下一次）'
);
assert(
  /OneTimeWorkRequestBuilder<\s*WeatherRefreshWorker\s*>/.test(schedulerSrc),
  'WeatherRefreshScheduler 提供一次性立即刷新任务'
);
assert(
  /NetworkType\.CONNECTED/.test(schedulerSrc),
  '周期任务声明 CONNECTED 网络约束（无网时不空跑、不消耗电量）'
);
assert(
  /enqueueUniqueWork\(\s*ONESHOT_WORK_NAME,\s*ExistingWorkPolicy\.REPLACE/.test(schedulerSrc),
  '一次性任务用 REPLACE 唯一入队（避免用户连点刷新堆积任务）'
);

// —— 三处登记入口：启动、广播、小部件宿主回调 ——
assert(
  /WeatherRefreshScheduler\.enqueuePeriodic\(/.test(mainAppSrc12),
  'MainApplication.onCreate 登记 WorkManager 周期任务（开机/升级后自愈）'
);
assert(
  /WeatherRefreshScheduler\.enqueuePeriodic\(/.test(receiverSrc12)
    && /WeatherRefreshScheduler\.enqueueImmediate\(/.test(receiverSrc12),
  'AutoRefreshReceiver 命中广播时同时登记周期任务与一次性任务'
);
assert(
  !/goAsync\(/.test(receiverSrc12),
  'AutoRefreshReceiver 不再使用 goAsync（10 秒预算会被系统砍断，改由 Worker 执行）'
);

let providerRegCount = 0;
for (const size of ['4x1', '4x2', '4x3']) {
  const p = read(`android/app/src/main/java/com/pure/mojiweather/WeatherWidget${size}Provider.kt`);
  if (/WeatherRefreshScheduler\.enqueuePeriodic\(/.test(p)) providerRegCount += 1;
}
assert(
  providerRegCount === 3,
  '三个小部件 Provider 的 onEnabled/onUpdate 都复查并补登记周期任务'
);

// —— JS 侧健康度展示 ——
const syncHealthSrc = read('src/services/syncHealth.js');
const appJs12 = read('App.js');
assert(
  /export\s+async\s+function\s+readSyncStatus/.test(syncHealthSrc),
  'syncHealth.readSyncStatus 读取原生同步健康度'
);
assert(
  /export\s+async\s+function\s+ensureBackgroundScheduler/.test(syncHealthSrc),
  'syncHealth.ensureBackgroundScheduler 支持用户手动恢复后台调度'
);
assert(
  /export\s+function\s+describeSyncHealth/.test(syncHealthSrc),
  'syncHealth.describeSyncHealth 把失败次数/陈旧时长翻译成提示'
);
assert(
  /fun\s+readSyncStatus\(promise:\s*Promise\)/.test(moduleSrc12),
  'WeatherWidgetModule 暴露 readSyncStatus 原生方法'
);
assert(
  /fun\s+ensureBackgroundScheduler\(promise:\s*Promise\)/.test(moduleSrc12),
  'WeatherWidgetModule 暴露 ensureBackgroundScheduler 原生方法'
);
assert(
  /describeSyncHealth\(/.test(appJs12) && /readSyncStatus\(/.test(appJs12),
  'App.js 每拍读取并解释同步健康度'
);
assert(
  /healthBar/.test(appJs12),
  'App.js 渲染数据陈旧/失败告警条（不再静默显示旧数据）'
);

// ---------------------------------------------------------------
section('13 后台保活体检：把 WorkManager / 电池白名单 / 精确闹钟的真实状态端给用户');
// ---------------------------------------------------------------

assert(
  /fun\s+describePeriodicState\(\s*context:\s*Context\s*\)/.test(schedulerSrc),
  'WeatherRefreshScheduler 提供 describePeriodicState 查询周期任务的真实状态'
);
assert(
  /getWorkInfosForUniqueWork\(\s*PERIODIC_WORK_NAME\s*\)/.test(schedulerSrc),
  '体检读的是唯一周期任务名（否则查不到 ROM 留下的僵尸任务）'
);
assert(
  /WorkInfo\.State\.ENQUEUED/.test(schedulerSrc) && /WorkInfo\.State\.CANCELLED/.test(schedulerSrc),
  '体检区分 ENQUEUED 与 CANCELLED（被清掉 vs 被压着不跑，处置方式完全不同）'
);
assert(
  /fun\s+readBackgroundDiagnostics\(promise:\s*Promise\)/.test(moduleSrc12),
  'WeatherWidgetModule 暴露 readBackgroundDiagnostics 原生方法'
);
assert(
  /isIgnoringBatteryOptimizations\(/.test(moduleSrc12),
  '体检读取 isIgnoringBatteryOptimizations（电池优化白名单是国产 ROM 冻结后台的主因）'
);
assert(
  /canScheduleExactAlarms\(/.test(moduleSrc12),
  '体检读取 canScheduleExactAlarms（Android 12+ 默认不授予精确闹钟）'
);
assert(
  /fun\s+openBatterySettings\(promise:\s*Promise\)/.test(moduleSrc12),
  'WeatherWidgetModule 暴露 openBatterySettings 直达系统电池设置'
);
assert(
  /ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS/.test(moduleSrc12),
  '跳转用系统官方设置页，不申请 REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 敏感权限'
);

assert(
  /export\s+async\s+function\s+readBackgroundDiagnostics/.test(syncHealthSrc),
  'syncHealth.readBackgroundDiagnostics 读取原生体检结果'
);
assert(
  /export\s+function\s+describeBackgroundDiagnosis/.test(syncHealthSrc),
  'syncHealth.describeBackgroundDiagnosis 把体检结果翻译成问题清单'
);
assert(
  /export\s+async\s+function\s+openBatterySettings/.test(syncHealthSrc),
  'syncHealth.openBatterySettings 供界面跳转系统设置'
);
assert(
  /export\s+function\s+parseWorkState/.test(syncHealthSrc),
  'syncHealth.parseWorkState 解析原生状态串'
);
assert(
  /work-missing/.test(syncHealthSrc) && /battery-optimized/.test(syncHealthSrc),
  '问题清单覆盖「任务被清掉」与「仍受电池优化限制」两种主因'
);
assert(
  /exact-alarm-denied/.test(syncHealthSrc),
  '问题清单覆盖「未授予精确闹钟权限」'
);

const healthModalSrc = read('src/components/BackgroundHealthModal.js');
assert(
  /readBackgroundDiagnostics\(/.test(healthModalSrc) && /describeBackgroundDiagnosis\(/.test(healthModalSrc),
  'BackgroundHealthModal 打开时读取并解释体检结果'
);
assert(
  /ensureBackgroundScheduler\(/.test(healthModalSrc),
  '体检面板提供「重新登记」动作'
);
assert(
  /openBatterySettings\(/.test(healthModalSrc),
  '体检面板提供「去电池设置」动作'
);
assert(
  /workState/.test(healthModalSrc) && /batteryOptimizationIgnored/.test(healthModalSrc),
  '体检面板把后台任务状态与电池白名单直接摊开显示'
);
assert(
  /<BackgroundHealthModal/.test(appJs12) && /isHealthModalVisible/.test(appJs12),
  'App.js 挂载体检面板并控制其可见性'
);
assert(
  /setIsHealthModalVisible\(true\)/.test(appJs12),
  '告警条与快捷入口都能打开体检面板'
);

// ---------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------
console.log(`\n${'-'.repeat(60)}`);
if (failures === 0) {
  console.log(`\u2705 全部通过：${checks} 项检查，0 项失败。自动刷新周期统一为 ${EXPECTED_MINUTES} 分钟。`);
  process.exit(0);
} else {
  console.error(`\u274c 失败：${checks} 项检查中有 ${failures} 项未通过。`);
  process.exit(1);
}
