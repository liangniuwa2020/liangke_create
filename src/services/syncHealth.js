/**
 * 后台同步健康度
 *
 * 背景：用户「睡一觉起来，小部件还是昨晚的时间和日期」这类问题的难点不在修复，
 * 而在**确认修复是否生效** —— 界面只显示一个 HH:mm，看不出这份数据是 5 分钟前抓的
 * 还是 14 小时前抓的。于是把原生侧记录的三个数字端上来：
 *
 *   - lastSyncAt：最近一次成功抓取的时间戳
 *   - failCount：连续失败次数（成功一次即清零）
 *   - lastFailAt：最近一次失败的时间戳
 *
 * 有了这三个值，界面才能区分「一直没跑起来」「跑了但一直失败」「跑成功了但数据是旧的」
 * 三种完全不同的故障，也才能给用户一条可执行的提示。
 *
 * 这个文件只做「读 + 解释」，不发起任何网络请求。
 */

import { NativeModules } from 'react-native';

import { syncAgeMinutes } from './refreshPolicy';

/** 超过这个时长没有成功同步，就在界面上明确提示「数据已陈旧」 */
export const STALE_WARN_MINUTES = 90;

/** 连续失败到这么多次，提示用户去检查网络与后台运行权限 */
export const FAIL_WARN_COUNT = 3;

const EMPTY_STATUS = { lastSyncAt: 0, failCount: 0, lastFailAt: 0, city: null };

/**
 * 读取原生侧的同步健康度。
 * 原生方法不存在（例如在 Web / 旧版本包上跑）时返回空状态，不抛错。
 */
export async function readSyncStatus() {
  const mod = NativeModules && NativeModules.WeatherWidgetModule;
  if (!mod || typeof mod.readSyncStatus !== 'function') {
    return { ...EMPTY_STATUS };
  }
  try {
    const raw = await mod.readSyncStatus();
    if (!raw || typeof raw !== 'object') return { ...EMPTY_STATUS };
    return {
      lastSyncAt: Number.isFinite(raw.lastSyncAt) ? raw.lastSyncAt : 0,
      failCount: Number.isFinite(raw.failCount) ? raw.failCount : 0,
      lastFailAt: Number.isFinite(raw.lastFailAt) ? raw.lastFailAt : 0,
      city: typeof raw.city === 'string' ? raw.city : null,
    };
  } catch (_e) {
    return { ...EMPTY_STATUS };
  }
}

/**
 * 让原生把 WorkManager 周期任务与 AlarmManager 重新登记一遍。
 *
 * 用途：部分国产 ROM 清理后台时会把 JobScheduler 里的任务一起删掉，
 * 用户在系统设置里把 App 加入「电池优化白名单 / 自启动允许」之后，
 * 点一下这个动作就能立刻恢复，不用等下一次开机或重装。
 */
export async function ensureBackgroundScheduler() {
  const mod = NativeModules && NativeModules.WeatherWidgetModule;
  if (!mod || typeof mod.ensureBackgroundScheduler !== 'function') return false;
  try {
    await mod.ensureBackgroundScheduler();
    return true;
  } catch (_e) {
    return false;
  }
}

const EMPTY_DIAGNOSTICS = {
  workState: 'UNKNOWN',
  batteryOptimizationIgnored: false,
  exactAlarmAllowed: false,
  lastSyncAt: 0,
  failCount: 0,
  lastFailAt: 0,
  manufacturer: '',
  brand: '',
  model: '',
  sdkInt: 0,
};

/**
 * 读取原生侧的「后台保活体检」结果。
 *
 * 相比 readSyncStatus，这里多了三项只有系统才知道的事实：
 *   - workState：WorkManager 周期任务在系统队列里的真实状态（MISSING 表示已被 ROM 清掉）
 *   - batteryOptimizationIgnored：本应用是否已被排除在电池优化之外
 *   - exactAlarmAllowed：是否允许精确闹钟（Android 12+ 默认不允许）
 */
export async function readBackgroundDiagnostics() {
  const mod = NativeModules && NativeModules.WeatherWidgetModule;
  if (!mod || typeof mod.readBackgroundDiagnostics !== 'function') {
    return { ...EMPTY_DIAGNOSTICS };
  }
  try {
    const raw = await mod.readBackgroundDiagnostics();
    if (!raw || typeof raw !== 'object') return { ...EMPTY_DIAGNOSTICS };
    return {
      workState: typeof raw.workState === 'string' ? raw.workState : 'UNKNOWN',
      batteryOptimizationIgnored: raw.batteryOptimizationIgnored === true,
      exactAlarmAllowed: raw.exactAlarmAllowed === true,
      lastSyncAt: Number.isFinite(raw.lastSyncAt) ? raw.lastSyncAt : 0,
      failCount: Number.isFinite(raw.failCount) ? raw.failCount : 0,
      lastFailAt: Number.isFinite(raw.lastFailAt) ? raw.lastFailAt : 0,
      manufacturer: typeof raw.manufacturer === 'string' ? raw.manufacturer : '',
      brand: typeof raw.brand === 'string' ? raw.brand : '',
      model: typeof raw.model === 'string' ? raw.model : '',
      sdkInt: Number.isFinite(raw.sdkInt) ? raw.sdkInt : 0,
    };
  } catch (_e) {
    return { ...EMPTY_DIAGNOSTICS };
  }
}

/** 打开系统的电池优化设置页，让用户自己把本应用加进白名单。 */
export async function openBatterySettings() {
  const mod = NativeModules && NativeModules.WeatherWidgetModule;
  if (!mod || typeof mod.openBatterySettings !== 'function') return false;
  try {
    await mod.openBatterySettings();
    return true;
  } catch (_e) {
    return false;
  }
}

/** 把 WorkManager 状态串（如 "ENQUEUED|runs=0"）拆成可读字段。 */
export function parseWorkState(raw) {
  const text = typeof raw === 'string' ? raw : '';
  if (!text) return { state: 'UNKNOWN', runs: 0 };
  const [state, ...rest] = text.split('|');
  let runs = 0;
  for (const part of rest) {
    const m = /^runs=(\d+)$/.exec(part);
    if (m) runs = Number(m[1]);
  }
  return { state: state || 'UNKNOWN', runs };
}

/**
 * 把体检结果翻译成一串「问题 + 该怎么处理」。
 *
 * 之所以要一次性列出全部问题（而不是只报一条）：这类故障常常是叠加的
 * ——比如既被 ROM 清掉任务、又没开精确闹钟、又不在电池白名单里，
 * 只修一条还是会复发。用户按顺序逐条处理才不会来回折腾。
 *
 * @returns {Array<{key:string, level:'error'|'warn', text:string, action:null|'reschedule'|'battery'|'refresh'}>}
 */
export function describeBackgroundDiagnosis(diag, now = Date.now()) {
  const d = diag && typeof diag === 'object' ? { ...EMPTY_DIAGNOSTICS, ...diag } : EMPTY_DIAGNOSTICS;
  const issues = [];
  const { state } = parseWorkState(d.workState);
  const ageMinutes = syncAgeMinutes(d.lastSyncAt, now);

  if (state === 'MISSING' || state === 'CANCELLED') {
    issues.push({
      key: 'work-missing',
      level: 'error',
      text: '系统里已经找不到后台刷新任务，多半是被省电策略或安全软件清掉了',
      action: 'reschedule',
    });
  } else if (state === 'FAILED' || state.startsWith('ERROR')) {
    issues.push({
      key: 'work-failed',
      level: 'error',
      text: '后台刷新任务执行失败并被系统停用',
      action: 'reschedule',
    });
  } else if (state === 'BLOCKED') {
    issues.push({
      key: 'work-blocked',
      level: 'warn',
      text: '后台刷新任务被系统阻塞，等待网络或电量条件满足',
      action: 'refresh',
    });
  }

  if (!d.batteryOptimizationIgnored) {
    issues.push({
      key: 'battery-optimized',
      level: 'warn',
      text: '本应用仍受电池优化限制，息屏后可能被冻结',
      action: 'battery',
    });
  }

  if (d.sdkInt >= 31 && !d.exactAlarmAllowed) {
    issues.push({
      key: 'exact-alarm-denied',
      level: 'warn',
      text: '系统未授予精确闹钟权限，30 分钟准点刷新降级为不确定延迟',
      action: 'battery',
    });
  }

  if (Number.isFinite(ageMinutes) && ageMinutes >= STALE_WARN_MINUTES) {
    const hours = Math.floor(ageMinutes / 60);
    const label = hours >= 1 ? `${hours} 小时` : `${Math.round(ageMinutes)} 分钟`;
    issues.push({
      key: 'stale',
      level: 'error',
      text: `已经 ${label}没成功拿到新数据`,
      action: 'refresh',
    });
  }

  if (Number.isFinite(d.failCount) && d.failCount >= FAIL_WARN_COUNT) {
    issues.push({
      key: 'failing',
      level: 'error',
      text: `连续 ${d.failCount} 次请求失败，请检查网络`,
      action: 'refresh',
    });
  }

  return issues;
}

/**
 * 把原始状态解释成一句人话 + 一个严重级别。
 *
 * @param {{lastSyncAt:number, failCount:number, lastFailAt:number}} status
 * @param {number} now
 * @returns {{level:'ok'|'pending'|'stale'|'failing', text:string, ageMinutes:number}}
 */
export function describeSyncHealth(status, now = Date.now()) {
  const safe = status && typeof status === 'object' ? status : EMPTY_STATUS;
  const failCount = Number.isFinite(safe.failCount) ? safe.failCount : 0;
  const ageMinutes = syncAgeMinutes(safe.lastSyncAt, now);

  // 连续失败优先说：这时候用户最需要知道的是「不是显示错了，是真没抓到数据」
  if (failCount >= FAIL_WARN_COUNT) {
    return {
      level: 'failing',
      text: `后台同步连续失败 ${failCount} 次，请检查网络或允许本应用后台运行`,
      ageMinutes,
    };
  }

  // 从未成功同步过（首次安装 / 缓存被清）：中性提示，别吓用户
  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) {
    return { level: 'pending', text: '', ageMinutes: -1 };
  }

  if (ageMinutes >= STALE_WARN_MINUTES) {
    const hours = Math.floor(ageMinutes / 60);
    const label = hours >= 1 ? `${hours} 小时` : `${Math.round(ageMinutes)} 分钟`;
    return {
      level: 'stale',
      text: `数据已 ${label}未更新，点刷新或检查后台权限`,
      ageMinutes,
    };
  }

  return { level: 'ok', text: '', ageMinutes };
}

export default {
  readSyncStatus,
  ensureBackgroundScheduler,
  describeSyncHealth,
  readBackgroundDiagnostics,
  describeBackgroundDiagnosis,
  openBatterySettings,
  parseWorkState,
};
