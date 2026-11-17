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
  check('App.js 用原生 readSyncStatus 状态渲染提示（不再静默显示旧数据）', /readSyncStatus/.test(appJs) && /healthBar/.test(appJs));
  check('告警条引导到体检面板（查看原因）', /setIsHealthModalVisible\(true\)/.test(appJs) && /查看原因/.test(appJs));
  check('原生 readSyncStatus 读取失败计数',
    /fun\s+readSyncStatus\(promise:\s*Promise\)/.test(moduleKt) && /KEY_SYNC_FAIL_COUNT/.test(moduleKt));
  check('原生 ensureBackgroundScheduler 重新登记周期任务',
    /fun\s+ensureBackgroundScheduler\(promise:\s*Promise\)/.test(moduleKt) && /enqueuePeriodic/.test(moduleKt));
  check('Worker 用 performSync 的布尔结果决定 success/retry',
    /performSync\(/.test(workerKt) && /Result\.success\(\)/.test(workerKt) && /Result\.retry\(\)/.test(workerKt));

  // ---------------------------------------------------------------
  console.log('\n[7] parseWorkState：解析原生状态串');
  const parseWorkState = health.parseWorkState;
  check('导出 parseWorkState', typeof parseWorkState === 'function');
  check('ENQUEUED|runs=0', (() => { const r = parseWorkState('ENQUEUED|runs=0'); return r.state === 'ENQUEUED' && r.runs === 0; })());
  check('ENQUEUED|runs=4 解析出重试次数', parseWorkState('ENQUEUED|runs=4').runs === 4);
  check('MISSING 原样作为 state', parseWorkState('MISSING').state === 'MISSING');
  check('ERROR:SecurityException 保留错误类型', parseWorkState('ERROR:SecurityException').state === 'ERROR:SecurityException');
  check('空串降级为 UNKNOWN', parseWorkState('').state === 'UNKNOWN');
  check('非字符串降级为 UNKNOWN', parseWorkState(null).state === 'UNKNOWN' && parseWorkState(42).runs === 0);
  check('无 runs 字段时 runs=0', parseWorkState('RUNNING').runs === 0);

  // ---------------------------------------------------------------
  console.log('\n[8] readBackgroundDiagnostics：原生缺失与脏数据');
  const diagEmpty = await loadSyncHealth({}, policy).readBackgroundDiagnostics();
  check('无原生模块时返回空体检结果', diagEmpty.workState === 'UNKNOWN' && diagEmpty.batteryOptimizationIgnored === false);
  check('无原生模块时 exactAlarmAllowed 默认 false（保守）', diagEmpty.exactAlarmAllowed === false);
  const diagDirty = await loadSyncHealth(
    {
      WeatherWidgetModule: {
        readBackgroundDiagnostics: async () => ({
          workState: 123,
          batteryOptimizationIgnored: 'yes',
          exactAlarmAllowed: 1,
          lastSyncAt: 'x',
          failCount: null,
          manufacturer: 7,
          sdkInt: NaN,
        }),
      },
    },
    policy
  ).readBackgroundDiagnostics();
  check('非字符串 workState 归一为 UNKNOWN', diagDirty.workState === 'UNKNOWN');
  check('非 true 的 batteryOptimizationIgnored 归一为 false', diagDirty.batteryOptimizationIgnored === false);
  check('非 true 的 exactAlarmAllowed 归一为 false', diagDirty.exactAlarmAllowed === false);
  check('非数字 lastSyncAt 归一为 0', diagDirty.lastSyncAt === 0);
  check('非数字 sdkInt 归一为 0', diagDirty.sdkInt === 0);
  check('非字符串 manufacturer 归一为空串', diagDirty.manufacturer === '');

  // ---------------------------------------------------------------
  console.log('\n[9] describeBackgroundDiagnosis：问题清单');
  const diagnose = health.describeBackgroundDiagnosis;
  check('导出 describeBackgroundDiagnosis', typeof diagnose === 'function');

  const healthyDiag = {
    workState: 'ENQUEUED|runs=0',
    batteryOptimizationIgnored: true,
    exactAlarmAllowed: true,
    lastSyncAt: now - 5 * MINUTE,
    failCount: 0,
    lastFailAt: 0,
    sdkInt: 34,
  };
  check('一切正常时问题清单为空', diagnose(healthyDiag, now).length === 0, `${diagnose(healthyDiag, now).length} 条`);

  const missingWork = diagnose({ ...healthyDiag, workState: 'MISSING' }, now);
  check('任务被清掉时报 work-missing', missingWork.some((i) => i.key === 'work-missing'));
  check('work-missing 给的处置是重新登记', missingWork.find((i) => i.key === 'work-missing').action === 'reschedule');

  const cancelled = diagnose({ ...healthyDiag, workState: 'CANCELLED' }, now);
  check('任务被取消同样报 work-missing', cancelled.some((i) => i.key === 'work-missing'));

  const failed = diagnose({ ...healthyDiag, workState: 'FAILED' }, now);
  check('任务失败报 work-failed', failed.some((i) => i.key === 'work-failed'));

  const blocked = diagnose({ ...healthyDiag, workState: 'BLOCKED' }, now);
  check('任务被阻塞报 work-blocked（warn 级）',
    blocked.some((i) => i.key === 'work-blocked' && i.level === 'warn'));

  const noBattery = diagnose({ ...healthyDiag, batteryOptimizationIgnored: false }, now);
  check('不在电池白名单时报 battery-optimized', noBattery.some((i) => i.key === 'battery-optimized'));
  check('battery-optimized 给的处置是去设置', noBattery.find((i) => i.key === 'battery-optimized').action === 'battery');

  const noAlarm = diagnose({ ...healthyDiag, exactAlarmAllowed: false }, now);
  check('未授予精确闹钟报 exact-alarm-denied', noAlarm.some((i) => i.key === 'exact-alarm-denied'));

  const oldSdk = diagnose({ ...healthyDiag, exactAlarmAllowed: false, sdkInt: 30 }, now);
  check('Android 11 及以下不因精确闹钟报警（该版本无需该权限）',
    !oldSdk.some((i) => i.key === 'exact-alarm-denied'));

  const staleDiag = diagnose({ ...healthyDiag, lastSyncAt: now - 9 * 60 * MINUTE }, now);
  check('9 小时未成功同步报 stale', staleDiag.some((i) => i.key === 'stale'));
  check('stale 文案带小时数', /9 小时/.test(staleDiag.find((i) => i.key === 'stale').text));

  const failingDiag = diagnose({ ...healthyDiag, failCount: 5, lastFailAt: now }, now);
  check('连续失败报 failing', failingDiag.some((i) => i.key === 'failing'));
  check('failing 文案带次数', /连续 5 次/.test(failingDiag.find((i) => i.key === 'failing').text));

  const mixed = diagnose(
    { workState: 'MISSING', batteryOptimizationIgnored: false, exactAlarmAllowed: false, lastSyncAt: now - 10 * 60 * MINUTE, failCount: 4, sdkInt: 34 },
    now
  );
  check('多因叠加时逐条列出（而不是只报一条）', mixed.length >= 5, `${mixed.length} 条`);
  check('多因共存时 contains work-missing + battery-optimized + exact-alarm-denied + stale + failing',
    mixed.some((i) => i.key === 'work-missing')
    && mixed.some((i) => i.key === 'battery-optimized')
    && mixed.some((i) => i.key === 'exact-alarm-denied')
    && mixed.some((i) => i.key === 'stale')
    && mixed.some((i) => i.key === 'failing'));
  check('每条问题都带 level 与可执行 action',
    mixed.every((i) => (i.level === 'error' || i.level === 'warn') && ['reschedule', 'battery', 'refresh', null].includes(i.action)));
  check('空状态不抛错', Array.isArray(diagnose(null, now)));

  // ---------------------------------------------------------------
  console.log('\n[10] openBatterySettings：原生缺失时不得抛错');
  const openMissing = await loadSyncHealth({}, policy).openBatterySettings();
  check('无原生模块返回 false', openMissing === false);
  let opened = 0;
  const openOk = await loadSyncHealth(
    { WeatherWidgetModule: { openBatterySettings: async () => { opened += 1; return true; } } },
    policy
  ).openBatterySettings();
  check('原生可用时返回 true', openOk === true && opened === 1);

  // ---------------------------------------------------------------
  console.log('\n[11] 原生与面板接线');
  const schedulerKt = fs.readFileSync(
    path.join(ROOT, 'android/app/src/main/java/com/pure/mojiweather/WeatherRefreshScheduler.kt'),
    'utf8'
  );
  const healthModal = fs.readFileSync(
    path.join(ROOT, 'src/components/BackgroundHealthModal.js'),
    'utf8'
  );
  check('Scheduler 提供 describePeriodicState', /fun describePeriodicState\(/.test(schedulerKt));
  check('Scheduler 用 getWorkInfosForUniqueWork 查真实状态', /getWorkInfosForUniqueWork\(/.test(schedulerKt));
  check('Scheduler 区分 ENQUEUED / CANCELLED', /WorkInfo\.State\.ENQUEUED/.test(schedulerKt) && /WorkInfo\.State\.CANCELLED/.test(schedulerKt));
  check('Scheduler 查询有 3 秒超时（避免主线程卡死）', /\.get\(3, TimeUnit\.SECONDS\)/.test(schedulerKt));
  check('原生暴露 readBackgroundDiagnostics', /fun\s+readBackgroundDiagnostics\(promise:\s*Promise\)/.test(moduleKt));
  check('原生读电池优化白名单', /isIgnoringBatteryOptimizations\(/.test(moduleKt));
  check('原生读精确闹钟权限', /canScheduleExactAlarms\(/.test(moduleKt));
  check('原生暴露 openBatterySettings', /fun\s+openBatterySettings\(promise:\s*Promise\)/.test(moduleKt));
  check('体检面板读取 readBackgroundDiagnostics', /readBackgroundDiagnostics\(/.test(healthModal));
  check('体检面板展示 workState', /workState/.test(healthModal));
  check('体检面板展示电池白名单状态', /batteryOptimizationIgnored/.test(healthModal));
  check('体检面板提供重新登记', /ensureBackgroundScheduler\(/.test(healthModal));
  check('体检面板提供去电池设置', /openBatterySettings\(/.test(healthModal));

  report();
}

main();
