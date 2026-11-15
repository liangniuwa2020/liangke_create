/**
 * 逐日预报天数功能测试（真实网络请求，不需要 APK、不需要 React Native 运行时）
 *
 * 目的：验证「15 天全部显示 + 30 天预报」这条功能真的可用，而不是只看代码。
 * 做法：把 src/services/weatherService.js 的 ESM 导出改写成 CJS 后加载，
 *       然后对多个城市真实调用 Open-Meteo，检查返回的 daily 条数、字段完整性。
 *
 * 用法：
 *   node scripts/test_forecast_days.mjs
 *   node scripts/test_forecast_days.mjs --city 28.68,115.86 --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVICE_PATH = path.join(ROOT, 'src', 'services', 'weatherService.js');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const cityArgIndex = args.indexOf('--city');
const customCity = cityArgIndex >= 0 ? args[cityArgIndex + 1] : null;

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

/**
 * 把 ESM 版 weatherService.js 载入成可调用的函数集合。
 * 只做语法层面的 export 剥离，不改动任何业务逻辑，
 * 这样测的就是仓库里真实的那份代码。
 */
function loadWeatherService() {
  const source = fs.readFileSync(SERVICE_PATH, 'utf8');
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
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
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
  vm.runInContext(stripped + tail, sandbox, { filename: 'weatherService.js' });
  return { api: sandbox.module.exports, exportedNames };
}

const CITIES = customCity
  ? [{ name: '自定义', latitude: Number(customCity.split(',')[0]), longitude: Number(customCity.split(',')[1]) }]
  : [
      { name: '南昌', latitude: 28.6829, longitude: 115.8906 },
      { name: '北京', latitude: 39.9042, longitude: 116.4074 },
      { name: '漠河', latitude: 52.9704, longitude: 122.5388 },
      { name: '三亚', latitude: 18.2528, longitude: 109.5119 },
    ];

async function main() {
  console.log('=== 逐日预报天数功能测试 ===');
  console.log(`服务文件: ${SERVICE_PATH}\n`);

  console.log('[1] 模块可加载性');
  let api;
  let exportedNames;
  try {
    ({ api, exportedNames } = loadWeatherService());
    check('weatherService.js 可被解析并导出', exportedNames.length > 0, `${exportedNames.length} 个导出`);
    check('导出 FORECAST_NEAR_DAYS = 16', api.FORECAST_NEAR_DAYS === 16, `实际 ${api.FORECAST_NEAR_DAYS}`);
    check('导出 FORECAST_TOTAL_DAYS = 30', api.FORECAST_TOTAL_DAYS === 30, `实际 ${api.FORECAST_TOTAL_DAYS}`);
    check('导出 fetchCompleteWeather', typeof api.fetchCompleteWeather === 'function');
  } catch (err) {
    check('weatherService.js 可被解析并导出', false, err.message);
    report();
    return;
  }

  console.log('\n[2] 源码不再写死 7-15 天文案');
  const cardSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'DailyForecastCard.js'), 'utf8');
  check('DailyForecastCard 不再出现「7-15天趋势预报」', !/7-15天趋势预报/.test(cardSrc));
  check('DailyForecastCard 使用天数动态标题', /\{daily\.length\}\s*天天气预报/.test(cardSrc));
  check('DailyForecastCard 对季节趋势段有分组提示', /季节趋势预报/.test(cardSrc));
  check('DailyForecastCard 渲染全部 daily 项（无 slice 截断）', !/daily\.slice\(/.test(cardSrc));

  const svcSrc = fs.readFileSync(SERVICE_PATH, 'utf8');
  check('forecast 请求显式传 forecast_days', /forecast_days=\$\{FORECAST_NEAR_DAYS\}/.test(svcSrc));
  check('seasonal 请求显式传 forecast_days', /seasonal-api\.open-meteo\.com[\s\S]{0,400}forecast_days=\$\{FORECAST_TOTAL_DAYS\}/.test(svcSrc));
  check('seasonal 请求允许降级（catch 兜底）', /seasonalUrl[\s\S]{0,200}catch\(\(\)\s*=>\s*null\)/.test(svcSrc));

  console.log('\n[3] 真实接口逐城市验证');
  for (const city of CITIES) {
    console.log(`\n--- ${city.name} (${city.latitude}, ${city.longitude}) ---`);
    let data;
    const t0 = Date.now();
    try {
      data = await api.fetchCompleteWeather(city.latitude, city.longitude);
    } catch (err) {
      check(`${city.name} 拉取成功`, false, err.message);
      continue;
    }
    const ms = Date.now() - t0;
    check(`${city.name} 拉取成功`, !!data, `${ms}ms`);

    const daily = (data && data.daily) || [];
    check(`${city.name} 逐日条数 = 30`, daily.length === 30, `实际 ${daily.length} 天`);
    check(`${city.name} 条数不少于 15 天要求`, daily.length >= 15, `实际 ${daily.length} 天`);

    const near = daily.filter((d) => !d.isExtended);
    const ext = daily.filter((d) => d.isExtended);
    check(`${city.name} 高精度段 16 天`, near.length === 16, `实际 ${near.length}`);
    check(`${city.name} 趋势段 14 天`, ext.length === 14, `实际 ${ext.length}`);

    // 日期必须连续且唯一
    const dates = daily.map((d) => d.dateStr);
    const uniqueDates = new Set(dates);
    check(`${city.name} 日期无重复`, uniqueDates.size === dates.length, `${uniqueDates.size}/${dates.length}`);
    let contiguous = true;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]).getTime();
      const cur = new Date(dates[i]).getTime();
      if (cur - prev !== 86400000) { contiguous = false; break; }
    }
    check(`${city.name} 日期逐日连续`, contiguous);

    // 字段完整性：不能有 NaN / undefined / null
    const badMax = daily.filter((d) => !Number.isFinite(d.maxTemp));
    const badMin = daily.filter((d) => !Number.isFinite(d.minTemp));
    const badRain = daily.filter((d) => !Number.isFinite(d.rainProb) || d.rainProb < 0 || d.rainProb > 100);
    const badUv = daily.filter((d) => !Number.isFinite(d.uvMax));
    const badSun = daily.filter((d) => !/^\d{2}:\d{2}$/.test(d.sunrise || '') || !/^\d{2}:\d{2}$/.test(d.sunset || ''));
    const badWeather = daily.filter((d) => !d.weather || !d.weather.label || !d.weather.icon);
    const badName = daily.filter((d) => !d.dayName || !d.monthDay);
    check(`${city.name} 最高温全部有效`, badMax.length === 0, badMax.length ? `${badMax.length} 天异常` : '');
    check(`${city.name} 最低温全部有效`, badMin.length === 0, badMin.length ? `${badMin.length} 天异常` : '');
    check(`${city.name} 降水概率 0-100`, badRain.length === 0, badRain.length ? `${badRain.length} 天异常` : '');
    check(`${city.name} 紫外线指数有效`, badUv.length === 0, badUv.length ? `${badUv.length} 天异常` : '');
    check(`${city.name} 日出日落格式正确`, badSun.length === 0, badSun.length ? `${badSun.length} 天异常` : '');
    check(`${city.name} 天气图标文案完整`, badWeather.length === 0, badWeather.length ? `${badWeather.length} 天异常` : '');
    check(`${city.name} 日期名称完整`, badName.length === 0, badName.length ? `${badName.length} 天异常` : '');

    // 天气代码与降水概率必须自洽：写着「毛毛雨/雨/雪/雷」就不能是 0%
    const PRECIP_TYPES = new Set(['rain', 'snow', 'thunder']);
    const contradiction = daily.filter((d) => PRECIP_TYPES.has(d.weather.type) && d.rainProb === 0);
    check(
      `${city.name} 降水类天气与降水概率自洽`,
      contradiction.length === 0,
      contradiction.length
        ? contradiction.map((d) => `${d.dateStr} ${d.weather.label}=${d.rainProb}%`).join('; ')
        : ''
    );

    // 温度合理性
    const absurd = daily.filter((d) => d.maxTemp < -60 || d.maxTemp > 60 || d.minTemp < -60 || d.minTemp > 60);
    check(`${city.name} 温度在物理合理区间`, absurd.length === 0, absurd.length ? `${absurd.length} 天异常` : '');
    const inverted = daily.filter((d) => d.minTemp > d.maxTemp);
    check(`${city.name} 最低温不高于最高温`, inverted.length === 0, inverted.length ? `${inverted.length} 天异常` : '');

    // 交叉校验：前 16 天必须与官方 forecast 端点逐日一致（防止合并错位）
    const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&daily=temperature_2m_max,temperature_2m_min&forecast_days=16&timezone=auto`;
    const fc = await (await fetch(fcUrl)).json();
    let mismatch = 0;
    for (let i = 0; i < 16 && i < near.length; i++) {
      if (near[i].dateStr !== fc.daily.time[i]) mismatch += 1;
      else if (near[i].maxTemp !== Math.round(fc.daily.temperature_2m_max[i])) mismatch += 1;
      else if (near[i].minTemp !== Math.round(fc.daily.temperature_2m_min[i])) mismatch += 1;
    }
    check(`${city.name} 前 16 天与官方 forecast 端点逐日一致`, mismatch === 0, mismatch ? `${mismatch} 处不一致` : '');

    // 后 14 天必须与 seasonal 端点一致
    const seUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${city.latitude}&longitude=${city.longitude}&daily=temperature_2m_max,temperature_2m_min&forecast_days=30&timezone=auto`;
    const se = await (await fetch(seUrl)).json();
    const seIndex = new Map(se.daily.time.map((t, i) => [t, i]));
    let seMismatch = 0;
    for (const d of ext) {
      const i = seIndex.get(d.dateStr);
      if (i === undefined) { seMismatch += 1; continue; }
      if (d.maxTemp !== Math.round(se.daily.temperature_2m_max[i])) seMismatch += 1;
      else if (d.minTemp !== Math.round(se.daily.temperature_2m_min[i])) seMismatch += 1;
    }
    check(`${city.name} 后 14 天与官方 seasonal 端点一致`, seMismatch === 0, seMismatch ? `${seMismatch} 处不一致` : '');

    // 紫外线纬度合理性（趋势段按太阳高度角估算，必须符合纬度与季节）
    const absLat = Math.abs(city.latitude);
    const extUv = ext.map((d) => d.uvMax);
    const nearUv = near.map((d) => d.uvMax);
    const extMax = extUv.length ? Math.max(...extUv) : 0;
    const extMin = extUv.length ? Math.min(...extUv) : 0;
    const nearMax = nearUv.length ? Math.max(...nearUv) : 0;
    check(`${city.name} 趋势段紫外线不极端`, extMax <= 12 && extMin >= 0, `范围 ${extMin}-${extMax}`);
    // 高纬冬季 UV 不应像低纬那样强：漠河(52.97N) 12 月 UV 必须 ≤ 4
    if (absLat >= 50) {
      check(`${city.name} 高纬冬季趋势 UV ≤ 4`, extMax <= 4, `实际峰值 ${extMax}`);
    }
    if (absLat <= 20) {
      check(`${city.name} 低纬趋势 UV 有合理强度`, extMax >= 3, `实际峰值 ${extMax}`);
    }
    check(`${city.name} 趋势段 UV 不高于精准段峰值 +2`, extMax <= nearMax + 2, `趋势 ${extMax} vs 精准 ${nearMax}`);

    if (verbose) {
      console.log(`  抽样（共 ${daily.length} 天）:`);
      [0, 5, 10, 15, 16, 20, 25, 29].filter((i) => i < daily.length).forEach((i) => {
        const d = daily[i];
        console.log(
          `    #${String(i + 1).padStart(2)} ${d.dateStr} ${d.dayName.padEnd(3)} ${String(d.maxTemp).padStart(3)}°/${String(d.minTemp).padStart(3)}° ${d.weather.label.padEnd(6)} 雨${String(d.rainProb).padStart(3)}% UV${d.uvMax} ${d.isExtended ? '[趋势]' : '[精准]'}`
        );
      });
    }
  }

  console.log('\n[4] 依赖其它返回值未被破坏');
  try {
    const data = await api.fetchCompleteWeather(CITIES[0].latitude, CITIES[0].longitude);
    check('current 存在且温度有效', !!data.current && Number.isFinite(data.current.temp));
    check('today 存在', !!data.today && Number.isFinite(data.today.maxTemp));
    check('hourly 24 条', Array.isArray(data.hourly) && data.hourly.length === 24, `实际 ${data.hourly.length}`);
    check('aqi 结构存在', !!data.aqi && Number.isFinite(data.aqi.aqi));
    check('livingIndices 存在', Array.isArray(data.livingIndices) && data.livingIndices.length > 0);
    check('shortTermRain 存在', !!data.shortTermRain);
    check('第一个 hourly 显示「现在」', data.hourly[0].displayTime === '现在');
    check('daily[0] 名为「今天」', data.daily[0].dayName === '今天');
    check('daily[1] 名为「明天」', data.daily[1].dayName === '明天');
    check('daily[2] 名为「后天」', data.daily[2].dayName === '后天');
    check('daily[3] 为周几', ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].includes(data.daily[3].dayName));
  } catch (err) {
    check('回归数据拉取', false, err.message);
  }

  console.log('\n[5] 小部件载荷仍只取 7 天（不因 30 天改动而膨胀）');
  const appSrc = fs.readFileSync(path.join(ROOT, 'App.js'), 'utf8');
  check('widgetPayload 仍 slice(0, 7)', /forecast7dPayload[\s\S]{0,120}\.slice\(0,\s*7\)/.test(appSrc) || /\(data\.daily \|\| \[\]\)\.slice\(0,\s*7\)/.test(appSrc));
  check('DailyDetailModal 接收完整 allDays', /allDays=\{weatherData\?\.daily \|\| \[\]\}/.test(appSrc));

  report();
}

function report() {
  console.log('\n=========================================');
  if (failures.length === 0) {
    console.log(`ALL TESTS PASSED — ${pass} 项检查全部通过`);
    process.exit(0);
  } else {
    console.log(`FAILED — ${failures.length} 项失败 / ${pass} 项通过`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('测试异常:', err);
  process.exit(1);
});
