/**
 * 后台同步健康度的单元测试（离线，不联网、不需要 APK）
 *
 * 背景：用户报「睡一觉起来小部件还是昨晚的时间和日期」。修好之后还缺一环 ——
 * 得让人**看得出**这份数据到底是刚抓的还是十几小时前的。syncHealth.js 就是干这个的，
 * 它把原生侧的 lastSyncAt / failCount / lastFailAt 翻译成一句能指导用户动作的话。
 *
 * 因为这个模块 import 了 react-native 的 NativeModules，纯 node 直接 import 会失败，
 * 所以和 test_refresh_policy.mjs 一样用 vm 沙箱加载，import 语句换成注入的桩。
 *
 * 用法：node scripts/test_sync_health.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HEALTH_PATH = path.join(ROOT, 'src', 'services', 'syncHealth.js');
const POLICY_PATH = path.join(ROOT, 'src', 'services', 'refreshPolicy.js');

const MINUTE = 60 * 1000;

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

/** 把 ESM 的 export 前缀剥掉，尾接 module.exports，交给 vm 执行 */
function toCjs(source) {
  const stripped = source
    .replace(/^export\s+default\s+[^;]+;?$/gm, '')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s+let\s+/gm, 'let ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+\{[^}]*\}\s*;?$/gm, '');
  const names = [];
  const re = /^export\s+(?:const|let|async\s+function|function)\s+([A-Za-z0-9_$]+)/gm;
  let m;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return { stripped, names };
}

/** 加载 refreshPolicy.js，只为拿到真实的 syncAgeMinutes（避免测试里重写一份口径不同的实现） */
function loadPolicy() {
  const source = fs.readFileSync(POLICY_PATH, 'utf8');
  const { stripped, names } = toCjs(source);
  const sandbox = { console, Date, Math, Number, String, Boolean, Array, Object, JSON, Promise, Error, isNaN, parseInt, parseFloat, module: { exports: {} } };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${stripped}\nmodule.exports = { ${names.join(', ')} };\n`, sandbox, { filename: 'refreshPolicy.js' });
  return sandbox.module.exports;
}

/**
 * 加载 syncHealth.js。
 * import 语句整体删掉，改成把 nativeModules / syncAgeMinutes 直接注入沙箱 ——
 * 这样测的仍然是仓库里那份真实实现，只是把外部依赖换成可控的桩。
 */
function loadSyncHealth(nativeModules, policy) {
  let source = fs.readFileSync(HEALTH_PATH, 'utf8');
  source = source.replace(/^import[^;]*;$/gm, '');
  const { stripped, names } = toCjs(source);
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
    NativeModules: nativeModules,
    syncAgeMinutes: policy.syncAgeMinutes,
    module: { exports: {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${stripped}\nmodule.exports = { ${names.join(', ')} };\n`, sandbox, { filename: 'syncHealth.js' });
  return sandbox.module.exports;
}

function report() {
  console.log('\n------------------------------------------------------------');
  if (failures.length === 0) {
    console.log(`✅ 全部通过：${pass} 项检查，0 项失败。`);
    process.exit(0);
  } else {
    console.error(`❌ 失败：${pass + failures.length} 项检查中有 ${failures.length} 项未通过。`);
    failures.forEach((f) => console.error(`   · ${f}`));
    process.exit(1);
  }
}

async function main() {
  console.log('=== 后台同步健康度单元测试 ===');
  console.log(`被测文件: ${HEALTH_PATH}\n`);

  const policy = loadPolicy();
  check('[0] 依赖的 syncAgeMinutes 可用', typeof policy.syncAgeMinutes === 'function');

  // ---------------------------------------------------------------
  console.log('\n[1] 模块加载与常量');
  const health = loadSyncHealth({}, policy);
  check('syncHealth.js 可解析并导出', Object.keys(health).length >= 3, `${Object.keys(health).length} 个导出`);
  check('导出 readSyncStatus', typeof health.readSyncStatus === 'function');
  check('导出 ensureBackgroundScheduler', typeof health.ensureBackgroundScheduler === 'function');
  check('导出 describeSyncHealth', typeof health.describeSyncHealth === 'function');
  check('STALE_WARN_MINUTES = 90', health.STALE_WARN_MINUTES === 90, `实际 ${health.STALE_WARN_MINUTES}`);
  check('FAIL_WARN_COUNT = 3', health.FAIL_WARN_COUNT === 3, `实际 ${health.FAIL_WARN_COUNT}`);

  // ---------------------------------------------------------------
  console.log('\n[2] readSyncStatus：原生方法缺失时必须安全降级');
  const empty = await loadSyncHealth({}, policy).readSyncStatus();
  check('无 WeatherWidgetModule 时返回空状态', empty.lastSyncAt === 0 && empty.failCount === 0);
  const noMethod = await loadSyncHealth({ WeatherWidgetModule: {} }, policy).readSyncStatus();
  check('模块存在但没有 readSyncStatus 时返回空状态', noMethod.lastSyncAt === 0);
  const throwing = await loadSyncHealth(
    { WeatherWidgetModule: { readSyncStatus: () => { throw new Error('boom'); } } },
    policy
  ).readSyncStatus();
  check('原生抛错时不向上冒泡', throwing.lastSyncAt === 0 && throwing.city === null);

  // ---------------------------------------------------------------
  console.log('\n[3] readSyncStatus：脏数据归一化');
  const dirty = await loadSyncHealth(
    {
      WeatherWidgetModule: {
        readSyncStatus: async () => ({ lastSyncAt: 'abc', failCount: null, lastFailAt: NaN, city: 42 }),
      },
    },
    policy
  ).readSyncStatus();
  check('非数字 lastSyncAt 归一为 0', dirty.lastSyncAt === 0);
  check('null failCount 归一为 0', dirty.failCount === 0);
  check('NaN lastFailAt 归一为 0', dirty.lastFailAt === 0);
  check('非字符串 city 归一为 null', dirty.city === null);

  const good = await loadSyncHealth(
    {
      WeatherWidgetModule: {
        readSyncStatus: async () => ({ lastSyncAt: 1_700_000_000_000, failCount: 2, lastFailAt: 1_700_000_100_000, city: '南昌' }),
      },
    },
    policy
  ).readSyncStatus();
  check('正常值原样透传', good.lastSyncAt === 1_700_000_000_000 && good.failCount === 2 && good.city === '南昌');

  // ---------------------------------------------------------------
  console.log('\n[4] describeSyncHealth：三档严重度');
  const now = Date.UTC(2026, 10, 17, 2, 0, 0);

  const okHealth = health.describeSyncHealth({ lastSyncAt: now - 5 * MINUTE, failCount: 0, lastFailAt: 0 }, now);
  check('5 分钟前成功过 → ok', okHealth.level === 'ok', okHealth.level);
  check('ok 档不输出提示文案（不打扰用户）', okHealth.text === '', JSON.stringify(okHealth.text));

  const stale = health.describeSyncHealth({ lastSyncAt: now - 8 * 60 * MINUTE, failCount: 0, lastFailAt: 0 }, now);
  check('8 小时未更新 → stale', stale.level === 'stale', stale.level);
  check('stale 文案带小时数', /8 小时/.test(stale.text), stale.text);
  check('stale 文案给出动作（刷新 / 后台权限）', /刷新/.test(stale.text) && /后台/.test(stale.text), stale.text);

  const staleShort = health.describeSyncHealth({ lastSyncAt: now - 100 * MINUTE, failCount: 0, lastFailAt: 0 }, now);
  check('100 分钟未更新按小时展示', /1 小时/.test(staleShort.text), staleShort.text);

  const failing = health.describeSyncHealth({ lastSyncAt: now - 2 * MINUTE, failCount: 3, lastFailAt: now - MINUTE }, now);
  check('连续失败 3 次 → failing', failing.level === 'failing', failing.level);
  check('failing 优先于 new 数据（数据新但一直失败也要报）', /连续失败 3 次/.test(failing.text), failing.text);

  const pending = health.describeSyncHealth({ lastSyncAt: 0, failCount: 0, lastFailAt: 0 }, now);
  check('从未成功同步 → pending 且不吓用户', pending.level === 'pending' && pending.text === '', pending.level);

  const nullStatus = health.describeSyncHealth(null, now);
  check('状态为 null 时不抛错', nullStatus.level === 'pending', nullStatus.level);

  // 阈值边界
  const at89 = health.describeSyncHealth({ lastSyncAt: now - 89 * MINUTE, failCount: 0, lastFailAt: 0 }, now);
  const at91 = health.describeSyncHealth({ lastSyncAt: now - 91 * MINUTE, failCount: 0, lastFailAt: 0 }, now);
  check('89 分钟仍在 ok 档', at89.level === 'ok', at89.level);
  check('91 分钟进入 stale 档', at91.level === 'stale', at91.level);

  const at2fail = health.describeSyncHealth({ lastSyncAt: now - 5 * MINUTE, failCount: 2, lastFailAt: now }, now);
  const at3fail = health.describeSyncHealth({ lastSyncAt: now - 5 * MINUTE, failCount: 3, lastFailAt: now }, now);
  check('失败 2 次还不报 failing', at2fail.level === 'ok', at2fail.level);
  check('失败 3 次开始报 failing', at3fail.level === 'failing', at3fail.level);

  // ---------------------------------------------------------------
  console.log('\n[5] ensureBackgroundScheduler：原生缺失时不得抛错');
  const schedMissing = await loadSyncHealth({}, policy).ensureBackgroundScheduler();
  check('无原生模块返回 false', schedMissing === false);
  let called = 0;
  const schedOk = await loadSyncHealth(
    { WeatherWidgetModule: { ensureBackgroundScheduler: async () => { called += 1; return true; } } },
    policy
  ).ensureBackgroundScheduler();
  check('原生可用时返回 true', schedOk === true);
  check('确实调用了原生方法', called === 1, `调用 ${called} 次`);
  const schedThrow = await loadSyncHealth(
    { WeatherWidgetModule: { ensureBackgroundScheduler: async () => { throw new Error('nope'); } } },
    policy
  ).ensureBackgroundScheduler();
  check('原生抛错时返回 false 而不是冒泡', schedThrow === false);

  // ---------------------------------------------------------------
  console.log('\n[6] 与 App.js / 原生的接线');
  const appJs = fs.readFileSync(path.join(ROOT, 'App.js'), 'utf8');
  const moduleKt = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherWidgetModule.kt'),
    'utf8'
  );
  const workerKt = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherRefreshWorker.kt'),
    'utf8'
  );
  check('App.js 导入 readSyncStatus / describeSyncHealth',
    /readSyncStatus/.test(appJs) && /describeSyncHealth/.test(appJs));
  check('App.js 在看门狗每一拍刷新健康度', /refreshSyncHealth/.test(appJs));
  check('App.js 渲染告警条', /healthBar/.test(appJs));
  check('告警条提供「立即恢复」动作', /ensureBackgroundScheduler\(\)/.test(appJs) && /立即恢复/.test(appJs));
  check('原生 readSyncStatus 读取失败计数',
    /fun\s+readSyncStatus\(promise:\s*Promise\)/.test(moduleKt) && /KEY_SYNC_FAIL_COUNT/.test(moduleKt));
  check('原生 ensureBackgroundScheduler 重新登记周期任务',
    /fun\s+ensureBackgroundScheduler\(promise:\s*Promise\)/.test(moduleKt) && /enqueuePeriodic/.test(moduleKt));
  check('Worker 用 performSync 的布尔结果决定 success/retry',
    /performSync\(/.test(workerKt) && /Result\.success\(\)/.test(workerKt) && /Result\.retry\(\)/.test(workerKt));

  report();
}

main();
