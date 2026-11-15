/**
 * 组件级功能测试：真实渲染 DailyForecastCard / DailyDetailModal，
 * 验证 15 天与 30 天预报在 UI 层确实全部显示出来。
 *
 * 做法：用 module.register 挂上合并加载器（JSX 转换 + RN 桩），
 * 再用 react-dom/server 静态渲染，最后对输出的 HTML 做结构断言。
 *
 * 用法：node --import ./scripts/register-render.mjs scripts/test_forecast_ui.mjs
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { fetchCompleteWeather } from '../src/services/weatherService.js';
import DailyForecastCard from '../src/components/DailyForecastCard.js';
import DailyDetailModal from '../src/components/DailyDetailModal.js';

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

/** 从渲染出的 HTML 里抽取所有 data-icon 的图标名 */
function iconNames(html) {
  return [...html.matchAll(/data-icon="([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
}

function rowCount(html) {
  // 每行是 TouchableOpacity → <button>，卡片里只有日期行是 button
  return (html.match(/<button/g) || []).length;
}

async function main() {
  console.log('=== 预报 UI 渲染功能测试 ===\n');

  console.log('[1] 准备真实数据（南昌，30 天）');
  const data = await fetchCompleteWeather(28.6829, 115.8906);
  check('拿到 30 天数据', data.daily.length === 30, `实际 ${data.daily.length} 天`);

  console.log('\n[2] DailyForecastCard 渲染 30 天');
  const cardHtml = renderToStaticMarkup(
    React.createElement(DailyForecastCard, { daily: data.daily, onPressDay: () => {} })
  );
  check('组件成功渲染出内容', cardHtml.length > 1000, `${cardHtml.length} 字符`);
  check('标题显示「30天天气预报」', cardHtml.includes('30天天气预报'));
  check('不再出现旧文案「7-15天趋势预报」', !cardHtml.includes('7-15天趋势预报'));
  check('渲染出 30 个可点击日期行', rowCount(cardHtml) === 30, `实际 ${rowCount(cardHtml)} 行`);
  check('出现「近 16 天精准预报」摘要', cardHtml.includes('近 16 天精准预报'));
  check('出现「后 14 天趋势」摘要', cardHtml.includes('后 14 天趋势'));
  check('出现季节趋势分隔提示', cardHtml.includes('以下为季节趋势预报'));

  // 30 天里的每一条日期与温度都必须出现在 DOM 里（逐条核对，不是只看条数）
  let missingDate = [];
  let missingTemp = [];
  for (const d of data.daily) {
    if (!cardHtml.includes(d.monthDay)) missingDate.push(d.monthDay);
    if (!cardHtml.includes(`${d.maxTemp}°`)) missingTemp.push(`${d.monthDay}:${d.maxTemp}°`);
    if (!cardHtml.includes(`${d.minTemp}°`)) missingTemp.push(`${d.monthDay}:${d.minTemp}°`);
  }
  check('30 天的日期全部出现在 DOM 中', missingDate.length === 0, missingDate.join(','));
  check('30 天的最高/最低温全部出现在 DOM 中', missingTemp.length === 0, missingTemp.slice(0, 5).join(','));
  check('第一行显示「今天」', cardHtml.includes('今天'));
  check('每个日期行都有天气图标', iconNames(cardHtml).length >= 30, `图标数 ${iconNames(cardHtml).length}`);

  console.log('\n[3] 15 天数据也能完整渲染');
  const fifteenHtml = renderToStaticMarkup(
    React.createElement(DailyForecastCard, { daily: data.daily.slice(0, 15), onPressDay: () => {} })
  );
  check('15 天标题动态显示「15天天气预报」', fifteenHtml.includes('15天天气预报'));
  check('15 天渲染出 15 行', rowCount(fifteenHtml) === 15, `实际 ${rowCount(fifteenHtml)}`);
  check('15 天时无趋势分隔提示', !fifteenHtml.includes('以下为季节趋势预报'));
  check('15 天时无「后 N 天趋势」摘要', !/后 \d+ 天趋势/.test(fifteenHtml));

  console.log('\n[4] 空数据与单日数据不崩');
  const emptyHtml = renderToStaticMarkup(
    React.createElement(DailyForecastCard, { daily: [], onPressDay: () => {} })
  );
  check('空数组渲染为空（不抛异常）', emptyHtml === '', `"${emptyHtml}"`);
  const oneHtml = renderToStaticMarkup(
    React.createElement(DailyForecastCard, { daily: data.daily.slice(0, 1), onPressDay: () => {} })
  );
  check('单日数据渲染为 1 行', rowCount(oneHtml) === 1);

  console.log('\n[5] DailyDetailModal 能在 30 天里切换与展示');
  const day20 = data.daily[19]; // 第 20 天，属于趋势段
  const modalHtml = renderToStaticMarkup(
    React.createElement(DailyDetailModal, {
      visible: true,
      onClose: () => {},
      day: day20,
      allDays: data.daily,
      onSelectDay: () => {},
    })
  );
  check('弹窗渲染成功', modalHtml.length > 1000, `${modalHtml.length} 字符`);
  check('弹窗显示选中的日期', modalHtml.includes(day20.monthDay));
  check('弹窗显示最高温/最低温', modalHtml.includes(`${day20.maxTemp}°`) && modalHtml.includes(`${day20.minTemp}°`));
  check('弹窗显示日照时段卡', modalHtml.includes('日照时段'));
  check('弹窗显示紫外线卡', modalHtml.includes('紫外线指数'));
  check('「切换日期」横向列表存在', modalHtml.includes('切换日期'));
  const navButtons = (modalHtml.match(/<button/g) || []).length;
  check('切换列表包含全部 30 天 + 关闭按钮', navButtons >= 31, `实际 ${navButtons} 个按钮`);

  console.log('\n[6] 趋势段每一天都能被选中并正确展示');
  // 切换列表的 chip 只显示 dayName + 温度，不显示 monthDay，
  // 所以逐天渲染弹窗、检查 hero 区真的显示了那一天的日期与温度，
  // 才算证明趋势段可以正常切换（而不是只数按钮个数）。
  const extDate = data.daily.filter((d) => d.isExtended);
  const badSwitch = [];
  for (const d of extDate) {
    const html = renderToStaticMarkup(
      React.createElement(DailyDetailModal, {
        visible: true, onClose: () => {}, day: d, allDays: data.daily, onSelectDay: () => {},
      })
    );
    if (!html.includes(d.monthDay) || !html.includes(`${d.maxTemp}°`) || !html.includes(d.dayName)) {
      badSwitch.push(`${d.monthDay}(${d.dayName})`);
    }
  }
  check('趋势段 14 天逐天选中都展示正确', badSwitch.length === 0, badSwitch.join(','));

  // 精准段同样逐天验证，确认改动没有破坏前 16 天
  const nearDate = data.daily.filter((d) => !d.isExtended);
  const badNear = [];
  for (const d of nearDate) {
    const html = renderToStaticMarkup(
      React.createElement(DailyDetailModal, {
        visible: true, onClose: () => {}, day: d, allDays: data.daily, onSelectDay: () => {},
      })
    );
    if (!html.includes(d.monthDay) || !html.includes(`${d.maxTemp}°`)) badNear.push(d.monthDay);
  }
  check('精准段 16 天逐天选中都展示正确', badNear.length === 0, badNear.join(','));

  // 切换列表里每一天都有一个 chip：30 天 → 至少 30 个 chip
  const chipTempPattern = /-?\d+°\/-?\d+°/g;
  const chips = modalHtml.match(chipTempPattern) || [];
  check('切换列表渲染出 30 个日期 chip 温度', chips.length >= 30, `实际 ${chips.length} 个`);

  console.log('\n[7] 无 day 时不渲染（沿用原防御逻辑）');
  const nullHtml = renderToStaticMarkup(
    React.createElement(DailyDetailModal, { visible: true, onClose: () => {}, day: null, allDays: [] })
  );
  check('day 为 null 时输出为空', nullHtml === '');

  console.log('\n[8] 30 天全是连续日期且都进 DOM');
  const daysShown = data.daily.filter((d) => cardHtml.includes(d.dateStr) || cardHtml.includes(d.monthDay));
  check('30 天全部在 DOM', daysShown.length === 30, `实际 ${daysShown.length}`);

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
