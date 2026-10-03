import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CurrentWeatherCard({
  current,
  today,
  aqi,
  shortTermRain,
  onPressAqi,
}) {
  if (!current) return null;

  return (
    <View style={styles.container}>
      {/* 核心气温与天气状况 */}
      <View style={styles.mainInfo}>
        <View style={styles.tempRow}>
          <Text style={styles.tempText}>{current.temp}</Text>
          <Text style={styles.degreeSymbol}>°</Text>
        </View>

        <Text style={styles.weatherCondition}>{current.weather.label}</Text>

        {/* 高低温与体感温度 */}
        <View style={styles.tempRangeRow}>
          <Text style={styles.tempRangeText}>
            最高 {today.maxTemp}°  最低 {today.minTemp}°
          </Text>
          <View style={styles.divider} />
          <Text style={styles.tempRangeText}>
            体感 {current.apparentTemp}°
          </Text>
        </View>

        {/* 墨迹经典指标胶囊条：空气质量 + 风级 + 湿度 */}
        <View style={styles.tagPillsRow}>
          <TouchableOpacity
            style={[styles.aqiPill, { backgroundColor: aqi ? aqi.bgColor : 'rgba(0,0,0,0.2)' }]}
            onPress={onPressAqi}
            activeOpacity={0.8}
          >
            <View style={[styles.aqiDot, { backgroundColor: aqi ? aqi.color : '#2ecc71' }]} />
            <Text style={styles.aqiText}>
              AQI {aqi ? aqi.aqi : '--'} {aqi ? aqi.level : '优'}
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#ffffff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <View style={styles.infoPill}>
            <Ionicons name="compass-outline" size={13} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.pillText}>
              {current.windDirection} {current.windScale.text}
            </Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="water-outline" size={13} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.pillText}>湿度 {current.humidity}%</Text>
          </View>
        </View>
      </View>

      {/* 墨迹天气灵魂：短时降雨/出行提醒通知横幅 */}
      {shortTermRain && (
        <View style={styles.shortTermBanner}>
          <View style={[styles.badgeIndicator, { backgroundColor: shortTermRain.color }]}>
            <Ionicons
              name={shortTermRain.hasRain ? 'umbrella' : 'sunny'}
              size={13}
              color="#ffffff"
            />
          </View>
          <Text style={styles.shortTermText} numberOfLines={1}>
            {shortTermRain.summary}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  mainInfo: {
    alignItems: 'center',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tempText: {
    fontSize: 88,
    fontWeight: '200',
    color: '#ffffff',
    lineHeight: 96,
    letterSpacing: -2,
  },
  degreeSymbol: {
    fontSize: 40,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
  },
  weatherCondition: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
    letterSpacing: 1,
  },
  tempRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tempRangeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 10,
  },
  tagPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  aqiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  aqiDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  aqiText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  pillText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  shortTermBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  badgeIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  shortTermText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
});
