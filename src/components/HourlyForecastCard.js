import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HourlyForecastCard({ hourly = [] }) {
  if (!hourly || hourly.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" size={17} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.title}>24小时逐小时预报</Text>
        </View>
        <Text style={styles.subtitle}>墨迹气象卫星云图同步</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hourly.map((item, index) => {
          const isCurrent = index === 0;
          return (
            <View key={`hourly-${item.timeStr}-${index}`} style={[styles.hourItem, isCurrent && styles.hourItemActive]}>
              <Text style={[styles.timeText, isCurrent && styles.timeTextActive]}>
                {item.displayTime}
              </Text>

              <View style={styles.iconWrapper}>
                <Ionicons
                  name={item.weather.icon}
                  size={24}
                  color={item.weather.type === 'sunny' ? '#f39c12' : '#ffffff'}
                />
              </View>

              <Text style={styles.tempText}>{item.temp}°</Text>

              {/* 降水概率 */}
              <View style={styles.rainProbContainer}>
                {item.rainProb > 0 ? (
                  <View style={styles.rainRow}>
                    <Ionicons name="water" size={10} color="#60a5fa" />
                    <Text style={styles.rainProbText}>{item.rainProb}%</Text>
                  </View>
                ) : (
                  <Text style={styles.noRainText}>--</Text>
                )}
              </View>

              {/* 风速指示 */}
              <Text style={styles.windText}>{item.windSpeed}km/h</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8, 16, 32, 0.65)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
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
    paddingHorizontal: 16,
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
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  hourItem: {
    alignItems: 'center',
    width: 62,
    paddingVertical: 8,
    borderRadius: 14,
  },
  hourItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 8,
  },
  timeTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  iconWrapper: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  tempText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginVertical: 6,
  },
  rainProbContainer: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  rainProbText: {
    fontSize: 10,
    color: '#93c5fd',
    fontWeight: '600',
    marginLeft: 1,
  },
  noRainText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  windText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 6,
  },
});
