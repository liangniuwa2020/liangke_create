/**
 * 自动刷新策略（纯函数模块）
 *
 * 把「什么时候该刷新」「缓存有多旧」「原生缓存是否可用」这类判断从 App.js 里抽出来，
 * 一是让 App.js 的 useEffect 保持精简，二是这些规则可以脱离 React 直接被测试覆盖
 * （scripts/test_refresh_policy.mjs）。
 */

/** 前台恢复时，缓存超过这个倍数就算「明显过期」，界面上要提示用户 */
export const STALE_CACHE_FACTOR = 1;

function isValidTimestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * 从后台/息屏状态回到前台时，是否需要立刻联网刷新。
 *
 * 历史 bug（v1.2.5 修复）：屏幕熄灭后 JS 引擎会被系统冻结，App 内的 setInterval
 * 根本不会跑；用户睡一觉醒来，App 里还是昨天的数据。修复思路是：
 *   1) 原生侧用「一次性精确闹钟 + 系统重复兜底闹钟 + 亮屏广播」保证 30 分钟一次后台抓取；
 *   2) App 回到前台时不再只看 30 分钟阈值，只要时间戳无效/过期/倒退就强制刷新。
 *
 * @param {object} options
 * @param {number} options.lastRefreshAt 上次成功刷新的毫秒时间戳
 * @param {number} [options.now] 当前毫秒时间戳
 * @param {number} options.intervalMs 刷新周期（毫秒）
 * @returns {boolean} true 表示应该立刻刷新
 */
export function shouldRefreshOnForeground({ lastRefreshAt, now = Date.now(), intervalMs }) {
  if (!isValidTimestamp(lastRefreshAt)) return true;
  if (!isValidTimestamp(now)) return true;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return true;

  const elapsed = now - lastRefreshAt;
  // 时间为负说明系统时间被改过（用户手动调时间 / 时区跳变），一律当作过期处理
  if (elapsed < 0) return true;
  return elapsed >= intervalMs;
}

/**
 * 距离上次同步过了多久（分钟，向下取整）。
 * @returns {number} 无效时间戳返回 -1
 */
export function syncAgeMinutes(lastSyncAt, now = Date.now()) {
  if (!isValidTimestamp(lastSyncAt) || !isValidTimestamp(now)) return -1;
  const age = now - lastSyncAt;
  if (age < 0) return 0;
  return Math.floor(age / 60000);
}

/**
 * 把「多久以前同步过」格式化成中文短文案，用于界面上的缓存提示。
 */
export function formatSyncAge(lastSyncAt, now = Date.now()) {
  const minutes = syncAgeMinutes(lastSyncAt, now);
  if (minutes < 0) return '时间未知';
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest === 0 ? `${hours} 小时前` : `${hours} 小时 ${rest} 分钟前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

/**
 * 判断缓存是否已经明显过期（超过一个刷新周期），用于决定要不要在界面上提示。
 */
export function isCacheStale(lastSyncAt, intervalMs, now = Date.now()) {
  const minutes = syncAgeMinutes(lastSyncAt, now);
  if (minutes < 0) return true;
  return minutes * 60 * 1000 >= intervalMs * STALE_CACHE_FACTOR;
}

/**
 * 判断逐日预报列表是否还「从今天开始」。
 *
 * 为什么需要它：原生后台缓存只覆盖当前温度/天气/AQI，逐日列表来自上一次完整刷新
 * 落下的快照。如果用户跨夜（昨晚 23:00 最后一次完整刷新，今早 08:00 打开），
 * 原生缓存是新鲜的，逐日列表的 [0] 却还停在昨天 —— 界面第一行会写着「今天」加昨天的日期。
 * 所以只要发现列表首日不是今天，就必须强制联网重拉。
 *
 * @param {Array} daily 逐日预报数组（含 dateStr，形如 2026-11-16）
 * @param {Date} [today] 当前日期
 * @returns {boolean} true 表示覆盖到今天（无需因此强制刷新）
 */
export function isDailyCoveringToday(daily, today = new Date()) {
  if (!Array.isArray(daily) || daily.length === 0) return false;

  const first = daily[0];
  if (!first || typeof first.dateStr !== 'string') {
    // 无日期信息（例如来自原生缓存的精简结构）时无法判断，视为可用，
    // 避免每次回前台都无脑打一次网络请求。
    return true;
  }

  const now = today instanceof Date ? today : new Date(today);
  if (Number.isNaN(now.getTime())) return true;

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return first.dateStr === `${y}-${m}-${d}`;
}

/**
 * 回前台到底要不要刷新：把「时间戳过期」和「逐日列表跨夜」两条判据合到一个纯函数里。
 *
 * 为什么要合：只看时间戳是不够的。整夜待机时原生侧一直在按 30 分钟抓取，缓存时间戳
 * 可能只有几分钟，于是时间判据认为「很新鲜、不用刷」，但逐日列表还是昨晚落下的那份，
 * 第一行写着「今天」配昨天的日期。反过来只看日期也不行 —— App 在后台待了 2 小时、
 * 日期没变但数据确实旧了。
 *
 * @param {object} params
 * @param {number} params.lastRefreshAt 最近一次成功刷新（或原生同步）的毫秒时间戳
 * @param {number} [params.now] 当前毫秒时间戳
 * @param {number} params.intervalMs 刷新周期（30 分钟）
 * @param {Array} [params.daily] 当前逐日预报列表
 * @returns {{ shouldRefresh: boolean, reason: 'interval'|'cross-midnight'|'both'|null,
 *            timeExpired: boolean, dailyCrossedMidnight: boolean, ageMinutes: number }}
 */
export function decideForegroundRefresh({ lastRefreshAt, now = Date.now(), intervalMs, daily }) {
  const timeExpired = shouldRefreshOnForeground({ lastRefreshAt, now, intervalMs });
  const dailyCrossedMidnight = !isDailyCoveringToday(daily, new Date(now));
  const ageMinutes = syncAgeMinutes(lastRefreshAt, now);

  let reason = null;
  if (timeExpired && dailyCrossedMidnight) reason = 'both';
  else if (timeExpired) reason = 'interval';
  else if (dailyCrossedMidnight) reason = 'cross-midnight';

  return {
    shouldRefresh: timeExpired || dailyCrossedMidnight,
    reason,
    timeExpired,
    dailyCrossedMidnight,
    ageMinutes,
  };
}

/**
 * 解析原生侧 readCachedWeather() 的返回值。
 *
 * 原生后台线程即使 App 处于息屏/被杀状态，也会按 30 分钟把最新天气写进 SharedPreferences，
 * 并把写入时间存进 widget_last_sync_at。这里做一层防御式解析：
 * 字段类型不对、JSON 坏掉、时间戳未来值都返回 null，绝不让脏数据进入 React state。
 *
 * @param {any} raw NativeModules.WeatherWidgetModule.readCachedWeather() 的返回值
 * @param {number} [now] 当前毫秒时间戳
 * @returns {{ payload: object, lastSyncAt: number, ageMinutes: number } | null}
 */
export function parseNativeCache(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;

  const lastSyncAt = typeof raw.lastSyncAt === 'number' ? Math.floor(raw.lastSyncAt) : 0;
  if (!isValidTimestamp(lastSyncAt)) return null;
  // 时间戳比现在还晚超过 5 分钟，说明数据不可信（系统时间被改过 / 缓存被伪造）
  if (lastSyncAt - now > 5 * 60 * 1000) return null;

  if (typeof raw.data !== 'string' || raw.data.length === 0) return null;

  let payload;
  try {
    payload = JSON.parse(raw.data);
  } catch (_e) {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;

  // 至少要有温度和更新时间，否则这份缓存没有展示价值
  const hasTemp = typeof payload.temp === 'number' && Number.isFinite(payload.temp);
  const hasUpdateTime = typeof payload.updateTime === 'string' && payload.updateTime.length > 0;
  if (!hasTemp || !hasUpdateTime) return null;

  return {
    payload,
    lastSyncAt,
    ageMinutes: syncAgeMinutes(lastSyncAt, now),
  };
}

/** 原生缓存里只有天气类型（type），这里补出对应的 Ionicons 图标名 */
const TYPE_TO_ICON = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  overcast: 'cloud',
  fog: 'water',
  rain: 'rainy',
  snow: 'snow',
  thunder: 'thunderstorm',
};

function iconFromType(type) {
  return TYPE_TO_ICON[type] || 'partly-sunny';
}

/**
 * 原生缓存把湿度存成展示文案（`湿度 48%`），这里反解出数值。
 * 解析不出来就返回 null，让调用方沿用旧值。
 */
function parseHumidity(humidityInfo) {
  if (typeof humidityInfo !== 'string') return null;
  const m = humidityInfo.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const value = Number(m[1]);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

/**
 * 原生缓存的 `windInfo` 形如 `东北风 2级 12km/h`。
 * 拆出风向、风力等级与风速；缺失时对应字段为 null。
 */
function parseWind(windInfo) {
  const result = { windDirection: null, windScale: null, windSpeed: null };
  if (typeof windInfo !== 'string' || windInfo.length === 0) return result;

  const dirMatch = windInfo.match(/([东南西北]{1,2}风|无持续风向|微风)/);
  if (dirMatch) result.windDirection = dirMatch[1];

  const scaleMatch = windInfo.match(/(\d{1,2})\s*级/);
  if (scaleMatch) result.windScale = { text: `${scaleMatch[1]}级`, level: Number(scaleMatch[1]) };

  const speedMatch = windInfo.match(/([\d.]+)\s*km\/h/i);
  if (speedMatch) result.windSpeed = Number(speedMatch[1]);

  return result;
}

/**
 * 把原生后台缓存（小部件用的精简 payload）合并成页面可用的天气结构。
 *
 * 为什么需要这一步：原生侧每 30 分钟在后台抓一次，抓的字段是小部件需要的那一套
 * （当前温度、天气、AQI、7 天、24 小时），没有 30 天逐日、生活指数、短时降水。
 * 所以策略是「用缓存覆盖能覆盖的部分，其余沿用上一次的完整数据」；
 * 如果连上一次的完整数据都没有（冷启动且网络失败），就用缓存拼一份最小可展示结构，
 * 保证用户至少能看到今天的温度与天气，而不是空白页或昨天的数据。
 *
 * @param {object} payload 原生缓存 payload
 * @param {object|null} prevWeather 当前 React state 里的完整天气数据
 * @returns {object} 合并后的天气数据
 */
export function nativePayloadToWeather(payload, prevWeather) {
  if (!payload || typeof payload !== 'object') return prevWeather || null;

  const prev = prevWeather && typeof prevWeather === 'object' ? prevWeather : null;
  const weatherType = payload.weatherType || 'sunny';
  const weatherLabel = payload.weatherDesc || '晴';

  const hourlyFromCache = Array.isArray(payload.hourly24)
    ? payload.hourly24.map((h, idx) => ({
        timeStr: null,
        displayTime: h.time || (idx === 0 ? '现在' : `${String(idx).padStart(2, '0')}:00`),
        temp: typeof h.temp === 'number' ? h.temp : null,
        rainProb: typeof h.rainProb === 'number' ? h.rainProb : 0,
        weather: { label: h.desc || weatherLabel, type: h.type || weatherType, icon: iconFromType(h.type || weatherType) },
      }))
    : [];

  const dailyFromCache = Array.isArray(payload.forecast7d) ? payload.forecast7d : payload.forecast;
  const dailyList = Array.isArray(dailyFromCache)
    ? dailyFromCache.map((d, idx) => ({
        dateStr: null,
        dayName: d.title || (idx === 0 ? '今天' : `第 ${idx + 1} 天`),
        monthDay: d.date || '',
        maxTemp: typeof d.maxTemp === 'number' ? d.maxTemp : null,
        minTemp: typeof d.minTemp === 'number' ? d.minTemp : null,
        weather: { label: d.desc || weatherLabel, type: d.type || weatherType, icon: iconFromType(d.type || weatherType) },
        rainProb: 0,
        uvMax: 0,
        sunrise: '06:00',
        sunset: '18:30',
        isExtended: false,
        fromCache: true,
      }))
    : [];

  const prevCurrent = prev && prev.current ? prev.current : {};
  const prevToday = prev && prev.today ? prev.today : {};
  const prevAqi = prev && prev.aqi ? prev.aqi : {};

  // 原生缓存里的湿度/风是展示文案（"湿度 48%" / "东北风 2级 12km/h"），
  // 尽量反解成结构化的值；解不出来才沿用旧数据，避免整块信息停在旧值上。
  const cachedHumidity = parseHumidity(payload.humidityInfo);
  const cachedWind = parseWind(payload.windInfo);

  return {
    ...(prev || {}),
    current: {
      ...prevCurrent,
      temp: typeof payload.temp === 'number' ? payload.temp : prevCurrent.temp,
      humidity: cachedHumidity !== null ? cachedHumidity : prevCurrent.humidity ?? null,
      weather: {
        label: weatherLabel,
        type: weatherType,
        icon: iconFromType(weatherType),
      },
      rainProb: typeof payload.rainProb === 'number' ? payload.rainProb : prevCurrent.rainProb ?? 0,
      isDay: prevCurrent.isDay ?? true,
      windDirection: cachedWind.windDirection || prevCurrent.windDirection || null,
      windScale: cachedWind.windScale || prevCurrent.windScale || null,
      windSpeed:
        cachedWind.windSpeed !== null && cachedWind.windSpeed !== undefined
          ? cachedWind.windSpeed
          : prevCurrent.windSpeed ?? null,
      updateTime: payload.updateTime,
      fromCache: true,
    },
    today: {
      ...prevToday,
      maxTemp: typeof payload.maxTemp === 'number' ? payload.maxTemp : prevToday.maxTemp,
      minTemp: typeof payload.minTemp === 'number' ? payload.minTemp : prevToday.minTemp,
      rainProb: typeof payload.rainProb === 'number' ? payload.rainProb : prevToday.rainProb,
    },
    // 只有上一次完全没有完整数据时才用缓存里的精简列表兜底，避免把 30 天预报降级成 7 天
    hourly: prev && Array.isArray(prev.hourly) && prev.hourly.length > 0 ? prev.hourly : hourlyFromCache,
    daily: prev && Array.isArray(prev.daily) && prev.daily.length > 0 ? prev.daily : dailyList,
    aqi: {
      ...prevAqi,
      aqi: typeof payload.aqi === 'number' ? payload.aqi : prevAqi.aqi,
      level: payload.aqiLevel || prevAqi.level || '优',
    },
  };
}

