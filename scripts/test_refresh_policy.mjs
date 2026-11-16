/**
 * 刷新策略单元测试（离线，不联网、不需要 APK）
 *
 * 目的：覆盖「关屏一夜后回到前台到底该不该刷新」「原生缓存能不能信」这两类判断。
 * 这些规则是 v1.2.5 修 bug 的核心，必须能被自动化测试盯住，而不是靠手点。
 *
 * 做法与 test_forecast_days.mjs 一致：把 refreshPolicy.js 的 ESM 导出改写后
 * 放进 vm 沙箱加载，测的就是仓库里真实的那份代码。
 *
 * 用法：node scripts/test_refresh_policy.mjs
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

function check(name, condition, detail = '') {
  if (condition) {
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

  const tail = `\nmodule.exports = { ${exportedNames.join(', ')} };\n`;
  vm.createContext(sandbox);
  vm.runInContext(stripped + tail, sandbox, { filename: 'refreshPolicy.js' });
  return { api: sandbox.module.exports, exportedNames };
}

function main() {
  console.log('=== 刷新策略单元测试 ===');
  console.log(`策略文件: ${POLICY_PATH}\n`);

  console.log('[1] 模块可加载');
  let api;
  let exportedNames;
  try {
    ({ api, exportedNames } = loadPolicy());
    check('refreshPolicy.js 可解析并导出', exportedNames.length >= 5, `${exportedNames.length} 个导出`);
    check('导出 shouldRefreshOnForeground', typeof api.shouldRefreshOnForeground === 'function');
    check('导出 parseNativeCache', typeof api.parseNativeCache === 'function');
    check('导出 nativePayloadToWeather', typeof api.nativePayloadToWeather === 'function');
    check('导出 isCacheStale', typeof api.isCacheStale === 'function');
    check('导出 formatSyncAge', typeof api.formatSyncAge === 'function');
    check('STALE_CACHE_FACTOR = 1', api.STALE_CACHE_FACTOR === 1, `实际 ${api.STALE_CACHE_FACTOR}`);
  } catch (err) {
    check('refreshPolicy.js 可解析并导出', false, err.message);
    report();
    return;
  }

  const { shouldRefreshOnForeground, parseNativeCache, nativePayloadToWeather, isCacheStale, formatSyncAge, isDailyCoveringToday, decideForegroundRefresh } = api;

  console.log('\n[2] shouldRefreshOnForeground：前台恢复判定');
  const now = 1_800_000_000_000;

  check(
    '时间戳为 0（从未刷新）→ 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: 0, now, intervalMs: INTERVAL }) === true
  );
  check(
    '时间戳为 null → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: null, now, intervalMs: INTERVAL }) === true
  );
  check(
    '时间戳为 undefined → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: undefined, now, intervalMs: INTERVAL }) === true
  );
  check(
    '时间戳为 NaN → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: NaN, now, intervalMs: INTERVAL }) === true
  );
  check(
    '时间戳为负 → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: -1, now, intervalMs: INTERVAL }) === true
  );
  check(
    'now 非有限 → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now - MINUTE, now: Infinity, intervalMs: INTERVAL }) === true
  );
  check(
    'intervalMs 为 0 → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now - MINUTE, now, intervalMs: 0 }) === true
  );
  check(
    'intervalMs 为负 → 必须刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now - MINUTE, now, intervalMs: -1000 }) === true
  );
  check(
    '刚好 30 分钟 → 刷新（边界取等号）',
    shouldRefreshOnForeground({ lastRefreshAt: now - INTERVAL, now, intervalMs: INTERVAL }) === true
  );
  check(
    '29 分 59 秒 → 不刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now - (INTERVAL - 1000), now, intervalMs: INTERVAL }) === false
  );
  check(
    '1 分钟前刚刷新 → 不刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now - MINUTE, now, intervalMs: INTERVAL }) === false
  );
  check(
    '整夜 9 小时 → 刷新（这就是用户报的问题场景）',
    shouldRefreshOnForeground({ lastRefreshAt: now - 9 * 60 * MINUTE, now, intervalMs: INTERVAL }) === true,
    'elapsed=540 分钟'
  );
  check(
    '系统时间被改到过去（elapsed 为负）→ 刷新',
    shouldRefreshOnForeground({ lastRefreshAt: now + 60 * MINUTE, now, intervalMs: INTERVAL }) === true
  );
  check(
    '省略 now 时使用当前时间且不抛异常',
    typeof shouldRefreshOnForeground({ lastRefreshAt: Date.now() - 31 * MINUTE, intervalMs: INTERVAL }) === 'boolean'
  );

  console.log('\n[3] isCacheStale / formatSyncAge');
  check('恰好 30 分钟 → 视为过期', isCacheStale(now - INTERVAL, INTERVAL, now) === true);
  check('10 分钟 → 未过期', isCacheStale(now - 10 * MINUTE, INTERVAL, now) === false);
  check('时间戳无效 → 视为过期', isCacheStale(0, INTERVAL, now) === true);
  check('30 秒前 → 「刚刚」', formatSyncAge(now - 30 * 1000, now) === '刚刚', formatSyncAge(now - 30 * 1000, now));
  check('5 分钟前 → 「5 分钟前」', formatSyncAge(now - 5 * MINUTE, now) === '5 分钟前', formatSyncAge(now - 5 * MINUTE, now));
  check(
    '90 分钟前 → 「1 小时 30 分钟前」',
    formatSyncAge(now - 90 * MINUTE, now) === '1 小时 30 分钟前',
    formatSyncAge(now - 90 * MINUTE, now)
  );
  check('整 2 小时前 → 「2 小时前」', formatSyncAge(now - 120 * MINUTE, now) === '2 小时前', formatSyncAge(now - 120 * MINUTE, now));
  check('2 天前 → 「2 天前」', formatSyncAge(now - 2 * 24 * 60 * MINUTE, now) === '2 天前', formatSyncAge(now - 2 * 24 * 60 * MINUTE, now));
  check('无效时间戳 → 「时间未知」', formatSyncAge(0, now) === '时间未知', formatSyncAge(0, now));

  console.log('\n[4] parseNativeCache：防御式解析原生缓存');
  const goodPayload = {
    city: '南昌',
    temp: 18,
    weatherDesc: '多云',
    weatherType: 'cloudy',
    maxTemp: 22,
    minTemp: 14,
    rainProb: 20,
    aqi: 55,
    aqiLevel: '良',
    updateTime: '08:30',
    forecast7d: [{ title: '今天', date: '11/16', desc: '多云', type: 'cloudy', maxTemp: 22, minTemp: 14 }],
    hourly24: [{ time: '现在', desc: '多云', type: 'cloudy', temp: 18, rainProb: 20 }],
  };
  const goodRaw = { data: JSON.stringify(goodPayload), lastSyncAt: now - 5 * MINUTE };
  const parsedGood = parseNativeCache(goodRaw, now);
  check('正常缓存可解析', Boolean(parsedGood));
  check('解析出 payload.temp = 18', parsedGood && parsedGood.payload.temp === 18);
  check('解析出 lastSyncAt', parsedGood && parsedGood.lastSyncAt === now - 5 * MINUTE);
  check('解析出 ageMinutes = 5', parsedGood && parsedGood.ageMinutes === 5, parsedGood ? `实际 ${parsedGood.ageMinutes}` : 'N/A');

  check('raw 为 null → null', parseNativeCache(null, now) === null);
  check('raw 为字符串 → null', parseNativeCache('{}', now) === null);
  check('lastSyncAt 缺失 → null', parseNativeCache({ data: JSON.stringify(goodPayload) }, now) === null);
  check('lastSyncAt 为 0 → null', parseNativeCache({ data: JSON.stringify(goodPayload), lastSyncAt: 0 }, now) === null);
  check(
    'lastSyncAt 未来 10 分钟 → null（拒绝脏数据）',
    parseNativeCache({ data: JSON.stringify(goodPayload), lastSyncAt: now + 10 * MINUTE }, now) === null
  );
  check(
    'lastSyncAt 未来 2 分钟 → 仍接受（容忍时钟抖动）',
    Boolean(parseNativeCache({ data: JSON.stringify(goodPayload), lastSyncAt: now + 2 * MINUTE }, now))
  );
  check('data 为空字符串 → null', parseNativeCache({ data: '', lastSyncAt: now }, now) === null);
  check('data 不是字符串 → null', parseNativeCache({ data: 123, lastSyncAt: now }, now) === null);
  check('data 非法 JSON → null', parseNativeCache({ data: '{bad json', lastSyncAt: now }, now) === null);
  check('data 是 JSON 数组 → null', parseNativeCache({ data: '[]', lastSyncAt: now }, now) === null);
  check(
    '缺少 temp → null',
    parseNativeCache({ data: JSON.stringify({ updateTime: '08:30' }), lastSyncAt: now }, now) === null
  );
  check(
    '缺少 updateTime → null',
    parseNativeCache({ data: JSON.stringify({ temp: 18 }), lastSyncAt: now }, now) === null
  );
  check(
    'temp 为字符串 → null（类型必须正确）',
    parseNativeCache({ data: JSON.stringify({ temp: '18', updateTime: '08:30' }), lastSyncAt: now }, now) === null
  );

  console.log('\n[5] nativePayloadToWeather：缓存合并');
  const minimal = nativePayloadToWeather(goodPayload, null);
  check('无旧数据时也能拼出可展示结构', Boolean(minimal && minimal.current));
  check('current.temp 来自缓存', minimal.current.temp === 18, `实际 ${minimal.current.temp}`);
  check('current.updateTime 来自缓存', minimal.current.updateTime === '08:30', minimal.current.updateTime);
  check('current.weather.label 来自缓存', minimal.current.weather.label === '多云', minimal.current.weather.label);
  check('current.weather.type 来自缓存', minimal.current.weather.type === 'cloudy');
  check('current.weather.icon 映射为 Ionicons 名', minimal.current.weather.icon === 'cloudy', minimal.current.weather.icon);
  check('标记 fromCache = true', minimal.current.fromCache === true);
  check('today.maxTemp 来自缓存', minimal.today.maxTemp === 22);
  check('aqi.aqi 来自缓存', minimal.aqi.aqi === 55);
  check('aqi.level 来自缓存', minimal.aqi.level === '良', minimal.aqi.level);
  check('无旧数据时用缓存 7 天兜底', minimal.daily.length === 1, `${minimal.daily.length} 天`);
  check('无旧数据时用缓存 24 小时兜底', minimal.hourly.length === 1, `${minimal.hourly.length} 条`);
  check('daily 项标记 fromCache', minimal.daily[0].fromCache === true);

  // 有完整旧数据时，绝对不能被缓存里的 7 天/24 小时降级覆盖
  const prev30 = Array.from({ length: 30 }, (_, i) => ({
    dateStr: `2026-11-${String(i + 1).padStart(2, '0')}`,
    dayName: i === 0 ? '今天' : `第 ${i + 1} 天`,
    maxTemp: 20,
    minTemp: 10,
    weather: { label: '晴', type: 'sunny', icon: 'sunny' },
    rainProb: 0,
    uvMax: 3,
    isExtended: i >= 16,
  }));
  const prevFull = {
    current: { temp: 15, humidity: 60, weather: { label: '晴', type: 'sunny', icon: 'sunny' }, rainProb: 0, isDay: true, updateTime: '07:00' },
    today: { maxTemp: 21, minTemp: 11, rainProb: 0 },
    hourly: Array.from({ length: 24 }, (_, i) => ({ displayTime: `${i}:00`, temp: 15 })),
    daily: prev30,
    aqi: { aqi: 40, level: '优' },
    livingIndices: [{ name: '穿衣' }],
    shortTermRain: { text: '未来两小时无降水' },
  };
  const merged = nativePayloadToWeather(goodPayload, prevFull);
  check('合并后 current.temp 用新缓存覆盖', merged.current.temp === 18);
  check('合并后仍是 30 天预报（不被缓存降级成 7 天）', merged.daily.length === 30, `${merged.daily.length} 天`);
  check('合并后仍是 24 小时逐时', merged.hourly.length === 24, `${merged.hourly.length} 条`);
  check('生活指数等富字段被保留', Array.isArray(merged.livingIndices) && merged.livingIndices.length === 1);
  check('短时降水文案被保留', merged.shortTermRain && merged.shortTermRain.text === '未来两小时无降水');
  check('current.humidity 沿用旧值', merged.current.humidity === 60, String(merged.current.humidity));
  check('aqi.level 用新缓存覆盖', merged.aqi.level === '良');

  check('payload 为 null 且无旧数据 → null', nativePayloadToWeather(null, null) === null);
  check('payload 为 null 但有旧数据 → 返回旧数据', nativePayloadToWeather(null, prevFull) === prevFull);

  console.log('\n[5b] 原生缓存里的展示文案反解（湿度 / 风力）');
  const withDetails = {
    ...goodPayload,
    humidityInfo: '湿度 68%',
    windInfo: '东北风 3级',
  };
  const parsedDetails = nativePayloadToWeather(withDetails, null);
  check('湿度文案反解为数值 68', parsedDetails.current.humidity === 68, String(parsedDetails.current.humidity));
  check('风向反解「东北风」', parsedDetails.current.windDirection === '东北风', String(parsedDetails.current.windDirection));
  check(
    '风力反解为 { text: "3级", level: 3 }',
    parsedDetails.current.windScale && parsedDetails.current.windScale.text === '3级' && parsedDetails.current.windScale.level === 3,
    JSON.stringify(parsedDetails.current.windScale)
  );

  const windWithSpeed = nativePayloadToWeather({ ...goodPayload, windInfo: '西南风 4级 22km/h' }, null);
  check('带风速的风力文案解析出 windSpeed=22', windWithSpeed.current.windSpeed === 22, String(windWithSpeed.current.windSpeed));

  const badDetails = nativePayloadToWeather({ ...goodPayload, humidityInfo: '湿度 --', windInfo: '' }, null);
  check('湿度文案无法解析时为 null', badDetails.current.humidity === null, String(badDetails.current.humidity));
  check('风力文案为空时为 null', badDetails.current.windDirection === null && badDetails.current.windScale === null);

  const keepPrev = nativePayloadToWeather(
    { ...goodPayload, humidityInfo: '湿度 abc%' },
    { current: { humidity: 55, windDirection: '北风', windScale: { text: '2级', level: 2 }, windSpeed: 8 }, today: {}, aqi: {} }
  );
  check('文案不可解时沿用旧湿度', keepPrev.current.humidity === 55, String(keepPrev.current.humidity));
  check('文案不可解时沿用旧风向', keepPrev.current.windDirection === '北风', String(keepPrev.current.windDirection));
  check('文案不可解时沿用旧风速', keepPrev.current.windSpeed === 8, String(keepPrev.current.windSpeed));

  console.log('\n[5c] isDailyCoveringToday：跨夜列表是否还覆盖今天');
  const refDay = new Date(2026, 10, 16, 8, 30, 0); // 2026-11-16 08:30 本地时间
  check(
    '首日 == 今天 → 覆盖正常',
    isDailyCoveringToday([{ dateStr: '2026-11-16' }], refDay) === true
  );
  check(
    '首日 == 昨天（整夜待机跨天）→ 需要重拉',
    isDailyCoveringToday([{ dateStr: '2026-11-15' }], refDay) === false
  );
  check(
    '首日 == 明年的同月同日 → 不算覆盖（不能只比月日）',
    isDailyCoveringToday([{ dateStr: '2025-11-16' }], refDay) === false
  );
  check(
    '空数组 → 需要重拉',
    isDailyCoveringToday([], refDay) === false
  );
  check(
    'null / undefined → 需要重拉',
    isDailyCoveringToday(null, refDay) === false && isDailyCoveringToday(undefined, refDay) === false
  );
  check(
    '非数组（脏数据）→ 需要重拉',
    isDailyCoveringToday({ dateStr: '2026-11-16' }, refDay) === false
  );
  check(
    '首项无 dateStr（原生精简结构）→ 视为可用，避免无脑联网',
    isDailyCoveringToday([{ dayName: '今天' }], refDay) === true
  );
  check(
    'today 传非法日期 → 视为可用（不阻断刷新链）',
    isDailyCoveringToday([{ dateStr: '2026-11-15' }], new Date('invalid')) === true
  );
  check(
    '个位月份/日期补零对齐（2026-01-05）',
    isDailyCoveringToday([{ dateStr: '2026-01-05' }], new Date(2026, 0, 5, 23, 0, 0)) === true
  );
  check(
    '跨年夜：12-31 的列表在 01-01 不覆盖今天',
    isDailyCoveringToday([{ dateStr: '2026-12-31' }], new Date(2027, 0, 1, 7, 0, 0)) === false
  );

  console.log('\n[5d] decideForegroundRefresh：时间判据 + 跨夜判据的合并决策');
  const TODAY_STR = '2026-11-16';
  const dailyToday = [{ dateStr: TODAY_STR }, { dateStr: '2026-11-17' }];
  const dailyYesterday = [{ dateStr: '2026-11-15' }, { dateStr: TODAY_STR }];

  const freshButCrossed = decideForegroundRefresh({
    lastRefreshAt: refDay.getTime() - 4 * MINUTE,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: dailyYesterday,
  });
  check(
    '缓存 4 分钟前刚同步，但列表停在昨天 → 仍要刷新',
    freshButCrossed.shouldRefresh === true && freshButCrossed.reason === 'cross-midnight',
    JSON.stringify(freshButCrossed)
  );
  check(
    '上述场景 timeExpired 为 false（说明确实是被跨夜判据救下来的）',
    freshButCrossed.timeExpired === false && freshButCrossed.dailyCrossedMidnight === true
  );

  const staleAndCovering = decideForegroundRefresh({
    lastRefreshAt: refDay.getTime() - 45 * MINUTE,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: dailyToday,
  });
  check(
    '缓存 45 分钟前，列表覆盖今天 → 要刷新（reason=interval）',
    staleAndCovering.shouldRefresh === true && staleAndCovering.reason === 'interval',
    JSON.stringify(staleAndCovering)
  );

  const freshAndCovering = decideForegroundRefresh({
    lastRefreshAt: refDay.getTime() - 5 * MINUTE,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: dailyToday,
  });
  check(
    '缓存新鲜且列表覆盖今天 → 不刷新（省流量）',
    freshAndCovering.shouldRefresh === false && freshAndCovering.reason === null,
    JSON.stringify(freshAndCovering)
  );

  const bothBad = decideForegroundRefresh({
    lastRefreshAt: 0,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: dailyYesterday,
  });
  check(
    '从未刷新过且列表停在昨天 → reason=both',
    bothBad.shouldRefresh === true && bothBad.reason === 'both',
    JSON.stringify(bothBad)
  );

  const noDaily = decideForegroundRefresh({
    lastRefreshAt: refDay.getTime() - 5 * MINUTE,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: null,
  });
  check(
    '没有列表数据（首次冷启动）→ 视为跨夜要刷新',
    noDaily.shouldRefresh === true && noDaily.dailyCrossedMidnight === true,
    JSON.stringify(noDaily)
  );

  const timeTravel = decideForegroundRefresh({
    lastRefreshAt: refDay.getTime() + 60 * MINUTE,
    now: refDay.getTime(),
    intervalMs: INTERVAL,
    daily: dailyToday,
  });
  check(
    '时间戳在未来（系统时间被改）→ 强制刷新',
    timeTravel.shouldRefresh === true && timeTravel.reason === 'interval',
    JSON.stringify(timeTravel)
  );
  check(
    '决策结果带 ageMinutes 便于日志排查',
    typeof freshAndCovering.ageMinutes === 'number' && freshAndCovering.ageMinutes === 5,
    String(freshAndCovering.ageMinutes)
  );

  console.log('\n[6] 与 App.js 的接线一致性');
  const appSrc = fs.readFileSync(path.join(ROOT, 'App.js'), 'utf8');
  check('App.js 从 refreshPolicy 导入 parseNativeCache', /import\s*\{[^}]*parseNativeCache/.test(appSrc));
  check('App.js 从 refreshPolicy 导入 nativePayloadToWeather', /import\s*\{[^}]*nativePayloadToWeather/.test(appSrc));
  check(
    'refreshPolicy 内部用 shouldRefreshOnForeground 作时间判据（单一来源，不各写一份）',
    /export function decideForegroundRefresh[\s\S]{0,400}?shouldRefreshOnForeground\(/.test(
      fs.readFileSync(POLICY_PATH, 'utf8')
    )
  );
  check('App.js 调用 parseNativeCache', /parseNativeCache\(/.test(appSrc));
  check('App.js 调用 nativePayloadToWeather', /nativePayloadToWeather\(/.test(appSrc));
  check('App.js 前台恢复先补缓存再刷新', /hydrateFromCache\([^)]*\)\.finally\(/.test(appSrc));
  check('App.js 走原生缓存优先', /readCachedWeather/.test(appSrc));

  // 顺序很关键：先拿 AsyncStorage 完整快照当底座，再用原生精简缓存覆盖新鲜值。
  // 反过来（先原生后快照）会把 30 天预报覆盖成 7 天，等于倒退。
  const snapshotIdx = appSrc.indexOf('STORAGE_LAST_WEATHER_KEY');
  const nativeReadIdx = appSrc.indexOf('readCachedWeather');
  check(
    'App.js 先读完整快照、再读原生缓存（顺序不能反）',
    snapshotIdx !== -1 && nativeReadIdx !== -1 && snapshotIdx < nativeReadIdx,
    `snapshot@${snapshotIdx} native@${nativeReadIdx}`
  );
  check(
    '原生缓存以快照为 base 合并（不丢 30 天预报）',
    /nativePayloadToWeather\(parsed\.payload,\s*base\)/.test(appSrc)
  );
  check('原生缓存与当前城市不一致时跳过（防串城市）', /cityMatches/.test(appSrc));
  check('loadWeather 成功后落完整快照', /STORAGE_LAST_WEATHER_KEY,[\s\S]{0,120}savedAt/.test(appSrc));
  check(
    '快照带 cityId 用于防串城市',
    /cityId:\s*city\.id/.test(appSrc)
  );

  // 跨夜保护：只靠「时间戳超过 30 分钟」是不够的 —— 原生后台可能 5 分钟前刚刷过缓存，
  // 时间戳很新，但逐日列表还是昨晚落的那份，第一行会写「今天」加昨天的日期。
  check('App.js 从 refreshPolicy 导入 decideForegroundRefresh', /import\s*\{[^}]*decideForegroundRefresh/.test(appSrc));
  check('App.js 调用 decideForegroundRefresh', /decideForegroundRefresh\(/.test(appSrc));
  check(
    '合并判据把 daily 一起传进去（不能只传时间戳）',
    /decideForegroundRefresh\(\{[\s\S]{0,400}?daily:/.test(appSrc)
  );
  check(
    'timeExpired 与跨夜都会触发刷新',
    /if\s*\(\s*!decision\.shouldRefresh\s*\)\s*return;/.test(appSrc)
  );
  check(
    '用 weatherDataRef 读取最新 daily（避免闭包拿到旧 state）',
    /weatherDataRef\.current\s*=\s*weatherData/.test(appSrc) && /weatherDataRef\.current\.daily/.test(appSrc)
  );

  report();
}

function report() {
  console.log(`\n${'-'.repeat(60)}`);
  if (failures.length === 0) {
    console.log(`✅ 全部通过：${pass} 项检查，0 项失败。`);
    process.exit(0);
  } else {
    console.error(`❌ 失败：${pass + failures.length} 项检查中有 ${failures.length} 项未通过。`);
    failures.forEach((f) => console.error(`   - ${f}`));
    process.exit(1);
  }
}

main();
