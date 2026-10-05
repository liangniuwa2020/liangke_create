import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ClockWeatherWidget({
  current,
  today,
  aqi,
  city,
  onRefresh,
  isRefreshing,
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // 1 秒钟时钟跳动刷新
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

  // 默认 1 个小时 (3600秒) 自动刷新一次微件气象数据
  useEffect(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const autoRefreshTimer = setInterval(() => {
      if (onRefresh && !isRefreshing) {
        console.log('[ClockWeatherWidget] 1小时自动刷新微件数据');
        onRefresh();
      }
    }, ONE_HOUR);
    return () => clearInterval(autoRefreshTimer);
  }, [onRefresh, isRefreshing]);

  if (!current || !today) return null;

  return (
    <View style={styles.widgetCard}>
      {/* 顶部微型指示标与小挂件原地刷新按钮 */}
      <View style={styles.topBar}>
        <View style={styles.widgetBadge}>
          <Ionicons name="apps-outline" size={11} color="#60a5fa" style={{ marginRight: 3 }} />
          <Text style={styles.widgetBadgeText}>墨迹 4×2 经典桌面时钟微件</Text>
        </View>

        <View style={styles.topRightActions}>
          <Text style={styles.cityPinText}>
            <Ionicons name="location" size={11} color="#ffffff" /> {city?.name || '本地'}
          </Text>

          {/* 小挂件原地刷新按钮：直接刷新小挂件页面数据，不弹出模态窗 */}
          <TouchableOpacity
            style={[styles.refreshBtn, isRefreshing && styles.refreshBtnDisabled]}
            activeOpacity={0.7}
            disabled={isRefreshing}
            onPress={() => {
              if (onRefresh && !isRefreshing) {
                onRefresh();
              }
            }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#60a5fa" style={styles.spinner} />
            ) : (
              <Ionicons name="refresh" size={12} color="#60a5fa" style={{ marginRight: 2 }} />
            )}
            <Text style={styles.refreshBtnText}>{isRefreshing ? '刷新中' : '刷新'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bodyRow}>
        {/* 左侧：超大翻页时钟与日期 */}
        <View style={styles.clockCol}>
          <Text style={styles.clockNumbers}>{timeStr || '18:48'}</Text>
          <Text style={styles.dateLabel}>{dateStr}</Text>
          <Text style={styles.autoRefreshTip}>
            1小时自动刷新 · {current.updateTime || '刚刚更新'}
          </Text>
        </View>

        {/* 分隔线 */}
        <View style={styles.vDivider} />

        {/* 右侧：实时气温、降雨概率与风速 */}
        <View style={styles.weatherCol}>
          {/* 天气图标 + 实时温度 + 天气现象 */}
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

          {/* 当日温度排：同时显示最高/最低温 + 降雨概率 + 空气质量 */}
          <View style={styles.bottomMetaRow}>
            <Text style={styles.tempRangeText}>{today.maxTemp}° / {today.minTemp}°</Text>

            {/* 当前降雨概率 */}
            <View style={styles.rainProbPill}>
              <Ionicons name="rainy" size={10} color="#60a5fa" style={{ marginRight: 2 }} />
              <Text style={styles.rainProbText}>降雨 {current.rainProb ?? today.rainProb ?? 0}%</Text>
            </View>

            {/* 空气质量 */}
            {aqi && (
              <View style={[styles.aqiPill, { backgroundColor: aqi.color }]}>
                <Text style={styles.aqiPillText}>{aqi.level}</Text>
              </View>
            )}
          </View>

          {/* 当前风向与当前风速 (km/h) */}
          <View style={styles.windRow}>
            <Ionicons name="paper-plane-outline" size={11} color="#93c5fd" style={{ marginRight: 4 }} />
            <Text style={styles.windText}>
              {current.windDirection} {current.windScale?.text || '微风'} · {current.windSpeed} km/h
            </Text>
          </View>
        </View>
      </View>
    </View>
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
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityPinText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
  },
  refreshBtnDisabled: {
    opacity: 0.75,
  },
  refreshBtnText: {
    fontSize: 10,
    color: '#93c5fd',
    fontWeight: '600',
  },
  spinner: {
    transform: [{ scale: 0.65 }],
    marginRight: 2,
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
  autoRefreshTip: {
    fontSize: 9,
    color: 'rgba(148, 163, 184, 0.85)',
    marginTop: 3,
  },
  vDivider: {
    width: 1,
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 12,
  },
  weatherCol: {
    flex: 1.15,
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
    marginTop: 5,
    gap: 5,
    flexWrap: 'nowrap',
  },
  tempRangeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  rainProbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  rainProbText: {
    fontSize: 9,
    color: '#67e8f9',
    fontWeight: '600',
  },
  aqiPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  aqiPillText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  windText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '500',
  },
});
