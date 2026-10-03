import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_SKIN_KEY = '@pure_moji_weather_skin_id';

// 墨迹全天气专属皮肤体系
export const SKINS = [
  {
    id: 'auto',
    name: '全天气动态感应（默认）',
    desc: '每个天气均配备独一无二的专属皮肤与动态粒子，开屏一眼看清冷暖风雨',
    tag: '智能核心',
    previewColors: ['#0284c7', '#38bdf8', '#fbbf24', '#1d4ed8'],
  },
  {
    id: 'weather_sunny',
    name: '晴朗日光 · 专属皮肤',
    desc: '湛蓝碧空，金色阳光与呼吸光晕，明媚灿烂',
    tag: '天气皮肤',
    weatherType: 'sunny',
    previewColors: ['#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd'],
  },
  {
    id: 'weather_rain',
    name: '烟雨霏霏 · 专属皮肤',
    desc: '冷冽青蓝雨幕，斜织雨丝与落水微波涟漪',
    tag: '天气皮肤',
    weatherType: 'rain',
    previewColors: ['#0c192c', '#152e4d', '#1d4ed8', '#60a5fa'],
  },
  {
    id: 'weather_thunder',
    name: '狂雷风暴 · 专属皮肤',
    desc: '电闪雷鸣，深紫黑夜与高光电弧交错',
    tag: '天气皮肤',
    weatherType: 'thunder',
    previewColors: ['#050510', '#110e2e', '#3b0764', '#a855f7'],
  },
  {
    id: 'weather_snow',
    name: '晶莹冬雪 · 专属皮肤',
    desc: '冰川冷蓝，晶莹剔透的飞舞雪花粒子',
    tag: '天气皮肤',
    weatherType: 'snow',
    previewColors: ['#1e293b', '#334155', '#7dd3fc', '#e0f2fe'],
  },
  {
    id: 'weather_cloudy',
    name: '晴空白云 · 专属皮肤',
    desc: '蔚蓝天际，洁白层云随风舒展缓移',
    tag: '天气皮肤',
    weatherType: 'cloudy',
    previewColors: ['#0369a1', '#0284c7', '#38bdf8', '#c7d2fe'],
  },
  {
    id: 'weather_sunset',
    name: '落日熔金 · 晚霞暮光',
    desc: '黄昏晚霞，紫橙晚照，绚丽唯美',
    tag: '艺术皮肤',
    weatherType: 'sunset',
    colors: ['#2e1065', '#701a75', '#a21caf', '#c2410c', '#ea580c', '#fbbf24'],
    previewColors: ['#701a75', '#c2410c', '#fbbf24'],
  },
  {
    id: 'weather_night',
    name: '纯净星河 · 璀璨月辉',
    desc: '深邃夜空，银色月轮与浩瀚星宿点缀',
    tag: '夜景皮肤',
    weatherType: 'sunny_night',
    colors: ['#030712', '#0f172a', '#1e1b4b', '#312e81', '#3b82f6'],
    previewColors: ['#030712', '#1e1b4b', '#3b82f6'],
  },
  {
    id: 'weather_aurora',
    name: '翡翠极光 · 幻夜仙境',
    desc: '极光绿与深海幽蓝交融，雅致清透',
    tag: '特别款',
    colors: ['#0a192f', '#0d324d', '#0f766e', '#14b8a6', '#2dd4bf'],
    previewColors: ['#0d324d', '#0f766e', '#2dd4bf'],
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
