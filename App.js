import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  DEFAULT_CITIES,
  fetchCompleteWeather,
} from './src/services/weatherService';
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

const STORAGE_SAVED_CITIES_KEY = '@pure_moji_weather_saved_cities';
const STORAGE_CURRENT_CITY_KEY = '@pure_moji_weather_current_city';

export default function App() {
  const [currentCity, setCurrentCity] = useState(DEFAULT_CITIES[0]);
  const [savedCities, setSavedCities] = useState(DEFAULT_CITIES.slice(0, 6));
  const [currentSkinId, setCurrentSkinId] = useState('auto');
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [isCleanModalVisible, setIsCleanModalVisible] = useState(false);
  const [isSkinModalVisible, setIsSkinModalVisible] = useState(false);
  const [isWidgetModalVisible, setIsWidgetModalVisible] = useState(false);

  // 初始化加载持久化城市数据与选中的皮肤
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
      } catch (err) {
        console.error('Failed to load storage:', err);
      }
    }
    loadInitialData();
  }, []);

  // 加载天气数据
  const loadWeather = useCallback(async (city, showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchCompleteWeather(city.latitude, city.longitude);
      setWeatherData(data);
    } catch (err) {
      console.error(err);
      setErrorMessage('网络连接异常或卫星数据同步超时，请点击重试');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 当前城市改变时重新抓取数据
  useEffect(() => {
    if (currentCity && currentCity.latitude) {
      loadWeather(currentCity);
    }
  }, [currentCity, loadWeather]);

  // 下拉刷新
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWeather(currentCity, false);
  }, [currentCity, loadWeather]);

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
            onOpenCleanModal={() => setIsCleanModalVisible(true)}
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
              {/* 0. 墨迹经典 4x2 翻页时钟天气微件 (点击直接进入小部件工坊) */}
              <ClockWeatherWidget
                current={weatherData.current}
                today={weatherData.today}
                aqi={weatherData.aqi}
                city={currentCity}
                onPress={() => setIsWidgetModalVisible(true)}
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

              {/* 3. 7~15天超长趋势预报 */}
              <DailyForecastCard daily={weatherData.daily} />

              {/* 4. 空气质量 AQI 专属监测报告卡 */}
              <AirQualityCard aqi={weatherData.aqi} />

              {/* 5. 墨迹天气灵魂：生活指数指南 (穿衣/紫外线/感冒/洗车/运动/雨伞等) */}
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
              </View>

              {/* 底部纯净承诺标语 */}
              <View style={styles.footerNote}>
                <Ionicons name="shield-checkmark" size={14} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 6 }} />
                <Text style={styles.footerText}>墨迹纯净版 · 0 广告 · 0 弹窗 · 纯粹好天气</Text>
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
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
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
