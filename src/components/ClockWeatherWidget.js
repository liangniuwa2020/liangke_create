import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ClockWeatherWidget({
  current,
  today,
  aqi,
  city,
  onPress,
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);

      const month = now.getMonth() + 1;
      const date = now.getDate();
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = dayNames[now.getDay()];
      setDateStr(`${month}月${date}日 ${dayName}`);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!current || !today) return null;

  return (
    <TouchableOpacity
      style={styles.widgetCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* 顶部微型指示标 */}
      <View style={styles.topBar}>
        <View style={styles.widgetBadge}>
          <Ionicons name="apps-outline" size={11} color="#60a5fa" style={{ marginRight: 3 }} />
          <Text style={styles.widgetBadgeText}>墨迹 4×2 经典桌面时钟微件</Text>
        </View>
        <Text style={styles.cityPinText}>
          <Ionicons name="location" size={11} color="#ffffff" /> {city.name}
        </Text>
      </View>

      <View style={styles.bodyRow}>
        {/* 左侧：超大翻页时钟与日期 */}
        <View style={styles.clockCol}>
          <Text style={styles.clockNumbers}>{timeStr || '18:48'}</Text>
          <Text style={styles.dateLabel}>{dateStr}</Text>
        </View>

        {/* 分隔线 */}
        <View style={styles.vDivider} />

        {/* 右侧：实时气温与天气图标 */}
        <View style={styles.weatherCol}>
          <View style={styles.weatherTopRow}>
            <Ionicons
              name={current.weather.icon}
              size={32}
              color={current.weather.type === 'sunny' ? '#f59e0b' : '#ffffff'}
              style={{ marginRight: 6 }}
            />
            <View>
              <Text style={styles.tempLarge}>{current.temp}°</Text>
              <Text style={styles.conditionText}>{current.weather.label}</Text>
            </View>
          </View>

          {/* 高低气温与空气质量徽章 */}
          <View style={styles.bottomMetaRow}>
            <Text style={styles.tempRangeText}>{today.maxTemp}° / {today.minTemp}°</Text>
            {aqi && (
              <View style={[styles.aqiPill, { backgroundColor: aqi.color }]}>
                <Text style={styles.aqiPillText}>{aqi.level}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  widgetCard: {
    backgroundColor: 'rgba(7, 15, 32, 0.72)',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  widgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  widgetBadgeText: {
    fontSize: 10,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  cityPinText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockCol: {
    flex: 1,
    justifyContent: 'center',
  },
  clockNumbers: {
    fontSize: 48,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 52,
  },
  dateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  vDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 12,
  },
  weatherCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempLarge: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
  },
  conditionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  tempRangeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  aqiPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  aqiPillText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
});
