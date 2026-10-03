import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSkinConfig } from '../utils/themeContext';

const { width, height } = Dimensions.get('window');

// 针对每种天气专门调配的高辨识度、鲜明沉浸的专属天气皮肤色系
export const WEATHER_THEMES = {
  sunny_day: {
    name: '晴朗日光',
    colors: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
    accent: '#f59e0b',
  },
  sunny_night: {
    name: '纯净星夜',
    colors: ['#030712', '#0f172a', '#1e1b4b', '#312e81', '#3b82f6'],
    accent: '#fef08a',
  },
  sunset: {
    name: '落日晚霞',
    colors: ['#2e1065', '#701a75', '#a21caf', '#c2410c', '#ea580c', '#fbbf24'],
    accent: '#fde047',
  },
  cloudy_day: {
    name: '晴空白云',
    colors: ['#0369a1', '#0284c7', '#38bdf8', '#93c5fd', '#c7d2fe'],
    accent: '#38bdf8',
  },
  cloudy_night: {
    name: '夜云流影',
    colors: ['#090d16', '#111827', '#1e293b', '#2e3d5b', '#3b5078'],
    accent: '#94a3b8',
  },
  overcast: {
    name: '层云密布',
    colors: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],
    accent: '#cbd5e1',
  },
  rain: {
    name: '烟雨霏霏',
    colors: ['#0c192c', '#152e4d', '#1d4ed8', '#2563eb', '#60a5fa'],
    accent: '#60a5fa',
  },
  thunder: {
    name: '雷暴轰鸣',
    colors: ['#050510', '#110e2e', '#241442', '#3b0764', '#581c87'],
    accent: '#a855f7',
  },
  snow: {
    name: '冬日飞雪',
    colors: ['#1e293b', '#334155', '#475569', '#64748b', '#93c5fd', '#e2e8f0'],
    accent: '#e0f2fe',
  },
  fog: {
    name: '晨雾霭霭',
    colors: ['#292524', '#44403c', '#57534e', '#78716c', '#a8a29e'],
    accent: '#d6d3d1',
  },
};

export default function WeatherBackground({
  weatherType = 'sunny',
  isDay = true,
  skinId = 'auto',
  children,
}) {
  // 检查是否选用了固定自定义皮肤
  const activeSkin = getSkinConfig(skinId);
  const isFixedSkin = activeSkin && activeSkin.id !== 'auto' && !activeSkin.weatherType && activeSkin.colors;

  // 判断是否处于日落黄昏时间段 (17:20 - 19:15)
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isSunsetTime = (currentHour === 17 && currentMinute >= 20) || currentHour === 18 || (currentHour === 19 && currentMinute <= 15);

  // 决定当前生效的动态天气类型
  let effectiveWeatherType = weatherType;
  if (activeSkin && activeSkin.weatherType) {
    effectiveWeatherType = activeSkin.weatherType;
  }

  let themeColors;
  if (isFixedSkin) {
    themeColors = activeSkin.colors;
  } else {
    let themeKey = 'sunny_day';
    if (effectiveWeatherType === 'rain') {
      themeKey = 'rain';
    } else if (effectiveWeatherType === 'thunder') {
      themeKey = 'thunder';
    } else if (effectiveWeatherType === 'snow') {
      themeKey = 'snow';
    } else if (effectiveWeatherType === 'fog') {
      themeKey = 'fog';
    } else if (effectiveWeatherType === 'overcast') {
      themeKey = 'overcast';
    } else if (effectiveWeatherType === 'cloudy') {
      themeKey = isDay ? 'cloudy_day' : 'cloudy_night';
    } else {
      if (isSunsetTime) {
        themeKey = 'sunset';
      } else {
        themeKey = isDay ? 'sunny_day' : 'sunny_night';
      }
    }
    themeColors = (WEATHER_THEMES[themeKey] || WEATHER_THEMES.sunny_day).colors;
  }

  // 1. 雨滴下落粒子动画
  const dropAnims = useRef([
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0),
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0),
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (effectiveWeatherType === 'rain' || effectiveWeatherType === 'thunder' || effectiveWeatherType === 'snow') {
      const animations = dropAnims.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(index * 160),
            Animated.timing(anim, {
              toValue: 1,
              duration: effectiveWeatherType === 'snow' ? 2400 : 750,
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    }
  }, [effectiveWeatherType]);

  // 2. 雷暴特有的电闪雷鸣闪烁动画 (Thunderstorm lightning flash)
  const lightningOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (effectiveWeatherType === 'thunder') {
      const lightningLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(3500),
          Animated.timing(lightningOpacity, { toValue: 0.85, duration: 60, useNativeDriver: true }),
          Animated.timing(lightningOpacity, { toValue: 0.15, duration: 40, useNativeDriver: true }),
          Animated.timing(lightningOpacity, { toValue: 0.75, duration: 50, useNativeDriver: true }),
          Animated.timing(lightningOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(5000),
          Animated.timing(lightningOpacity, { toValue: 0.9, duration: 70, useNativeDriver: true }),
          Animated.timing(lightningOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ])
      );
      lightningLoop.start();
      return () => lightningLoop.stop();
    }
  }, [effectiveWeatherType]);

  // 3. 晴天太阳呼吸光晕动画
  const sunPulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    if (isDay && effectiveWeatherType === 'sunny') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sunPulse, { toValue: 1.15, duration: 2800, useNativeDriver: true }),
          Animated.timing(sunPulse, { toValue: 0.9, duration: 2800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isDay, effectiveWeatherType]);

  // 4. 多云飘云动画 (Horizontal drifting clouds)
  const cloudDrift1 = useRef(new Animated.Value(-80)).current;
  const cloudDrift2 = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    if (effectiveWeatherType === 'cloudy' || effectiveWeatherType === 'overcast') {
      Animated.loop(
        Animated.timing(cloudDrift1, {
          toValue: width + 100,
          duration: 35000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(4000),
          Animated.timing(cloudDrift2, {
            toValue: width + 120,
            duration: 42000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [effectiveWeatherType]);

  // 5. 夜空繁星呼吸微光
  const starGlow = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!isDay) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(starGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(starGlow, { toValue: 0.35, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isDay]);

  return (
    <View style={styles.container}>
      {/* 渐变底色 */}
      <LinearGradient
        colors={themeColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ☀️ 晴天白天：专属耀眼金色阳光与流光光晕 */}
      {isDay && effectiveWeatherType === 'sunny' && (
        <View pointerEvents="none" style={styles.sunContainer}>
          <Animated.View style={[styles.sunGlow, { transform: [{ scale: sunPulse }] }]} />
          <View style={styles.sunCore} />
        </View>
      )}

      {/* 🌙 晴朗星夜：银河深蓝、皎洁明月与璀璨星宿 */}
      {!isDay && (effectiveWeatherType === 'sunny' || effectiveWeatherType === 'cloudy') && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={styles.moonContainer}>
            <Ionicons name="moon" size={40} color="#fef08a" style={styles.moonIcon} />
            <View style={styles.moonHalo} />
          </View>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: starGlow }]}>
            <View style={[styles.star, { top: 60, left: 50, width: 3, height: 3 }]} />
            <View style={[styles.star, { top: 100, right: 110, width: 2, height: 2 }]} />
            <View style={[styles.star, { top: 140, left: 180, width: 4, height: 4, borderRadius: 2 }]} />
            <View style={[styles.star, { top: 220, right: 40, width: 3, height: 3 }]} />
            <View style={[styles.star, { top: 290, left: 70, width: 2, height: 2 }]} />
            <View style={[styles.star, { top: 350, right: 130, width: 3, height: 3 }]} />
          </Animated.View>
        </View>
      )}

      {/* ⛅ 多云与阴天：层云流影缓移效果 */}
      {(effectiveWeatherType === 'cloudy' || effectiveWeatherType === 'overcast') && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[styles.driftingCloud, { top: 70, transform: [{ translateX: cloudDrift1 }] }]}>
            <Ionicons name="cloud" size={80} color="rgba(255, 255, 255, 0.28)" />
          </Animated.View>
          <Animated.View style={[styles.driftingCloud, { top: 130, transform: [{ translateX: cloudDrift2 }] }]}>
            <Ionicons name="cloud" size={110} color="rgba(255, 255, 255, 0.22)" />
          </Animated.View>
        </View>
      )}

      {/* ⛈️ 雷暴：闪电全屏瞬闪效果 */}
      {effectiveWeatherType === 'thunder' && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#e0e7ff', opacity: lightningOpacity },
          ]}
        />
      )}

      {/* 🌧️ 雨天：密集斜落雨丝粒子 */}
      {(effectiveWeatherType === 'rain' || effectiveWeatherType === 'thunder') && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {dropAnims.map((anim, idx) => {
            const leftPos = (width / 10) * idx + 12;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-35, height],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.1, 0.85, 1],
              outputRange: [0, 0.7, 0.7, 0],
            });
            return (
              <Animated.View
                key={`rain-${idx}`}
                style={[
                  styles.rainDrop,
                  {
                    left: leftPos,
                    opacity,
                    transform: [{ translateY }, { rotate: '14deg' }],
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* ❄️ 雪天：晶莹雪花飘落粒子 */}
      {effectiveWeatherType === 'snow' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {dropAnims.map((anim, idx) => {
            const leftPos = (width / 10) * idx + 14;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, height],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.15, 0.85, 1],
              outputRange: [0, 0.85, 0.85, 0],
            });
            return (
              <Animated.View
                key={`snow-${idx}`}
                style={[
                  styles.snowFlake,
                  {
                    left: leftPos,
                    opacity,
                    transform: [{ translateY }],
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* 🌫️ 雾天：柔和漂浮薄霭 */}
      {effectiveWeatherType === 'fog' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={styles.fogBandTop} />
          <View style={styles.fogBandBottom} />
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sunContainer: {
    position: 'absolute',
    top: 25,
    right: 25,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
  },
  sunCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fde047',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
  },
  moonContainer: {
    position: 'absolute',
    top: 35,
    right: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moonIcon: {
    transform: [{ rotate: '-15deg' }],
  },
  moonHalo: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(254, 240, 138, 0.2)',
  },
  driftingCloud: {
    position: 'absolute',
  },
  rainDrop: {
    position: 'absolute',
    top: 0,
    width: 2.2,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 1,
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    width: 7,
    height: 7,
    backgroundColor: '#ffffff',
    borderRadius: 3.5,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  fogBandTop: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  fogBandBottom: {
    position: 'absolute',
    top: 260,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
