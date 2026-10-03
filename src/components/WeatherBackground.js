import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSkinConfig } from '../utils/themeContext';

const { width, height } = Dimensions.get('window');

// 升级版：高透亮、鲜活沉浸的墨迹天空色系
export const WEATHER_THEMES = {
  sunny_day: {
    colors: ['#0288d1', '#03a9f4', '#29b6f6', '#4fc3f7', '#81d4fa'],
  },
  sunset: {
    colors: ['#2e1065', '#701a75', '#a21caf', '#c2410c', '#f59e0b', '#fde047'],
  },
  sunny_night: {
    // 璀璨夜空，拒绝死黑死灰，呈现深宝石蓝与月辉
    colors: ['#0a1128', '#14213d', '#1f3160', '#2d427d', '#3f5799'],
  },
  cloudy_day: {
    colors: ['#1e3c72', '#2a5298', '#3b6998', '#5482a9', '#74b9ff'],
  },
  cloudy_night: {
    colors: ['#0f172a', '#1e293b', '#2e3d5b', '#3e527a'],
  },
  overcast: {
    colors: ['#253342', '#33475b', '#486581', '#627d98'],
  },
  rain: {
    colors: ['#14243b', '#1e3c72', '#2a5298', '#3867d6'],
  },
  thunder: {
    colors: ['#0f172a', '#1e1b4b', '#312e81', '#4338ca'],
  },
  snow: {
    colors: ['#283c50', '#3b5998', '#54728c', '#83a4d4', '#b6fbff'],
  },
  fog: {
    colors: ['#334155', '#475569', '#64748b', '#829ab1'],
  },
};

export default function WeatherBackground({
  weatherType = 'sunny',
  isDay = true,
  skinId = 'auto',
  children,
}) {
  // 检查是否应用了用户自选皮肤
  const activeSkin = getSkinConfig(skinId);
  const isCustomSkin = activeSkin && activeSkin.id !== 'auto' && activeSkin.colors;

  // 判断是否处于日落黄昏时间段 (17:20 - 19:15)
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isSunsetTime = (currentHour === 17 && currentMinute >= 20) || currentHour === 18 || (currentHour === 19 && currentMinute <= 15);

  let themeColors;
  if (isCustomSkin) {
    themeColors = activeSkin.colors;
  } else {
    let themeKey = 'sunny_day';
    if (weatherType === 'rain') {
      themeKey = 'rain';
    } else if (weatherType === 'thunder') {
      themeKey = 'thunder';
    } else if (weatherType === 'snow') {
      themeKey = 'snow';
    } else if (weatherType === 'fog') {
      themeKey = 'fog';
    } else if (weatherType === 'overcast') {
      themeKey = 'overcast';
    } else if (weatherType === 'cloudy') {
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

  // 雨滴动画
  const dropAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (weatherType === 'rain' || weatherType === 'snow') {
      const animations = dropAnims.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: weatherType === 'rain' ? 850 : 2300,
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    }
  }, [weatherType]);

  // 太阳/光晕呼吸动画 (晴天白天)
  const sunPulse = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    if (isDay && weatherType === 'sunny') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sunPulse, { toValue: 1.15, duration: 3000, useNativeDriver: true }),
          Animated.timing(sunPulse, { toValue: 0.85, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isDay, weatherType]);

  // 星光微光闪烁动画 (夜间)
  const starGlow = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!isDay) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(starGlow, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(starGlow, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
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

      {/* 晴天白天：动态太阳与光晕渲染 */}
      {isDay && weatherType === 'sunny' && (
        <View pointerEvents="none" style={styles.sunContainer}>
          <Animated.View style={[styles.sunGlow, { transform: [{ scale: sunPulse }] }]} />
          <View style={styles.sunCore} />
        </View>
      )}

      {/* 晴朗夜空：明月与璀璨星宿 */}
      {!isDay && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {/* 月亮 */}
          <View style={styles.moonContainer}>
            <Ionicons name="moon" size={38} color="#fef08a" style={styles.moonIcon} />
            <View style={styles.moonHalo} />
          </View>
          {/* 星星 */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: starGlow }]}>
            <View style={[styles.star, { top: 70, left: 60, width: 3, height: 3 }]} />
            <View style={[styles.star, { top: 110, right: 100, width: 2, height: 2 }]} />
            <View style={[styles.star, { top: 140, left: 160, width: 4, height: 4, borderRadius: 2 }]} />
            <View style={[styles.star, { top: 210, right: 50, width: 3, height: 3 }]} />
            <View style={[styles.star, { top: 290, left: 80, width: 2, height: 2 }]} />
            <View style={[styles.star, { top: 360, right: 120, width: 3, height: 3 }]} />
          </Animated.View>
        </View>
      )}

      {/* 雨天动态雨丝粒子效果 */}
      {weatherType === 'rain' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {dropAnims.map((anim, idx) => {
            const leftPos = (width / 8) * idx + 14;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, height],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.1, 0.85, 1],
              outputRange: [0, 0.65, 0.65, 0],
            });
            return (
              <Animated.View
                key={`rain-${idx}`}
                style={[
                  styles.rainDrop,
                  {
                    left: leftPos,
                    opacity,
                    transform: [{ translateY }, { rotate: '12deg' }],
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* 雪天飘雪粒子效果 */}
      {weatherType === 'snow' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {dropAnims.map((anim, idx) => {
            const leftPos = (width / 8) * idx + 15;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, height],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.15, 0.85, 1],
              outputRange: [0, 0.8, 0.8, 0],
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
    top: 30,
    right: 30,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(254, 240, 138, 0.25)',
  },
  sunCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fde047',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  moonContainer: {
    position: 'absolute',
    top: 40,
    right: 40,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(254, 240, 138, 0.15)',
  },
  rainDrop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 1,
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 3,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});
