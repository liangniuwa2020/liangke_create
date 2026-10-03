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

  // 根据当前天气自动生成醒目通俗的天气总结简述
  const getWeatherSummary = (code, label, temp) => {
    if ([95, 96, 99].includes(code)) {
      return '雷电与强降水交织，建议留在安全室内，紧闭门窗';
    } else if ([61, 63, 65, 80, 81, 82].includes(code)) {
      return '当前正在降雨，路面湿滑，出门请带好雨具并减速慢行';
    } else if ([51, 53, 55].includes(code)) {
      return '微雨绵绵，空气湿润，外出建议备一把便携折叠伞';
    } else if ([71, 73, 75, 85, 86].includes(code)) {
      return '雪花飘落，气温严寒易结冰，请穿戴保暖厚装';
    } else if ([45, 48].includes(code)) {
      return '能见度偏低，早晚驾车外出请开启雾灯，保持车距';
    } else if ([2, 3].includes(code)) {
      return '云层较厚遮挡日光，体感温和舒适，适宜外出活动';
    } else {
      if (temp >= 30) return '烈日当空体感偏热，请注意补水防暑与紫外线防晒';
      if (temp <= 5) return '晴冷干燥风力明显，早晚温差较大，注意及时添衣';
      return '阳光明媚开朗，微风不燥，正是外出运动的大好时光';
    }
  };

  const weatherSummary = getWeatherSummary(current.weather_code, current.weather.label, current.temp);

  return (
    <View style={styles.container}>
      {/* 🌟 核心醒目区域：天气现象主角巨幅看板（开屏一眼看清） */}
      <View style={styles.weatherHeroBox}>
        {/* 左侧：超大动态天气图腾与微光光晕 */}
        <View style={styles.iconAuraWrapper}>
          <View style={styles.iconBackdrop} />
          <Ionicons
            name={current.weather.icon}
            size={56}
            color={current.weather.type === 'sunny' ? '#f59e0b' : '#ffffff'}
          />
        </View>

        {/* 右侧：超大粗体温度与天气现象标题 */}
        <View style={styles.heroTextCol}>
          <View style={styles.conditionTitleRow}>
            <Text style={styles.conditionMainTitle}>{current.weather.label}</Text>
            <View style={styles.dayNightTag}>
              <Text style={styles.dayNightText}>{current.isDay ? '白天' : '夜间'}</Text>
            </View>
          </View>

          <View style={styles.tempNumbersRow}>
            <Text style={styles.tempLargeNumber}>{current.temp}</Text>
            <Text style={styles.tempUnitDegree}>°C</Text>
            <View style={styles.highLowCol}>
              <Text style={styles.highLowText}>高 {today.maxTemp}°</Text>
              <Text style={styles.highLowText}>低 {today.minTemp}°</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 实时体感与通俗气象解读导语 */}
      <View style={styles.summaryBar}>
        <Ionicons name="sparkles" size={14} color="#fef08a" style={{ marginRight: 6, marginTop: 1 }} />
        <Text style={styles.summaryText}>
          体感 {current.apparentTemp}° · {weatherSummary}
        </Text>
      </View>

      {/* 墨迹经典指标胶囊条：空气质量 + 风向风级 + 相对湿度 */}
      <View style={styles.tagPillsRow}>
        <TouchableOpacity
          style={[styles.aqiPill, { backgroundColor: aqi ? aqi.bgColor : 'rgba(255,255,255,0.2)' }]}
          onPress={onPressAqi}
          activeOpacity={0.8}
        >
          <View style={[styles.aqiDot, { backgroundColor: aqi ? aqi.color : '#2ecc71' }]} />
          <Text style={styles.aqiText}>
            空气 {aqi ? aqi.level : '优'} · {aqi ? aqi.aqi : '--'}
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#ffffff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        <View style={styles.infoPill}>
          <Ionicons name="paper-plane" size={12} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.pillText}>
            {current.windDirection} {current.windScale.text}
          </Text>
        </View>

        <View style={styles.infoPill}>
          <Ionicons name="water" size={12} color="#93c5fd" style={{ marginRight: 4 }} />
          <Text style={styles.pillText}>湿度 {current.humidity}%</Text>
        </View>
      </View>

      {/* 墨迹分钟级短时降水通知横幅 */}
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
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  weatherHeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(8, 18, 36, 0.68)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  iconAuraWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconBackdrop: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroTextCol: {
    flex: 1,
    marginLeft: 16,
  },
  conditionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conditionMainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dayNightTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  dayNightText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  tempNumbersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tempLargeNumber: {
    fontSize: 54,
    fontWeight: '300',
    color: '#ffffff',
    lineHeight: 58,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tempUnitDegree: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    marginLeft: 2,
  },
  highLowCol: {
    justifyContent: 'center',
    marginLeft: 14,
    marginTop: 8,
  },
  highLowText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(8, 18, 36, 0.65)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  summaryText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  tagPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 8,
  },
  aqiPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
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
    fontWeight: '700',
  },
  infoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 18, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
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
    backgroundColor: 'rgba(8, 18, 36, 0.65)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    fontWeight: '600',
    flex: 1,
  },
});
