import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// 各种天气对应的沉浸式墨迹风格渐变色系
export const WEATHER_THEMES = {
  sunny_day: {
    colors: ['#2980b9', '#3498db', '#5dade2', '#85c1e9'],
    statusBarStyle: 'light',
  },
  sunny_night: {
    colors: ['#0b132b', '#1c2541', '#283c5e', '#3a506b'],
    statusBarStyle: 'light',
  },
  cloudy_day: {
    colors: ['#2c3e50', '#34495e', '#4a6572', '#5d7685'],
    statusBarStyle: 'light',
  },
  cloudy_night: {
    colors: ['#131a28', '#1a233a', '#222d48', '#2d3b5d'],
    statusBarStyle: 'light',
  },
  overcast: {
    colors: ['#37474f', '#455a64', '#546e7a', '#607d8b'],
    statusBarStyle: 'light',
  },
  rain: {
    colors: ['#1a2a3a', '#20364f', '#2c4763', '#3d5c7e'],
    statusBarStyle: 'light',
  },
  thunder: {
    colors: ['#0d131f', '#161e31', '#1f2a44', '#2d2e46'],
    statusBarStyle: 'light',
  },
  snow: {
    colors: ['#2c3e50', '#3e5871', '#54728c', '#839baf'],
    statusBarStyle: 'light',
  },
  fog: {
    colors: ['#3e4a52', '#4f5d66', '#62727b', '#788992'],
    statusBarStyle: 'light',
  },
};

export default function WeatherBackground({ weatherType = 'sunny', isDay = true, children }) {
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
    themeKey = isDay ? 'sunny_day' : 'sunny_night';
  }

  const currentTheme = WEATHER_THEMES[themeKey] || WEATHER_THEMES.sunny_day;

  // 雨滴或雪花动画
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
            Animated.delay(index * 220),
            Animated.timing(anim, {
              toValue: 1,
              duration: weatherType === 'rain' ? 850 : 2200,
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    }
  }, [weatherType]);

  // 星光微光闪烁动画 (夜间晴天)
  const starGlow = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!isDay && weatherType === 'sunny') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(starGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(starGlow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isDay, weatherType]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentTheme.colors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 雨天动态雨丝粒子效果 */}
      {weatherType === 'rain' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {dropAnims.map((anim, idx) => {
            const leftPos = (width / 8) * idx + 12;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, height],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.1, 0.85, 1],
              outputRange: [0, 0.6, 0.6, 0],
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
              outputRange: [0, 0.75, 0.75, 0],
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

      {/* 夜间星光点缀效果 */}
      {!isDay && weatherType === 'sunny' && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: starGlow }]}>
          <View style={[styles.star, { top: 80, left: 60, width: 3, height: 3 }]} />
          <View style={[styles.star, { top: 120, right: 80, width: 2, height: 2 }]} />
          <View style={[styles.star, { top: 160, left: 180, width: 4, height: 4 }]} />
          <View style={[styles.star, { top: 220, right: 40, width: 3, height: 3 }]} />
          <View style={[styles.star, { top: 300, left: 90, width: 2, height: 2 }]} />
        </Animated.View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rainDrop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 1,
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 3,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});
