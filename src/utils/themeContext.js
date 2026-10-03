import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_SKIN_KEY = '@pure_moji_weather_skin_id';

// 6 款墨迹特色高拟真皮肤
export const SKINS = [
  {
    id: 'auto',
    name: '自然实况',
    desc: '随当地真实天气与日升日落自动切换',
    tag: '智能',
    previewColors: ['#0288d1', '#26c6da', '#4fc3f7'],
  },
  {
    id: 'classic_azure',
    name: '墨迹晴空',
    desc: '经典透亮碧空蓝，明媚阳光与清新空气',
    tag: '经典推荐',
    colors: ['#0288d1', '#03a9f4', '#29b6f6', '#4fc3f7'],
    cardBg: 'rgba(255, 255, 255, 0.22)',
    cardBorder: 'rgba(255, 255, 255, 0.35)',
    accentColor: '#fbbf24',
    previewColors: ['#0288d1', '#29b6f6', '#81d4fa'],
  },
  {
    id: 'sunset_glow',
    name: '晚霞暮光',
    desc: '日落熔金，暮云晚霞，瑰丽绚烂的黄昏色彩',
    tag: '热门',
    colors: ['#3b185f', '#7b1fa2', '#c2185b', '#e65100', '#ff9800'],
    cardBg: 'rgba(255, 255, 255, 0.18)',
    cardBorder: 'rgba(255, 255, 255, 0.3)',
    accentColor: '#ffd54f',
    previewColors: ['#7b1fa2', '#c2185b', '#ff9800'],
  },
  {
    id: 'aurora_night',
    name: '极光幻境',
    desc: '极光绿与深海蓝交相辉映，清透深邃不沉闷',
    tag: '高雅',
    colors: ['#0a192f', '#0d324d', '#0f766e', '#14b8a6', '#2dd4bf'],
    cardBg: 'rgba(255, 255, 255, 0.15)',
    cardBorder: 'rgba(45, 212, 191, 0.3)',
    accentColor: '#2dd4bf',
    previewColors: ['#0d324d', '#0f766e', '#2dd4bf'],
  },
  {
    id: 'cherry_blossom',
    name: '樱粉晨曦',
    desc: '微风轻拂粉樱，温暖浪漫的春日朝阳',
    tag: '清新',
    colors: ['#4a0e2e', '#831843', '#be185d', '#ec4899', '#f472b6'],
    cardBg: 'rgba(255, 255, 255, 0.2)',
    cardBorder: 'rgba(255, 255, 255, 0.35)',
    accentColor: '#fef08a',
    previewColors: ['#831843', '#ec4899', '#fbcfe8'],
  },
  {
    id: 'deep_galaxy',
    name: '璀璨星夜',
    desc: '深邃纯净夜空，繁星漫天，明月皎洁',
    tag: '护眼',
    colors: ['#0b132b', '#1c2541', '#2b3a67', '#3a506b', '#486581'],
    cardBg: 'rgba(255, 255, 255, 0.14)',
    cardBorder: 'rgba(255, 255, 255, 0.25)',
    accentColor: '#60a5fa',
    previewColors: ['#0b132b', '#2b3a67', '#60a5fa'],
  },
];

// 获取当前皮肤配置
export function getSkinConfig(skinId) {
  return SKINS.find(s => s.id === skinId) || SKINS[0];
}

// 保存皮肤选择
export async function saveSelectedSkin(skinId) {
  try {
    await AsyncStorage.setItem(STORAGE_SKIN_KEY, skinId);
  } catch (err) {
    console.error('Failed to save skin:', err);
  }
}

// 加载皮肤选择
export async function loadSelectedSkin() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_SKIN_KEY);
    return val || 'auto';
  } catch (err) {
    return 'auto';
  }
}
