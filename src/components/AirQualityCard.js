import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AirQualityCard({ aqi }) {
  if (!aqi) return null;

  // 计算 AQI 在 0~300 刻度上的百分比
  const percent = Math.min(Math.max((aqi.aqi / 300) * 100, 5), 100);

  const pollutants = [
    { label: 'PM2.5', value: aqi.pm25, unit: 'μg/m³', desc: '细颗粒物' },
    { label: 'PM10', value: aqi.pm10, unit: 'μg/m³', desc: '可吸入颗粒物' },
    { label: 'O₃', value: aqi.o3, unit: 'μg/m³', desc: '臭氧' },
    { label: 'NO₂', value: aqi.no2, unit: 'μg/m³', desc: '二氧化氮' },
    { label: 'SO₂', value: aqi.so2, unit: 'μg/m³', desc: '二氧化硫' },
    { label: 'CO', value: (aqi.co / 1000).toFixed(1), unit: 'mg/m³', desc: '一氧化碳' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="leaf-outline" size={17} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.title}>空气质量实况</Text>
        </View>
        <Text style={styles.subtitle}>国家环保监测网源</Text>
      </View>

      {/* AQI 仪表数值区 */}
      <View style={styles.aqiSummaryRow}>
        <View>
          <View style={styles.scoreRow}>
            <Text style={styles.aqiNumber}>{aqi.aqi}</Text>
            <View style={[styles.levelBadge, { backgroundColor: aqi.color }]}>
              <Text style={styles.levelText}>{aqi.level}</Text>
            </View>
          </View>
          <Text style={styles.standardLabel}>US-AQI / 国标空气质量指数</Text>
        </View>

        <View style={styles.healthTips}>
          <Ionicons name="shield-checkmark-outline" size={16} color={aqi.color} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={styles.healthDesc}>{aqi.desc}</Text>
        </View>
      </View>

      {/* AQI 彩色渐变刻度条 */}
      <View style={styles.gaugeContainer}>
        <LinearGradient
          colors={['#27ae60', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#7f1d1d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gaugeTrack}
        />
        {/* 指针指示点 */}
        <View style={[styles.gaugePin, { left: `${percent}%`, borderColor: aqi.color }]} />
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.scaleText}>0 优</Text>
        <Text style={styles.scaleText}>50 良</Text>
        <Text style={styles.scaleText}>100 轻度</Text>
        <Text style={styles.scaleText}>150 中度</Text>
        <Text style={styles.scaleText}>200+ 重度</Text>
      </View>

      {/* 六大污染物指标网格 */}
      <View style={styles.pollutantGrid}>
        {pollutants.map((item, idx) => (
          <View key={`pollutant-${idx}`} style={styles.pollutantItem}>
            <Text style={styles.pollutantLabel}>{item.label}</Text>
            <Text style={styles.pollutantValue}>{item.value}</Text>
            <Text style={styles.pollutantUnit}>{item.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8, 16, 32, 0.65)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  aqiSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aqiNumber: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 46,
    marginRight: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  standardLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  healthTips: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginLeft: 14,
  },
  healthDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 17,
    flex: 1,
  },
  gaugeContainer: {
    position: 'relative',
    height: 8,
    justifyContent: 'center',
    marginVertical: 6,
  },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  gaugePin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    transform: [{ translateX: -6 }],
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  scaleText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  pollutantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  pollutantItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pollutantLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  pollutantValue: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '700',
    marginTop: 2,
  },
  pollutantUnit: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
});
