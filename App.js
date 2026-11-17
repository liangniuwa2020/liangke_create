import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  NativeModules,
  AppState,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  DEFAULT_CITIES,
  fetchCompleteWeather,
} from './src/services/weatherService';
import { getAutoCurrentLocation } from './src/services/locationService';
import {
  parseNativeCache,
  nativePayloadToWeather,
  decideForegroundRefresh,
  shouldRunWatchdogTick,
  formatNextRefreshHint,
  AUTO_REFRESH_WATCHDOG_MS,
} from './src/services/refreshPolicy';
import {
  loadSelectedSkin,
  saveSelectedSkin,
} from './src/utils/themeContext';
import { getAppVersion, formatVersionLabel } from './src/services/appInfo';
import {
  readSyncStatus,
  describeSyncHealth,
} from './src/services/syncHealth';
import WeatherBackground from './src/components/WeatherBackground';
import HeaderBar from './src/components/HeaderBar';
import ClockWeatherWidget from './src/components/ClockWeatherWidget';
import CurrentWeatherCard from './src/components/CurrentWeatherCard';
import HourlyForecastCard from './src/components/HourlyForecastCard';
import DailyForecastCard from './src/components/DailyForecastCard';
import AirQualityCard from './src/components/AirQualityCard';
import LivingIndicesCard from './src/components/LivingIndicesCard';
import WeatherDetailsGrid from './src/components/WeatherDetailsGrid';
import CityManageModal from './src/components/CityManageModal';
import AboutCleanModal from './src/components/AboutCleanModal';
import BackgroundHealthModal from './src/components/BackgroundHealthModal';
import SkinThemeModal from './src/components/SkinThemeModal';
import WidgetCenterModal from './src/components/WidgetCenterModal';
import DailyDetailModal from './src/components/DailyDetailModal';

const STORAGE_SAVED_CITIES_KEY = '@pure_moji_weather_saved_cities';
const STORAGE_CURRENT_CITY_KEY = '@pure_moji_weather_current_city';
// 最近一次完整天气快照：冷启动/息屏唤醒时先拿它上屏，避免白屏或显示昨天的数据
const STORAGE_LAST_WEATHER_KEY = '@pure_moji_weather_last_weather';

// 全局统一的自动刷新周期：30 分钟（与原生小部件、界面文案保持一致）
export const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
export const AUTO_REFRESH_INTERVAL_MINUTES = AUTO_REFRESH_INTERVAL_MS / 60000;

// 默认高精度南昌基准点
const NANCHANG_DEFAULT = {
  id: 'nanchang_gps',
  name: '南昌市',
  city: '南昌',
  district: '',
  street: '',
  admin1: '江西省',
  country: '中国',
  latitude: 28.6829,
  longitude: 115.8906,
  isGps: true,
};

export default function App() {
  const [currentCity, setCurrentCity] = useState(NANCHANG_DEFAULT);
  // 基准南昌用 NANCHANG_DEFAULT 这一份，其余默认城市里必须剔除同名同城项，
  // 否则首启列表会出现两条南昌（历史 bug：id 不同、名称不同，按 name 去重拦不住）。
  const [savedCities, setSavedCities] = useState([
    NANCHANG_DEFAULT,
    ...DEFAULT_CITIES.filter((c) => c.id !== 'nanchang' && c.name !== NANCHANG_DEFAULT.city).slice(0, 5),
  ]);
  const [currentSkinId, setCurrentSkinId] = useState('auto');
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [isCleanModalVisible, setIsCleanModalVisible] = useState(false);
  const [isSkinModalVisible, setIsSkinModalVisible] = useState(false);
  const [isWidgetModalVisible, setIsWidgetModalVisible] = useState(false);
  const [isDailyDetailVisible, setIsDailyDetailVisible] = useState(false);
  // 后台保活体检面板：用户过夜数据不刷新时，在这里看到 WorkManager/电池/闹钟的真实状态
  const [isHealthModalVisible, setIsHealthModalVisible] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const lastRefreshTimestampRef = useRef(0);
  // 当前安装包的真实版本号（从原生 PackageInfo 读，不写死）
  const [versionLabel, setVersionLabel] = useState('');
  // 距下次自动刷新的提示，由看门狗每拍更新，让用户能确认定时器真的在跑
  const [nextRefreshHint, setNextRefreshHint] = useState('');
  // 后台同步健康度：数据陈旧 / 连续失败时给出可执行提示，而不是静默显示旧数据
  const [syncHealth, setSyncHealth] = useState({ level: 'ok', text: '', ageMinutes: -1 });

  // 用 ref 镜像最新的城市与刷新状态，避免定时器因依赖变化被反复销毁重建
  const currentCityRef = useRef(currentCity);
  const isRefreshingRef = useRef(false);
  // 镜像最新的天气数据，供 hydrateFromCache 判断「逐日列表是否还从今天开始」
  const weatherDataRef = useRef(null);
  // 下拉刷新里已经主动拉过的城市 id：用来让下面的 currentCity useEffect 跳过一次，
  // 避免同一份数据被请求两遍（同时也修掉「刷新指示器提前消失」的时序问题）。
  const skipCityLoadRef = useRef(null);

  // 记录最近一次成功刷新的时间（在 effect 中初始化，避免 render 期间调用 Date.now()）
  useEffect(() => {
    lastRefreshTimestampRef.current = Date.now();
  }, []);

  // 读取当前安装包版本号并显示在顶部信息栏
  useEffect(() => {
    let alive = true;
    getAppVersion()
      .then((info) => {
        if (alive) setVersionLabel(formatVersionLabel(info.versionName));
      })
      .catch(() => {
        if (alive) setVersionLabel(formatVersionLabel(''));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    currentCityRef.current = currentCity;
  }, [currentCity]);

  // 同理镜像天气数据：跨夜判断需要读到最新一份 daily 的首日日期
  useEffect(() => {
    weatherDataRef.current = weatherData;
  }, [weatherData]);

  // 同步维护「刷新中」状态与 ref（ref 立即生效，避免 useState 异步导致的并发重入）
  const setRefreshing = useCallback((value) => {
    isRefreshingRef.current = value;
    setIsRefreshing(value);
  }, []);

  // 自动根据 GPS / 网络高精度定位当前位置
  const autoDetectLocation = useCallback(async (isSilent = false) => {
    try {
      const loc = await getAutoCurrentLocation();
      if (loc && loc.latitude && loc.longitude) {
        const prev = currentCityRef.current;
        // 位置没有实质变化时不重复 setState，避免无意义的重渲染与重复请求
        const unchanged =
          prev &&
          prev.id === loc.id &&
          Math.abs((prev.latitude || 0) - loc.latitude) < 1e-4 &&
          Math.abs((prev.longitude || 0) - loc.longitude) < 1e-4;

        if (!unchanged) {
          setCurrentCity(loc);
          currentCityRef.current = loc;
          AsyncStorage.setItem(STORAGE_CURRENT_CITY_KEY, JSON.stringify(loc)).catch(console.error);
        }
        return loc;
      }
    } catch (err) {
      if (!isSilent) console.warn('Auto GPS location failed:', err);
    }
    return null;
  }, []);

  // 从本地快照 + 原生后台缓存里「补水」：让界面立刻有内容，再静默联网更新。
  // 息屏过夜后回到 App 的第一帧就是新数据，而不是昨天的旧数据或空白页。
  //
  // 两层缓存各司其职，必须叠加使用而不是二选一：
  //   · AsyncStorage 快照 = 完整结构（30 天预报、生活指数、短时降水），但只在上次
  //     打开 App 时写入，可能很旧；
  //   · 原生 SharedPreferences = 后台每 30 分钟刷新的精简结构（当前温度/AQI/7天/24小时），
  //     最新但字段少。
  // 所以先拿快照当底座，再用原生缓存覆盖温度/天气/AQI —— 既有完整度又有新鲜度。
  const hydrateFromCache = useCallback(async (city) => {
    // 1) 先读 AsyncStorage 的完整快照当底座
    let base = null;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_LAST_WEATHER_KEY);
      if (stored) {
        const snapshot = JSON.parse(stored);
        if (snapshot && snapshot.data && typeof snapshot.data === 'object') {
          // 快照来自另一个城市时不要拿来顶替当前城市，避免串城市
          if (!city || !snapshot.cityId || snapshot.cityId === city.id) {
            base = snapshot.data;
            if (typeof snapshot.savedAt === 'number') {
              lastRefreshTimestampRef.current = Math.max(
                lastRefreshTimestampRef.current,
                snapshot.savedAt
              );
            }
          }
        }
      }
    } catch (e) {
      console.log('Read weather snapshot failed:', e);
    }

    // 2) 再用原生后台缓存覆盖最新观测值（它比快照新，且 App 被杀掉也在更新）
    let nativeApplied = false;
    try {
      const nativeModule = NativeModules.WeatherWidgetModule;
      if (nativeModule && nativeModule.readCachedWeather) {
        const raw = await nativeModule.readCachedWeather();
        const parsed = parseNativeCache(raw);
        // 原生缓存里的城市与当前城市不一致时跳过（用户刚切了城市，别拿旧城市顶上）
        const cacheCity = parsed && parsed.payload ? parsed.payload.city : null;
        const cityLabel = city ? city.city || city.name : null;
        const cityMatches =
          !cacheCity || !cityLabel || cacheCity.indexOf(cityLabel) >= 0 || cityLabel.indexOf(cacheCity) >= 0;

        if (parsed && cityMatches) {
          base = nativePayloadToWeather(parsed.payload, base);
          nativeApplied = true;
          lastRefreshTimestampRef.current = Math.max(
            lastRefreshTimestampRef.current,
            parsed.lastSyncAt
          );
        }
      }
    } catch (e) {
      console.log('Read native cache failed:', e);
    }

    if (base) {
      setWeatherData(base);
      // 有缓存就不再显示整页 loading，用户能立刻看到内容
      setIsLoading(false);
    }
    return { weather: base, nativeApplied };
  }, []);

  // 初始化加载持久化城市数据与选中的皮肤，并自动执行 GPS 定位
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [storedList, storedCurrent, storedSkin] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SAVED_CITIES_KEY),
          AsyncStorage.getItem(STORAGE_CURRENT_CITY_KEY),
          loadSelectedSkin(),
        ]);

        let initialCity = NANCHANG_DEFAULT;
        if (storedList) {
          const parsed = JSON.parse(storedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedCities(parsed);
          }
        }
        if (storedCurrent) {
          const parsedCur = JSON.parse(storedCurrent);
          if (parsedCur && parsedCur.latitude) {
            setCurrentCity(parsedCur);
            initialCity = parsedCur;
          }
        }
        if (storedSkin) {
          setCurrentSkinId(storedSkin);
        }

        // 先上屏缓存，再联网；这样「冷启动 + 弱网」也不会白屏等 10 秒
        await hydrateFromCache(initialCity);

        // 每次打开软件，自动根据 GPS 获取高精度当前位置并更新天气
        autoDetectLocation(true);
      } catch (err) {
        console.error('Failed to load storage:', err);
      }
    }
    loadInitialData();
  }, [autoDetectLocation, hydrateFromCache]);

  // 加载天气数据
  const loadWeather = useCallback(async (city, showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchCompleteWeather(city.latitude, city.longitude);
      setWeatherData(data);

      // 同步更新 Android 原生桌面小部件 (4x3, 4x2 与 4x1)
      if (NativeModules.WeatherWidgetModule && NativeModules.WeatherWidgetModule.updateWidgetData) {
        try {
          const forecast7dPayload = (data.daily || []).slice(0, 7).map((d, idx) => ({
            title: idx === 0 ? '今天' : (idx === 1 ? '明天' : (idx === 2 ? '后天' : (d.dayName || d.displayDate || '周一'))),
            date: d.monthDay || '',
            desc: d.weather?.label || '晴',
            type: d.weather?.type || 'sunny',
            maxTemp: d.maxTemp,
            minTemp: d.minTemp,
          }));

          const hourly24Payload = (data.hourly || []).slice(0, 24).map(h => ({
            time: h.displayTime || '现在',
            temp: h.temp,
            desc: h.weather?.label || '晴',
            type: h.weather?.type || 'sunny',
            rainProb: h.rainProb || 0,
          }));

          const savedWidgetSkin = await AsyncStorage.getItem('@pure_moji_weather_widget_skin') || 'dark';

          const widgetPayload = {
            city: city.name,
            skin: savedWidgetSkin,
            latitude: city.latitude,
            longitude: city.longitude,
            temp: data.current?.temp ?? 24,
            weatherDesc: data.current?.weather?.label || '晴朗',
            weatherType: data.current?.weather?.type || 'sunny',
            maxTemp: data.today?.maxTemp ?? 26,
            minTemp: data.today?.minTemp ?? 15,
            rainProb: data.current?.rainProb ?? data.today?.rainProb ?? 0,
            aqi: data.aqi?.aqi || 32,
            aqiLevel: data.aqi?.level || '优',
            windInfo: `${data.current?.windDirection || '微风'} ${data.current?.windScale?.text || '2级'} ${data.current?.windSpeed ? data.current.windSpeed + 'km/h' : ''}`.trim(),
            humidityInfo: `湿度 ${data.current?.humidity || 48}%`,
            airDesc: data.aqi ? `空气质量${data.aqi.level}` : '体感舒适',
            // 原生侧展示时会自己拼「 更新」后缀，这里只能给纯时间，
            // 兜底值也必须是不带后缀的 HH:mm，否则会出现「刚刚更新 更新」。
            updateTime:
              data.current?.updateTime ||
              new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            forecast: forecast7dPayload,
            forecast7d: forecast7dPayload,
            hourly24: hourly24Payload,
          };
          NativeModules.WeatherWidgetModule.updateWidgetData(JSON.stringify(widgetPayload));
        } catch (we) {
          console.log('Update widget error:', we);
        }
      }
      lastRefreshTimestampRef.current = Date.now();

      // 落一份完整快照：冷启动、息屏唤醒、断网时先用它上屏，
      // 保证用户看到的至少不是空白页，也不会是「昨天的数据还挂着不提示」。
      AsyncStorage.setItem(
        STORAGE_LAST_WEATHER_KEY,
        JSON.stringify({ savedAt: Date.now(), cityId: city.id, data })
      ).catch((e) => console.log('Persist weather snapshot failed:', e));
    } catch (err) {
      console.error(err);
      setErrorMessage('网络连接异常或卫星数据同步超时，请点击重试');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [setRefreshing]);

  // 当前城市改变时重新抓取数据（放到下一个宏任务，顺带合并短时间内连续的定位变更）
  useEffect(() => {
    if (!currentCity || !currentCity.latitude) return undefined;
    // 下拉刷新/自动刷新已经用新坐标主动拉过数据时，跳过一次，避免同一份数据请求两遍
    if (skipCityLoadRef.current === currentCity.id) {
      skipCityLoadRef.current = null;
      return undefined;
    }
    const timer = setTimeout(() => {
      loadWeather(currentCity);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentCity, loadWeather]);

  // 下拉刷新与微件主动刷新 (如果是 GPS 定位，同时重新扫描高精度 GPS 与当前街道)
  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    setRefreshing(true);

    try {
      let city = currentCityRef.current;

      if (city?.isGps) {
        try {
          const freshLoc = await autoDetectLocation(true);
          // 定位 id 是按经纬度生成的稳定值：id 变了才代表位置真的变了。
          // 位置变了就用新坐标直接刷新，并登记跳过标记让 currentCity 的 effect 不重复请求，
          // 这样「刷新中」状态能一直覆盖到数据真正回来，不会提前收起下拉指示器。
          if (freshLoc && freshLoc.id !== city.id) {
            skipCityLoadRef.current = freshLoc.id;
            city = freshLoc;
          }
        } catch (_e) {
          // 定位失败则退回用当前城市直接刷新
        }
      }

      await loadWeather(city, false);
    } finally {
      // 兜底：无论走哪条分支都复位刷新态，避免「刷新中」卡死导致后续自动刷新全部被跳过
      setRefreshing(false);
    }
  }, [autoDetectLocation, loadWeather, setRefreshing]);

  // 核心需求：每 30 分钟自动刷新一次软件，更新天气状态并同步至桌面小部件
  //
  // 历史 bug（v1.2.6 修复）：旧写法是 setInterval(handleRefresh, 30 分钟)。
  // 计时是挂在「定时器对象」上的 —— handleRefresh 的 useCallback 依赖
  // (autoDetectLocation / loadWeather / setRefreshing) 只要身份变化一次，React 就会
  // 执行 cleanup → clearInterval → 重建定时器，30 分钟从头开始数；再加上 Android 上
  // JS 定时器在息屏/后台会被冻结，用户看到的直接结果就是「不点刷新就永远停在 16 点」。
  //
  // 现在改成「看门狗轮询 + 绝对时间戳判定」：
  //   · 每 60 秒醒一次，只做一次纯计算 Date.now() - lastRefreshTimestampRef.current；
  //   · 差值达到 30 分钟才真正联网刷新；
  //   · 定时器无论被重建多少次，计时基准都是那个绝对时间戳，不会被清零。
  // handleRefresh 通过 ref 调用，所以定时器 effect 的依赖数组可以保持为空 —— 它永远
  // 不会因为闭包/身份变化被销毁重建。
  const handleRefreshRef = useRef(null);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  useEffect(() => {
    console.log(`[AutoRefresh] 已启动 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟自动刷新看门狗（${Math.round(AUTO_REFRESH_WATCHDOG_MS / 1000)} 秒轮询一次）`);

    const refreshHint = () => {
      setNextRefreshHint(
        formatNextRefreshHint(lastRefreshTimestampRef.current, AUTO_REFRESH_INTERVAL_MS)
      );
    };

    // 读原生侧的同步健康度（最近成功时间 / 连续失败次数）。
    // 这一拍不联网、只读 SharedPreferences，开销可以忽略，所以每轮都做：
    // 用户看到「数据已 12 小时未更新」时，才知道该去点刷新还是该去改后台权限。
    const refreshSyncHealth = () => {
      readSyncStatus()
        .then((raw) => setSyncHealth(describeSyncHealth(raw)))
        .catch(() => {});
    };

    const tick = () => {
      const ageMs = Date.now() - lastRefreshTimestampRef.current;
      const due = shouldRunWatchdogTick({
        lastRefreshAt: lastRefreshTimestampRef.current,
        now: Date.now(),
        intervalMs: AUTO_REFRESH_INTERVAL_MS,
        isRefreshing: isRefreshingRef.current,
      });

      // 无论是否到期都刷新一次倒计时文案：这行字就是用户判断「定时器还活着」的依据
      refreshHint();
      refreshSyncHealth();

      if (!due) return;

      console.log(
        `[AutoRefresh] 距上次成功刷新 ${Math.round(ageMs / 60000)} 分钟，达到 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟阈值，自动刷新天气并同步至桌面小部件`
      );
      const runner = handleRefreshRef.current;
      if (typeof runner === 'function') runner();
    };

    // 进入前台后先自检一次：不等满 60 秒，避免「刚打开就显示旧数据」
    tick();
    const timer = setInterval(tick, AUTO_REFRESH_WATCHDOG_MS);
    return () => {
      console.log('[AutoRefresh] 清理自动刷新看门狗');
      clearInterval(timer);
    };
  }, []);

  // 前台恢复监听：息屏/后台回到前台时，先用缓存补水再联网刷新。
  //
  // 历史 bug（v1.2.5 修复）：屏幕熄灭后 JS 引擎被系统冻结，App 内的 setInterval
  // 完全不会跑；旧代码又只在「elapsed >= 30 分钟」且「联网成功」时才更新界面，
  // 于是用户睡一觉醒来看到的是昨天的数据，甚至时间还停在昨晚。
  // 现在：①原生侧有 30 分钟闹钟 + 亮屏广播持续抓取并落缓存；
  //      ②回到前台先 hydrateFromCache() 立刻显示缓存；
  //      ③只要时间戳过期（含系统时间倒退）就强制联网刷新。
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;

      const elapsed = Date.now() - lastRefreshTimestampRef.current;

      // 两条判据缺一不可：
      //   · 时间戳过期（含系统时间被改到过去）→ 数据确实旧了；
      //   · 逐日列表首日不是今天 → 整夜待机虽然原生缓存很新，列表却还停在昨天。
      const decision = decideForegroundRefresh({
        lastRefreshAt: lastRefreshTimestampRef.current,
        now: Date.now(),
        intervalMs: AUTO_REFRESH_INTERVAL_MS,
        daily: weatherDataRef.current ? weatherDataRef.current.daily : null,
      });

      if (!decision.shouldRefresh) return;

      if (decision.reason === 'cross-midnight') {
        console.log('[AppState] 逐日列表已跨天（首日不是今天），强制联网重新拉取');
      } else {
        console.log(
          `[AppState] 切回前台（距上次 ${Math.round(elapsed / 60000)} 分钟，阈值 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟），先补缓存再刷新天气`
        );
      }

      // 先补缓存让界面立即变新，再发起联网刷新
      hydrateFromCache(currentCityRef.current).finally(() => {
        handleRefresh();
      });
    });
    return () => sub.remove();
  }, [handleRefresh, hydrateFromCache]);

  // 切换选中城市
  const handleSelectCity = (city) => {
    setCurrentCity(city);
    AsyncStorage.setItem(STORAGE_CURRENT_CITY_KEY, JSON.stringify(city)).catch(console.error);
  };

  // 添加城市到收藏
  const handleAddCity = (city) => {
    setSavedCities((prev) => {
      const exists = prev.some((c) => c.name === city.name);
      if (exists) return prev;
      const updated = [city, ...prev];
      AsyncStorage.setItem(STORAGE_SAVED_CITIES_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  // 移除城市
  const handleRemoveCity = (city) => {
    setSavedCities((prev) => {
      const updated = prev.filter((c) => c.name !== city.name);
      AsyncStorage.setItem(STORAGE_SAVED_CITIES_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  // 切换皮肤
  const handleSelectSkin = (skinId) => {
    setCurrentSkinId(skinId);
    saveSelectedSkin(skinId);
  };

  const weatherType = weatherData?.current?.weather?.type || 'sunny';
  const isDay = weatherData?.current?.isDay ?? true;

  return (
    <SafeAreaProvider>
      <WeatherBackground weatherType={weatherType} isDay={isDay} skinId={currentSkinId}>
        <StatusBar style="light" translucent />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* 顶部导航控制条 */}
          <HeaderBar
            city={currentCity}
            updateTime={weatherData?.current?.updateTime}
            versionLabel={versionLabel}
            nextRefreshHint={nextRefreshHint}
            onOpenCityModal={() => setIsCityModalVisible(true)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenSkinModal={() => setIsSkinModalVisible(true)}
            onOpenWidgetModal={() => setIsWidgetModalVisible(true)}
          />

          {/* 后台同步健康度告警条
              用户「睡一觉起来还是昨晚的数据」时，光看一个 HH:mm 分辨不出是
              「一直没跑」「跑了但失败」还是「跑成功了但数据本身是旧的」。
              这里把原生侧的连续失败次数 / 陈旧时长直接摊开，并给一个恢复动作。
              点条身或「查看原因」都能打开体检面板，看到 WorkManager 与电池白名单的真实状态。 */}
          {syncHealth.level !== 'ok' && syncHealth.text ? (
            <TouchableOpacity
              style={styles.healthBar}
              activeOpacity={0.85}
              onPress={() => setIsHealthModalVisible(true)}
            >
              <Ionicons
                name={syncHealth.level === 'failing' ? 'alert-circle-outline' : 'time-outline'}
                size={14}
                color={syncHealth.level === 'failing' ? '#fca5a5' : '#fcd34d'}
              />
              <Text style={styles.healthText} numberOfLines={2}>
                {syncHealth.text}
              </Text>
              <View style={styles.healthBtn}>
                <Text style={styles.healthBtnText}>查看原因</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 加载中状态 */}
          {isLoading && !weatherData ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingTip}>正在从卫星气象中心同步数据...</Text>
            </View>
          ) : errorMessage && !weatherData ? (
            /* 错误提示与重试状态 */
            <View style={styles.centerContainer}>
              <Ionicons name="cloud-offline-outline" size={60} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadWeather(currentCity)}
              >
                <Text style={styles.retryBtnText}>重新加载</Text>
              </TouchableOpacity>
            </View>
          ) : !weatherData ? (
            /* 兜底：无数据且无错误信息时也给出重试入口，避免 weatherData.current 空指针 */
            <View style={styles.centerContainer}>
              <Ionicons name="cloud-offline-outline" size={60} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.errorText}>暂无天气数据</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadWeather(currentCity)}
              >
                <Text style={styles.retryBtnText}>重新加载</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* 核心天气内容滚动区 */
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#ffffff"
                  colors={['#ffffff']}
                />
              }
            >
              {/* 0. 经典 4x2 翻页时钟天气微件 (支持微件原地刷新与 30 分钟自动更新，无需弹出) */}
              <ClockWeatherWidget
                current={weatherData.current}
                today={weatherData.today}
                aqi={weatherData.aqi}
                city={currentCity}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />

              {/* 1. 核心大字温度与即时天气状况 */}
              <CurrentWeatherCard
                current={weatherData.current}
                today={weatherData.today}
                aqi={weatherData.aqi}
                shortTermRain={weatherData.shortTermRain}
                onPressAqi={() => {
                  // 点击 AQI 胶囊唤起小部件或详细提示
                }}
              />

              {/* 2. 24小时逐小时精准天气 */}
              <HourlyForecastCard hourly={weatherData.hourly} />

              {/* 3. 30天天气预报（前16天高精度 + 后14天季节趋势） - 点击某天查看详情 */}
              <DailyForecastCard
                daily={weatherData.daily}
                onPressDay={(day) => {
                  setSelectedDayDetail(day);
                  setIsDailyDetailVisible(true);
                }}
              />

              {/* 4. 空气质量 AQI 专属监测报告卡 */}
              <AirQualityCard aqi={weatherData.aqi} />

              {/* 5. 天气 App 灵魂：生活指数指南 (穿衣/紫外线/感冒/洗车/运动/雨伞等) */}
              <LivingIndicesCard indices={weatherData.livingIndices} />

              {/* 6. 深度气象指标 (湿度/风向/气压/日出日落) */}
              <WeatherDetailsGrid
                current={weatherData.current}
                today={weatherData.today}
              />

              {/* 底部功能条：快速更换皮肤与微件 */}
              <View style={styles.quickBar}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setIsSkinModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="color-palette" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.quickBtnText}>更换皮肤主题</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setIsWidgetModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="apps" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.quickBtnText}>桌面小部件工坊</Text>
                </TouchableOpacity>

                {/* 纯净承诺说明：AboutCleanModal 之前没有任何入口，用户永远点不开 */}
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setIsCleanModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.quickBtnText}>纯净承诺</Text>
                </TouchableOpacity>

                {/* 后台体检：过夜数据不刷新时，用来确认 WorkManager/电池/闹钟的真实状态 */}
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setIsHealthModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pulse" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.quickBtnText}>后台体检</Text>
                </TouchableOpacity>
              </View>

              {/* 底部纯净承诺标语 */}
              <View style={styles.footerNote}>
                <Ionicons name="shield-checkmark" size={14} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 6 }} />
                <Text style={styles.footerText}>无广告天气 · 0 广告 · 0 弹窗 · 纯粹好天气</Text>
              </View>
            </ScrollView>
          )}

          {/* 城市管理弹窗 */}
          <CityManageModal
            visible={isCityModalVisible}
            onClose={() => setIsCityModalVisible(false)}
            currentCity={currentCity}
            savedCities={savedCities}
            onSelectCity={handleSelectCity}
            onRemoveCity={handleRemoveCity}
            onAddCity={handleAddCity}
          />

          {/* 纯净版介绍弹窗 */}
          <AboutCleanModal
            visible={isCleanModalVisible}
            onClose={() => setIsCleanModalVisible(false)}
            versionLabel={versionLabel}
          />

          {/* 后台保活体检弹窗 */}
          <BackgroundHealthModal
            visible={isHealthModalVisible}
            onClose={() => setIsHealthModalVisible(false)}
            onManualRefresh={handleRefresh}
          />

          {/* 皮肤中心弹窗 */}
          <SkinThemeModal
            visible={isSkinModalVisible}
            onClose={() => setIsSkinModalVisible(false)}
            currentSkinId={currentSkinId}
            onSelectSkin={handleSelectSkin}
          />

          {/* 小部件工坊弹窗 */}
          <WidgetCenterModal
            visible={isWidgetModalVisible}
            onClose={() => setIsWidgetModalVisible(false)}
            current={weatherData?.current}
            today={weatherData?.today}
            aqi={weatherData?.aqi}
            city={currentCity}
          />

          {/* 30天逐日天气详情弹窗 */}
          <DailyDetailModal
            visible={isDailyDetailVisible}
            onClose={() => setIsDailyDetailVisible(false)}
            day={selectedDayDetail}
            allDays={weatherData?.daily || []}
            onSelectDay={(day) => {
              setSelectedDayDetail(day);
            }}
          />
        </SafeAreaView>
      </WeatherBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingTip: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 14,
    fontWeight: '500',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickBar: {
    flexDirection: 'row',
    // 三个按钮（皮肤 / 微件 / 纯净承诺）在窄屏上会超出宽度，允许换行
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 16, 32, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  quickBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  // 后台同步健康度告警条：只在数据陈旧 / 连续失败时出现，平时不占地方
  healthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  healthText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255, 255, 255, 0.88)',
    marginLeft: 6,
    marginRight: 8,
  },
  healthBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  healthBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
});
