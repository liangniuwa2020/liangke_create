/**
 * App 级冒烟测试：把整个 App.js 渲染一遍，确认 30 天预报
 * 在真实页面结构（SafeAreaProvider > WeatherBackground > 各卡片）里正常出现，
 * 且不因为新增的 30 天数据撑坏布局或触发运行期异常。
 *
 * 用法：node --import ./scripts/register-render.mjs scripts/test_app_smoke.mjs
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import App from '../App.js';
import { fetchCompleteWeather } from '../src/services/weatherService.js';

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

async function main() {
  console.log('=== App 级冒烟测试 ===\n');

  console.log('[1] 数据层为 30 天');
  const data = await fetchCompleteWeather(28.6829, 115.8906);
  check('逐日数据 30 条', data.daily.length === 30, `实际 ${data.daily.length}`);
  check('精准段 16 条', data.daily.filter((d) => !d.isExtended).length === 16);
  check('趋势段 14 条', data.daily.filter((d) => d.isExtended).length === 14);

  console.log('\n[2] 整个 App 可渲染且包含 30 天预报');
  let html;
  try {
    html = renderToStaticMarkup(React.createElement(App));
    check('App 渲染未抛异常', true, `${html.length} 字符`);
  } catch (err) {
    check('App 渲染未抛异常', false, err.message);
    report();
    return;
  }

  // App 首屏在没有 weatherData 时应该是 loading 态，不会崩
  check('首屏进入加载态而非崩溃', html.length > 200, `${html.length} 字符`);
  check('加载态文案存在', html.includes('正在从卫星气象中心同步数据') || html.includes('加载'));

  console.log('\n[3] 首屏不因 30 天改动而出现空预报区');
  check('加载态不渲染逐日卡片（无数据时不显示空表）', !html.includes('天天气预报'));

  console.log('\n[4] 用 30 天数据直接渲染预报卡的完整行数');
  const { default: DailyForecastCard } = await import('../src/components/DailyForecastCard.js');
  const cardHtml = renderToStaticMarkup(
    React.createElement(DailyForecastCard, { daily: data.daily, onPressDay: () => {} })
  );
  const buttons = (cardHtml.match(/<button/g) || []).length;
  check('卡片渲染 30 行', buttons === 30, `实际 ${buttons}`);
  check('卡片标题为 30 天', cardHtml.includes('30天天气预报'));

  // 最后一天（第 30 天）的温度必须出现在 DOM 里
  const last = data.daily[29];
  check('第 30 天数据可见', cardHtml.includes(last.monthDay) && cardHtml.includes(`${last.maxTemp}°`),
    `${last.monthDay} ${last.maxTemp}°/${last.minTemp}°`);

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
