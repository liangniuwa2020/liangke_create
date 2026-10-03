import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 紫外线等级描述
function getUvDesc(uv) {
  if (uv <= 2) return { level: '低', color: '#27ae60', tip: '安全，无需特别防护' };
  if (uv <= 5) return { level: '中', color: '#f1c40f', tip: '建议涂抹 SPF15+ 防晒霜' };
  if (uv <= 7) return { level: '高', color: '#e67e22', tip: '需防晒措施，减少正午户外活动' };
  if (uv <= 10) return { level: '很高', color: '#e74c3c', tip: '尽量在室内，外出做好全面防护' };
  return { level: '极端', color: '#9b59b6', tip: '危险，须全面防晒或避免外出' };
}

// 降雨概率描述
function getRainDesc(prob) {
  if (prob <= 10) return '几乎无雨，放心出门';
  if (prob <= 30) return '降雨可能性较低';
  if (prob <= 50) return '有一定降雨概率，建议备伞';
  if (prob <= 70) return '降雨概率较高，请携带雨具';
  return '高概率降雨，务必携带雨伞';
}

// 根据天气类型决定渐变色方案
function getGradientColors(weatherType, isDay) {
  switch (weatherType) {
    case 'sunny': return ['#1a3a6b', '#2563eb', '#0ea5e9'];
    case 'cloudy': return ['#1e293b', '#334155', '#475569'];
    case 'overcast': return ['#1c1c2e', '#2d2d44', '#3d3d5c'];
    case 'rain': return ['#0f2027', '#1a3a4a', '#203a52'];
    case 'snow': return ['#1e3a5f', '#2d5a8e', '#1e4d7a'];
    case 'thunder': return ['#1a1a2e', '#16213e', '#0f3460'];
    case 'fog': return ['#2c3e50', '#3d5068', '#4a6070'];
    default: return ['#1a3a6b', '#2563eb', '#0ea5e9'];
  }
}

// 获取天气类型对应图标
function getWeatherIcon(type) {
  switch (type) {
    case 'sunny': return 'sunny';
    case 'cloudy': return 'cloudy';
    case 'overcast': return 'cloud';
    case 'rain': return 'rainy';
    case 'snow': return 'snow';
    case 'thunder': return 'thunderstorm';
    case 'fog': return 'water';
    default: return 'sunny';
  }
}

// 获取天气图标颜色
function getWeatherIconColor(type) {
  switch (type) {
    case 'sunny': return '#fbbf24';
    case 'cloudy': return '#94a3b8';
    case 'overcast': return '#64748b';
    case 'rain': return '#60a5fa';
    case 'snow': return '#bae6fd';
    case 'thunder': return '#c084fc';
    case 'fog': return '#94a3b8';
    default: return '#fbbf24';
  }
}

export default function DailyDetailModal({ visible, onClose, day, allDays = [], onSelectDay }) {
  if (!day) return null;

  const uvInfo = getUvDesc(day.uvMax || 0);
  const rainDesc = getRainDesc(day.rainProb || 0);
  const gradientColors = getGradientColors(day.weather?.type, true);
  const weatherIcon = getWeatherIcon(day.weather?.type);
  const weatherIconColor = getWeatherIconColor(day.weather?.type);

  // 计算全局温度范围（用于绘制温度条）
  const allMins = allDays.map(d => d.minTemp);
  const allMaxs = allDays.map(d => d.maxTemp);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const totalSpan = Math.max(globalMax - globalMin, 1);

  const leftPercent = Math.max(0, ((day.minTemp - globalMin) / totalSpan) * 100);
  const widthPercent = Math.max(15, ((day.maxTemp - day.minTemp) / totalSpan) * 100);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 顶部渐变卡：日期 + 天气 + 温度 */}
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            {/* 关闭按钮 */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>

            {/* 日期标题 */}
            <View style={styles.heroTop}>
              <Text style={styles.heroDay}>{day.dayName}</Text>
              <Text style={styles.heroDate}>{day.monthDay}</Text>
            </View>

            {/* 天气图标 + 温度 */}
            <View style={styles.heroCenter}>
              <Ionicons name={weatherIcon} size={52} color={weatherIconColor} />
              <View style={styles.heroTempBlock}>
                <Text style={styles.heroTempRange}>{day.maxTemp}° / {day.minTemp}°</Text>
                <Text style={styles.heroLabel}>{day.weather?.label || '晴'}</Text>
              </View>
            </View>

            {/* 温度条 */}
            <View style={styles.heroBarRow}>
              <Text style={styles.barEndText}>{day.minTemp}°</Text>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={['#5dade2', '#f39c12']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, {
                    left: `${leftPercent * 0.7}%`,
                    width: `${Math.min(widthPercent, 100 - leftPercent * 0.7)}%`,
                  }]}
                />
              </View>
              <Text style={styles.barEndText}>{day.maxTemp}°</Text>
            </View>
          </LinearGradient>

          {/* 详情滚动区 */}
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* 关键数据行：日出/日落/降水/紫外线 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="sunny-outline" size={20} color="#fbbf24" />
                <Text style={styles.statValue}>{day.sunrise || '06:00'}</Text>
                <Text style={styles.statLabel}>日出</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="moon-outline" size={20} color="#93c5fd" />
                <Text style={styles.statValue}>{day.sunset || '18:30'}</Text>
                <Text style={styles.statLabel}>日落</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="water-outline" size={20} color="#60a5fa" />
                <Text style={styles.statValue}>{day.rainProb || 0}%</Text>
                <Text style={styles.statLabel}>降水概率</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="sunny" size={20} color={uvInfo.color} />
                <Text style={[styles.statValue, { color: uvInfo.color }]}>{day.uvMax || 0}</Text>
                <Text style={styles.statLabel}>紫外线</Text>
              </View>
            </View>

            {/* 降水详情卡 */}
            {(day.rainProb || 0) > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="rainy" size={16} color="#60a5fa" style={{ marginRight: 6 }} />
                  <Text style={styles.infoCardTitle}>降水预报</Text>
                </View>
                <View style={styles.rainProbBar}>
                  <View style={[styles.rainProbFill, { width: `${day.rainProb}%` }]} />
                </View>
                <Text style={styles.infoCardDesc}>{rainDesc}</Text>
              </View>
            )}

            {/* 紫外线详情卡 */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="sunny" size={16} color={uvInfo.color} style={{ marginRight: 6 }} />
                <Text style={styles.infoCardTitle}>紫外线指数</Text>
                <View style={[styles.uvBadge, { backgroundColor: uvInfo.color }]}>
                  <Text style={styles.uvBadgeText}>{uvInfo.level}</Text>
                </View>
              </View>
              <View style={styles.uvBar}>
                <View style={[styles.uvBarFill, {
                  width: `${Math.min((day.uvMax || 0) / 11 * 100, 100)}%`,
                  backgroundColor: uvInfo.color,
                }]} />
              </View>
              <Text style={styles.infoCardDesc}>{uvInfo.tip}</Text>
            </View>

            {/* 日出日落详情卡 */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="time-outline" size={16} color="#fbbf24" style={{ marginRight: 6 }} />
                <Text style={styles.infoCardTitle}>日照时段</Text>
              </View>
              <View style={styles.sunRow}>
                <View style={styles.sunItem}>
                  <Ionicons name="sunny" size={22} color="#fbbf24" />
                  <Text style={styles.sunTime}>{day.sunrise || '06:00'}</Text>
                  <Text style={styles.sunLabel}>日出</Text>
                </View>
                <View style={styles.sunBarWrap}>
                  <View style={styles.sunBar}>
                    <LinearGradient
                      colors={['#f59e0b', '#fbbf24', '#f59e0b']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <Text style={styles.sunDuration}>
                    约 {(() => {
                      const [rh, rm] = (day.sunrise || '06:00').split(':').map(Number);
                      const [sh, sm] = (day.sunset || '18:30').split(':').map(Number);
                      const mins = (sh * 60 + sm) - (rh * 60 + rm);
                      return `${Math.floor(mins / 60)}小时${mins % 60}分钟`;
                    })()}
                  </Text>
                </View>
                <View style={styles.sunItem}>
                  <Ionicons name="moon" size={22} color="#93c5fd" />
                  <Text style={styles.sunTime}>{day.sunset || '18:30'}</Text>
                  <Text style={styles.sunLabel}>日落</Text>
                </View>
              </View>
            </View>

            {/* 前后天气快速切换 */}
            {allDays.length > 1 && (
              <View style={styles.dayNavCard}>
                <Text style={styles.dayNavTitle}>切换日期</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayNavScroll}>
                  {allDays.map((d, idx) => {
                    const isSelected = d.dateStr === day.dateStr;
                    return (
                      <TouchableOpacity
                        key={d.dateStr || idx}
                        style={[styles.dayNavChip, isSelected && styles.dayNavChipActive]}
                        onPress={() => !isSelected && onSelectDay && onSelectDay(d)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayNavChipDay, isSelected && styles.dayNavChipDayActive]}>
                          {d.dayName}
                        </Text>
                        <Ionicons
                          name={getWeatherIcon(d.weather?.type)}
                          size={14}
                          color={isSelected ? '#fff' : getWeatherIconColor(d.weather?.type)}
                          style={{ marginVertical: 3 }}
                        />
                        <Text style={[styles.dayNavChipTemp, isSelected && styles.dayNavChipTempActive]}>
                          {d.maxTemp}°/{d.minTemp}°
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  // 顶部英雄渐变卡
  heroCard: {
    padding: 20,
    paddingTop: 18,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroTop: {
    marginBottom: 12,
  },
  heroDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTempBlock: {
    marginLeft: 18,
  },
  heroTempRange: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barEndText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    width: 30,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
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

  // 滚动详情区
  detailScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // 统计数字行
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  },

  // 信息卡片
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  infoCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginTop: 8,
  },

  // 降水概率条
  rainProbBar: {
    height: 6,
    backgroundColor: 'rgba(96,165,250,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rainProbFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 3,
  },

  // 紫外线
  uvBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  uvBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  uvBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uvBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // 日出日落
  sunRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunItem: {
    alignItems: 'center',
    width: 56,
  },
  sunTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  sunLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  sunBarWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  sunBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sunDuration: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },

  // 日期切换导航
  dayNavCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dayNavTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  dayNavScroll: {
    flexDirection: 'row',
  },
  dayNavChip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 58,
  },
  dayNavChipActive: {
    backgroundColor: 'rgba(59,130,246,0.5)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayNavChipDay: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  dayNavChipDayActive: {
    color: '#ffffff',
  },
  dayNavChipTemp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  dayNavChipTempActive: {
    color: 'rgba(255,255,255,0.9)',
  },
});
