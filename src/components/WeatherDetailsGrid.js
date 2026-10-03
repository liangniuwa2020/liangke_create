import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WeatherDetailsGrid({ current, today }) {
  if (!current || !today) return null;

  const details = [
    {
      label: '相对湿度',
      value: `${current.humidity}%`,
      sub: current.humidity > 70 ? '湿度偏大' : current.humidity < 30 ? '空气干燥' : '相对适宜',
      icon: 'water-outline',
    },
    {
      label: '风向风力',
      value: `${current.windScale.text}`,
      sub: `${current.windDirection} · ${current.windSpeed} km/h`,
      icon: 'paper-plane-outline',
    },
    {
      label: '大气压强',
      value: `${current.pressure}`,
      unit: 'hPa',
      sub: '正常海平面气压',
      icon: 'speedometer-outline',
    },
    {
      label: '紫外线指数',
      value: `${today.uvIndex}`,
      unit: '级',
      sub: today.uvIndex < 3 ? '无需防晒' : today.uvIndex < 6 ? '适度防晒' : '加强防护',
      icon: 'sunny-outline',
    },
    {
      label: '日出时间',
      value: today.sunrise,
      sub: '破晓拂晓',
      icon: 'arrow-up-circle-outline',
    },
    {
      label: '日落时间',
      value: today.sunset,
      sub: '夕阳霞光',
      icon: 'arrow-down-circle-outline',
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart-outline" size={17} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.title}>气象深度指标</Text>
        </View>
        <Text style={styles.subtitle}>精密气象传感器测算</Text>
      </View>

      <View style={styles.grid}>
        {details.map((item, idx) => (
          <View key={`detail-${idx}`} style={styles.gridItem}>
            <View style={styles.topRow}>
              <Ionicons name={item.icon} size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>

            <View style={styles.valueRow}>
              <Text style={styles.itemValue}>{item.value}</Text>
              {item.unit && <Text style={styles.itemUnit}> {item.unit}</Text>}
            </View>

            <Text style={styles.itemSub} numberOfLines={1}>{item.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemUnit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  itemSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
  },
});
