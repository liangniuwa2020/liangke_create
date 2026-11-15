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

// 定时器必须使用常量，且依赖数组里不能出现 currentCity（历史 bug 根因）
const intervalBlockMatch = appJs.match(/const timer = setInterval\([\s\S]*?\},\s*([A-Za-z_$][\w$]*)\);/);
assert(Boolean(intervalBlockMatch), '存在 setInterval 自动刷新定时器');
if (intervalBlockMatch) {
  assert(
    intervalBlockMatch[1] === 'AUTO_REFRESH_INTERVAL_MS',
    'setInterval 使用 AUTO_REFRESH_INTERVAL_MS 而非硬编码',
    `实际：${intervalBlockMatch[1]}`
  );
}

const autoRefreshEffectMatch = appJs.match(
  /\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*useEffect\(\(\) => \{\s*console\.log\(`\[AutoRefresh\][\s\S]*?\}, (\[[^\]]*\])\);/
);
assert(Boolean(autoRefreshEffectMatch), '定位到自动刷新 useEffect 的依赖数组');
if (autoRefreshEffectMatch) {
  const deps = autoRefreshEffectMatch[1];
  assert(
    !/currentCity/.test(deps),
    '自动刷新 useEffect 依赖中不含 currentCity（防止定时器被反复重建）',
    `依赖：${deps}`
  );
  assert(
    /handleRefresh/.test(deps),
    '自动刷新 useEffect 依赖 handleRefresh',
    `依赖：${deps}`
  );
}

// AppState 前台恢复阈值也必须用同一常量
assert(
  /elapsed\s*>=\s*AUTO_REFRESH_INTERVAL_MS/.test(appJs),
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

assert(
  new RegExp(`v${version.replace(/\./g, '\\.')}`).test(aboutModal),
  `AboutCleanModal 版本号与 package.json 一致 (v${version})`
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
