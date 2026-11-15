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
  loadSelectedSkin,
  saveSelectedSkin,
} from './src/utils/themeContext';
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
import SkinThemeModal from './src/components/SkinThemeModal';
import WidgetCenterModal from './src/components/WidgetCenterModal';
import DailyDetailModal from './src/components/DailyDetailModal';

const STORAGE_SAVED_CITIES_KEY = '@pure_moji_weather_saved_cities';
const STORAGE_CURRENT_CITY_KEY = '@pure_moji_weather_current_city';

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
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const lastRefreshTimestampRef = useRef(0);

  // 用 ref 镜像最新的城市与刷新状态，避免定时器因依赖变化被反复销毁重建
  const currentCityRef = useRef(currentCity);
  const isRefreshingRef = useRef(false);
  // 下拉刷新里已经主动拉过的城市 id：用来让下面的 currentCity useEffect 跳过一次，
  // 避免同一份数据被请求两遍（同时也修掉「刷新指示器提前消失」的时序问题）。
  const skipCityLoadRef = useRef(null);

  // 记录最近一次成功刷新的时间（在 effect 中初始化，避免 render 期间调用 Date.now()）
  useEffect(() => {
    lastRefreshTimestampRef.current = Date.now();
  }, []);

  useEffect(() => {
    currentCityRef.current = currentCity;
  }, [currentCity]);

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

  // 初始化加载持久化城市数据与选中的皮肤，并自动执行 GPS 定位
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [storedList, storedCurrent, storedSkin] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SAVED_CITIES_KEY),
          AsyncStorage.getItem(STORAGE_CURRENT_CITY_KEY),
          loadSelectedSkin(),
        ]);

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
          }
        }
        if (storedSkin) {
          setCurrentSkinId(storedSkin);
        }

        // 每次打开软件，自动根据 GPS 获取高精度当前位置并更新天气
        autoDetectLocation(true);
      } catch (err) {
        console.error('Failed to load storage:', err);
      }
    }
    loadInitialData();
  }, [autoDetectLocation]);

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
  // 注意：这里只依赖稳定的 handleRefresh，绝不能把 currentCity 放进依赖数组，
  // 否则每次 GPS 定位更新城市都会销毁并重建定时器，导致定时器永远等不到触发（历史 bug）。
  useEffect(() => {
    console.log(`[AutoRefresh] 已启动 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟自动刷新定时器`);
    const timer = setInterval(() => {
      if (isRefreshingRef.current) return;
      console.log(`[AutoRefresh] 达到 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟，自动刷新天气并同步至桌面小部件`);
      handleRefresh();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      console.log('[AutoRefresh] 清理自动刷新定时器');
      clearInterval(timer);
    };
  }, [handleRefresh]);

  // 前台恢复监听：若软件切回前台时距离上次刷新已超过 30 分钟，自动刷新
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const elapsed = Date.now() - lastRefreshTimestampRef.current;
        if (elapsed >= AUTO_REFRESH_INTERVAL_MS) {
          console.log(`[AppState] 超过 ${AUTO_REFRESH_INTERVAL_MINUTES} 分钟切回前台，自动刷新天气`);
          handleRefresh();
        }
      }
    });
    return () => sub.remove();
  }, [handleRefresh]);

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
            onOpenCityModal={() => setIsCityModalVisible(true)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenSkinModal={() => setIsSkinModalVisible(true)}
            onOpenWidgetModal={() => setIsWidgetModalVisible(true)}
          />

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

              {/* 3. 7~15天超长趋势预报 - 点击某天查看详情 */}
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

          {/* 7-15天单日天气详情弹窗 */}
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
});
