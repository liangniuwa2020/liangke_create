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

export default { readSyncStatus, ensureBackgroundScheduler, describeSyncHealth };
