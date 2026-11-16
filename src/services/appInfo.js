/**
 * 应用自身信息（版本号）
 *
 * 版本号在三处声明：package.json / app.json / android/app/build.gradle。
 * 界面上要显示「当前版本」时绝不能写死字符串 —— 每次升级都会漏改，
 * 最后用户看到的版本和实际安装包对不上。这里优先读原生 PackageInfo.versionName
 * （也就是当前 APK 真实的 versionName），只有原生模块不可用时才退回打包期常量。
 */
import { NativeModules } from 'react-native';

/**
 * 打包期注入的兜底版本号。
 *
 * 为什么不从 package.json import：Metro 打包进 Hermes 后 import 会变成运行时解析，
 * 而这里只需要一个「原生读不到时的兜底值」，硬编码一份并让 verify_refresh.js
 * 断言它与 package.json 一致，比运行时依赖更稳。
 */
export const FALLBACK_VERSION_NAME = '1.2.7';

/** 版本号读取结果缓存，避免每次渲染都跨桥 */
let cachedInfo = null;

/**
 * 读取当前安装包版本。
 *
 * @returns {Promise<{ versionName: string, versionCode: number|null, source: 'native'|'fallback' }>}
 */
export async function getAppVersion() {
  if (cachedInfo) return cachedInfo;

  const module = NativeModules?.WeatherWidgetModule;
  if (module && typeof module.getAppVersion === 'function') {
    try {
      const raw = await module.getAppVersion();
      const versionName =
        raw && typeof raw.versionName === 'string' && raw.versionName.length > 0
          ? raw.versionName
          : FALLBACK_VERSION_NAME;
      const versionCode =
        raw && typeof raw.versionCode === 'number' && Number.isFinite(raw.versionCode)
          ? Math.round(raw.versionCode)
          : null;
      cachedInfo = { versionName, versionCode, source: 'native' };
      return cachedInfo;
    } catch (_e) {
      // 原生模块异常（例如旧安装包没这个方法）时静默退回常量
    }
  }

  cachedInfo = { versionName: FALLBACK_VERSION_NAME, versionCode: null, source: 'fallback' };
  return cachedInfo;
}

/** 仅用于测试/热重载，清掉缓存让下次重新读原生 */
export function resetAppVersionCache() {
  cachedInfo = null;
}

/**
 * 把版本号格式化成界面上直接展示的短文案。
 * @param {string} versionName
 * @returns {string} 形如 "v1.2.6"
 */
export function formatVersionLabel(versionName) {
  const text = typeof versionName === 'string' ? versionName.trim() : '';
  if (!text || text === 'unknown') return 'v—';
  return text.startsWith('v') || text.startsWith('V') ? text : `v${text}`;
}
