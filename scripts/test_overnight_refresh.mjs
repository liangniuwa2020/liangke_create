/**
 * 「关屏过夜」端到端功能测试（离线，不联网，不需要 APK）
 *
 * 用户反馈（v1.2.5 修的就是这个）：
 *   「关屏以后，不会自动刷新数据，睡觉以后，起来时间和数据还是昨天的。」
 *
 * 这条链路由三段拼起来，任何一段断了用户就会看到昨天的数据：
 *   ① 原生侧：息屏后按 30 分钟闹钟抓数据 + 落缓存 + 记同步时间戳；
 *   ② JS 侧：回前台先把缓存补水到界面（AsyncStorage 完整快照 + 原生新鲜值）；
 *   ③ 决策侧：判断到底还需不需要联网重拉（时间过期？逐日列表跨夜？）。
 *
 * 本测试用一份「23:00 最后完整刷新 → 整夜 16 次原生后台刷新 → 08:00 用户睁眼」
 * 的完整时间线，把 ②③ 跑成真实函数调用，并核对 ① 的产物（缓存结构）能被正确消费。
 *
 * 用法：node scripts/test_overnight_refresh.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POLICY_PATH = path.join(ROOT, 'src', 'services', 'refreshPolicy.js');

const MINUTE = 60 * 1000;
const INTERVAL = 30 * MINUTE;

let pass = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  [OK]   ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function loadPolicy() {
  const source = fs.readFileSync(POLICY_PATH, 'utf8');
  const stripped = source
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s+let\s+/gm, 'let ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+\{[^}]*\}\s*;?$/gm, '');

  const exportedNames = [];
  const re = /^export\s+(?:const|let|async\s+function|function)\s+([A-Za-z0-9_$]+)/gm;
  let m;
  while ((m = re.exec(source)) !== null) exportedNames.push(m[1]);

  const sandbox = {
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Promise,
    Error,
    isNaN,
    parseInt,
    parseFloat,
    module: { exports: {} },
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(stripped + `\nmodule.exports = { ${exportedNames.join(', ')} };\n`, sandbox, {
    filename: 'refreshPolicy.js',
  });
  return sandbox.module.exports;
}

/** 造一份「23:00 最后一次完整刷新」留下的 30 天快照 */
function makeSnapshot({ baseTime, todayStr = '2026-11-15' }) {
  const daily = [];
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(baseTime);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    daily.push({
      dateStr: `${y}-${mo}-${da}`,
      dayName: i === 0 ? '今天' : i === 1 ? '明天' : `第${i + 1}天`,
      monthDay: `${mo}/${da}`,
      maxTemp: 20 - i * 0.1,
      minTemp: 10 - i * 0.1,
      weather: { label: '多云', type: 'cloudy', icon: 'cloudy' },
      rainProb: 10,
      uvMax: 3,
      sunrise: '06:40',
      sunset: '17:30',
      isExtended: i >= 16,
    });
  }
  return {
    current: {
      temp: 18,
      humidity: 60,
      weather: { label: '多云', type: 'cloudy', icon: 'cloudy' },
      rainProb: 10,
      isDay: false,
      windDirection: '东北风',
      windScale: { text: '2级', level: 2 },
      windSpeed: 9,
      updateTime: '23:00',
    },
    today: { maxTemp: 20, minTemp: 10, rainProb: 10 },
    hourly: Array.from({ length: 24 }, (_, i) => ({
      displayTime: i === 0 ? '现在' : `${String(i).padStart(2, '0')}:00`,
      temp: 18 - i * 0.1,
      rainProb: 5,
      weather: { label: '多云', type: 'cloudy', icon: 'cloudy' },
    })),
    daily,
    aqi: { aqi: 42, level: '优' },
    livingIndices: [{ name: '舒适度', value: '较舒适' }],
    shortTermRain: { hasRain: false, text: '未来两小时无降水' },
    _snapshotDayStr: todayStr,
  };
}

/** 造原生侧最后一次（07:55）后台抓取写进 SharedPreferences 的 payload */
function makeNativePayload() {
  return {
    city: '南昌',
    temp: 9,
    maxTemp: 12,
    minTemp: 6,
    weatherDesc: '晴',
    weatherType: 'sunny',
    rainProb: 0,
    aqi: 55,
    aqiLevel: '良',
    airDesc: '空气良',
    windInfo: '北风 3级 14km/h',
    humidityInfo: '湿度 71%',
    updateTime: '07:55',
    forecast7d: Array.from({ length: 7 }, (_, i) => ({
      title: i === 0 ? '今天' : `第${i + 1}天`,
      date: `11/${16 + i}`,
      desc: '晴',
      type: 'sunny',
      maxTemp: 12 + i,
      minTemp: 6 + i,
    })),
    hourly24: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      temp: 9 + i * 0.2,
      desc: '晴',
      type: 'sunny',
      rainProb: 0,
    })),
  };
}

function main() {
  console.log('=== 关屏过夜刷新端到端测试 ===\n');

  const api = loadPolicy();
  const {
    decideForegroundRefresh,
    isDailyCoveringToday,
    parseNativeCache,
    nativePayloadToWeather,
    formatSyncAge,
  } = api;

  console.log('[1] 构造时间线：23:00 最后完整刷新 → 整夜 16 次原生刷新 → 08:00 睁眼');
  // 用本地时间构造，避免时区把跨夜判断挪动一天
  const nightStart = new Date(2026, 10, 15, 23, 0, 0).getTime(); // 2026-11-15 23:00
  const morningNow = new Date(2026, 10, 16, 8, 0, 0).getTime(); // 2026-11-16 08:00
  const lastNativeSync = morningNow - 5 * MINUTE; // 07:55 最后一次原生抓取

  const snapshot = makeSnapshot({ baseTime: nightStart });
  check('快照 30 天', snapshot.daily.length === 30, `${snapshot.daily.length} 条`);
  check('快照首日是 11-15（昨晚）', snapshot.daily[0].dateStr === '2026-11-15', snapshot.daily[0].dateStr);

  // 整夜原生刷新次数：23:30 起每 30 分钟一次，到 07:30 共 16 次；07:55 由亮屏广播补一次
  const overnightSyncs = [];
  for (let t = nightStart + INTERVAL; t <= morningNow - 5 * MINUTE; t += INTERVAL) {
    overnightSyncs.push(t);
  }
  check('整夜原生侧刷新 ≥15 次', overnightSyncs.length >= 15, `${overnightSyncs.length} 次`);
  check(
    '每次间隔都是 30 分钟（不是一次性闹钟断链）',
    overnightSyncs.every((t, i) => i === 0 || t - overnightSyncs[i - 1] === INTERVAL)
  );

  console.log('\n[2] 回前台第一步：读原生缓存');
  const rawCache = { data: JSON.stringify(makeNativePayload()), lastSyncAt: lastNativeSync };
  const parsed = parseNativeCache(rawCache, morningNow);
  check('原生缓存解析成功', parsed !== null);
  check('缓存年龄 5 分钟', parsed && parsed.ageMinutes === 5, parsed && String(parsed.ageMinutes));
  check(
    '缓存时间文案正确',
    formatSyncAge(lastNativeSync, morningNow) === '5 分钟前',
    formatSyncAge(lastNativeSync, morningNow)
  );
  check(
    '缓存温度已更新为早晨的 9 度（不是昨晚的 18 度）',
    parsed.payload.temp === 9,
    String(parsed.payload.temp)
  );

  console.log('\n[3] 回前台第二步：快照 + 原生缓存合并上屏');
  const merged = nativePayloadToWeather(parsed.payload, snapshot);
  check('合并后当前温度取原生新鲜值 9 度', merged.current.temp === 9, String(merged.current.temp));
  check('合并后更新时间取原生 07:55', merged.current.updateTime === '07:55', merged.current.updateTime);
  check('合并后 AQI 取原生 55', merged.aqi.aqi === 55, String(merged.aqi.aqi));
  check(
    '合并后湿度从「湿度 71%」反解为 71',
    merged.current.humidity === 71,
    String(merged.current.humidity)
  );
  check(
    '合并后风力从「北风 3级 14km/h」反解',
    merged.current.windDirection === '北风' &&
      merged.current.windScale.level === 3 &&
      merged.current.windSpeed === 14,
    `${merged.current.windDirection} ${merged.current.windScale.text} ${merged.current.windSpeed}km/h`
  );
  check(
    '关键：30 天预报没有被原生 7 天缓存降级',
    merged.daily.length === 30,
    `实际 ${merged.daily.length} 条`
  );
  check('生活指数保留', Array.isArray(merged.livingIndices) && merged.livingIndices.length === 1);
  check('短时降水保留', merged.shortTermRain && merged.shortTermRain.hasRain === false);

  console.log('\n[4] 回前台第三步：判断还需不需要联网重拉');
  const decision = decideForegroundRefresh({
    lastRefreshAt: lastNativeSync, // 原生 07:55 刚同步过，时间戳很新
    now: morningNow,
    intervalMs: INTERVAL,
    daily: merged.daily,
  });
  check('时间判据认为「刚刷过，不用刷」', decision.timeExpired === false);
  check('但逐日列表首日还是 11-15 → 判定跨夜', decision.dailyCrossedMidnight === true);
  check('最终结论仍是必须刷新', decision.shouldRefresh === true);
  check('刷新原因标记为 cross-midnight', decision.reason === 'cross-midnight', decision.reason);
  check(
    '这正是旧版本会漏掉的场景：只按时间戳判断的话，界面会停在「今天 = 11-15」',
    isDailyCoveringToday(merged.daily, new Date(morningNow)) === false
  );

  console.log('\n[5] 联网重拉之后，跨夜标记应当消失');
  const refreshed = makeSnapshot({ baseTime: morningNow });
  check('重拉后首日变成 11-16', refreshed.daily[0].dateStr === '2026-11-16', refreshed.daily[0].dateStr);
  const afterDecision = decideForegroundRefresh({
    lastRefreshAt: morningNow,
    now: morningNow,
    intervalMs: INTERVAL,
    daily: refreshed.daily,
  });
  check('重拉后不再需要刷新', afterDecision.shouldRefresh === false, JSON.stringify(afterDecision));
  check('此时才允许「省流量」地跳过', afterDecision.reason === null);

  console.log('\n[6] 边界：缓存时间戳是未来值（用户手动改过系统时间）');
  const futureCache = parseNativeCache(
    { data: JSON.stringify(makeNativePayload()), lastSyncAt: morningNow + 10 * MINUTE },
    morningNow
  );
  check('未来 10 分钟的缓存被拒绝（不可信）', futureCache === null);
  const futureDecision = decideForegroundRefresh({
    lastRefreshAt: morningNow + 10 * MINUTE,
    now: morningNow,
    intervalMs: INTERVAL,
    daily: refreshed.daily,
  });
  check('对应的时间判据也会强制刷新', futureDecision.shouldRefresh === true, futureDecision.reason);

  console.log('\n[7] 原生侧接线：息屏刷新链路的三个必要产物都在源码里');
  const helper = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherWidgetSyncHelper.kt'),
    'utf8'
  );
  const receiver = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherWidgetAutoRefreshReceiver.kt'),
    'utf8'
  );
  const module = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherWidgetModule.kt'),
    'utf8'
  );
  check('原生用 setInexactRepeating 兜底（进程被杀也能自愈）', /setInexactRepeating/.test(helper));
  check('原生缓存写入同步时间戳', /putLong\(KEY_LAST_SYNC_AT/.test(helper));
  check('原生提供 readCachedWeather 给 JS 读', /fun readCachedWeather\(/.test(helper));
  check('JS 侧桥接暴露 readCachedWeather', /fun readCachedWeather\(promise: Promise\)/.test(module));
  check(
    'Receiver 先排下次闹钟再抓数据',
    receiver.indexOf('scheduleAutoRefresh(appContext)') < receiver.indexOf('fetchWeatherInBackground') &&
      receiver.indexOf('scheduleAutoRefresh(appContext)') !== -1
  );
  check('Receiver 覆盖亮屏广播', /ACTION_SCREEN_ON/.test(receiver));
  check('Receiver 覆盖直接启动完成', /ACTION_LOCKED_BOOT_COMPLETED/.test(receiver));

  report();
}

function report() {
  console.log(`\n${'-'.repeat(60)}`);
  if (failures.length === 0) {
    console.log(`ALL TESTS PASSED — ${pass} 项检查全部通过`);
    process.exit(0);
  }
  console.log(`FAILED — ${failures.length} 项失败 / ${pass} 项通过`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}

main();
