import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DailyForecastCard({ daily = [] }) {
  if (!daily || daily.length === 0) return null;

  // 计算全局最低温与最高温用于绘制相对温度条
  const allMins = daily.map(d => d.minTemp);
  const allMaxs = daily.map(d => d.maxTemp);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const totalSpan = Math.max(globalMax - globalMin, 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calendar-outline" size={17} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.title}>7-15天趋势预报</Text>
        </View>
        <Text style={styles.subtitle}>中长期数值预报</Text>
      </View>

      <View style={styles.list}>
        {daily.map((item, index) => {
          const isToday = index === 0;

          // 计算温度条的偏移与宽度百分比
          const leftPercent = Math.max(0, ((item.minTemp - globalMin) / totalSpan) * 100);
          const widthPercent = Math.max(18, (((item.maxTemp - item.minTemp) / totalSpan) * 100));

          return (
            <View key={`daily-${item.dateStr}-${index}`} style={[styles.dayRow, index !== daily.length - 1 && styles.borderBottom]}>
              {/* 日期列 */}
              <View style={styles.dateCol}>
                <Text style={[styles.dayName, isToday && styles.highlightText]}>
                  {item.dayName}
                </Text>
                <Text style={styles.monthDay}>{item.monthDay}</Text>
              </View>

              {/* 天气状况与图标 */}
              <View style={styles.weatherCol}>
                <Ionicons
                  name={item.weather.icon}
                  size={20}
                  color={item.weather.type === 'sunny' ? '#f39c12' : '#ffffff'}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.conditionText} numberOfLines={1}>
                  {item.weather.label}
                </Text>
              </View>

              {/* 降雨概率标签 */}
              <View style={styles.rainCol}>
                {item.rainProb > 0 ? (
                  <View style={styles.rainBadge}>
                    <Ionicons name="water" size={9} color="#60a5fa" />
                    <Text style={styles.rainBadgeText}>{item.rainProb}%</Text>
                  </View>
                ) : null}
              </View>

              {/* 高低温及温度可视化进度条 */}
              <View style={styles.tempRangeCol}>
                <Text style={styles.minTempText}>{item.minTemp}°</Text>
                
                {/* 可视化温度条轨道 */}
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={['#5dade2', '#f39c12']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.barFill,
                      {
                        left: `${leftPercent * 0.7}%`,
                        width: `${Math.min(widthPercent, 100 - leftPercent * 0.7)}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.maxTempText}>{item.maxTemp}°</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  list: {
    width: '100%',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateCol: {
    width: 60,
  },
  dayName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  highlightText: {
    color: '#60a5fa',
  },
  monthDay: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  weatherCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 82,
  },
  conditionText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    flex: 1,
  },
  rainCol: {
    width: 44,
    alignItems: 'center',
  },
  rainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.22)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  rainBadgeText: {
    fontSize: 9,
    color: '#93c5fd',
    fontWeight: '600',
    marginLeft: 2,
  },
  tempRangeCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  minTempText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    width: 28,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    marginHorizontal: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  maxTempText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    width: 28,
    textAlign: 'left',
  },
});
