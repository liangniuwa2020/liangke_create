import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WidgetCenterModal({
  visible,
  onClose,
  current,
  today,
  aqi,
  city,
}) {
  const [selectedStyle, setSelectedStyle] = useState('glass'); // 'glass' | 'white' | 'dark'
  const [showAqi, setShowAqi] = useState(true);

  if (!current || !today) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 顶栏 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="grid" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.title}>墨迹桌面小部件工坊</Text>
                <Text style={styles.subtitle}>自选尺寸与材质，装扮您的手机桌面</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* 材质风格切换 */}
          <View style={styles.styleSelectorRow}>
            <Text style={styles.selectorLabel}>微件材质：</Text>
            <TouchableOpacity
              style={[styles.styleChip, selectedStyle === 'glass' && styles.styleChipActive]}
              onPress={() => setSelectedStyle('glass')}
            >
              <Text style={[styles.styleChipText, selectedStyle === 'glass' && styles.styleChipTextActive]}>高通透毛玻璃</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.styleChip, selectedStyle === 'white' && styles.styleChipActive]}
              onPress={() => setSelectedStyle('white')}
            >
              <Text style={[styles.styleChipText, selectedStyle === 'white' && styles.styleChipTextActive]}>质感白卡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.styleChip, selectedStyle === 'dark' && styles.styleChipActive]}
              onPress={() => setSelectedStyle('dark')}
            >
              <Text style={[styles.styleChipText, selectedStyle === 'dark' && styles.styleChipTextActive]}>沉浸深黑</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {/* 微件 0：4x3 经典综合天气时钟微件 (用户最喜爱核心大屏款式) */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>1. 4×3 综合天气时钟（大微件）</Text>
                <Text style={[styles.sectionTag, { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>旗舰大屏款</Text>
              </View>

              <View
                style={[
                  styles.previewBox,
                  selectedStyle === 'glass' && styles.glassBg,
                  selectedStyle === 'white' && styles.whiteBg,
                  selectedStyle === 'dark' && styles.darkBg,
                ]}
              >
                {/* 顶栏：城市与更新时间 */}
                <View style={styles.w4x3Top}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location" size={13} color="#38bdf8" />
                    <Text style={[styles.w4x3City, selectedStyle === 'white' && styles.textDark]}>{city.name}</Text>
                    <Text style={[styles.w4x3Update, selectedStyle === 'white' && styles.textDarkSub]}>实时同步</Text>
                  </View>
                  <Ionicons name="refresh" size={14} color="#94a3b8" />
                </View>

                {/* 主栏：左侧大时钟，右侧天气 */}
                <View style={styles.w4x2Row}>
                  <View>
                    <Text style={[styles.wClockNum, selectedStyle === 'white' && styles.textDark]}>20:30</Text>
                    <Text style={[styles.wDateLabel, selectedStyle === 'white' && styles.textDarkSub]}>10月3日 星期六</Text>
                  </View>

                  <View style={styles.wDivider} />

                  <View style={styles.wRightInfo}>
                    <View style={styles.wIconRow}>
                      <Ionicons
                        name={current.weather.icon}
                        size={32}
                        color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                      />
                      <Text style={[styles.wTempText, selectedStyle === 'white' && styles.textDark]}>{current.temp}°</Text>
                    </View>
                    <Text style={[styles.wSubCondition, selectedStyle === 'white' && styles.textDarkSub]}>
                      {current.weather.label} · {today.maxTemp}°/{today.minTemp}°
                    </Text>
                  </View>
                </View>

                {/* 指数条 */}
                <View style={[styles.w4x3PillBar, selectedStyle === 'white' && { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                  {showAqi && aqi && (
                    <View style={[styles.wAqiBadge, { backgroundColor: aqi.color, paddingHorizontal: 6, paddingVertical: 2 }]}>
                      <Text style={styles.wAqiText}>空气{aqi.level} · {aqi.aqi}</Text>
                    </View>
                  )}
                  <Text style={[styles.w4x3MetaText, selectedStyle === 'white' && styles.textDarkSub]}>
                    {current.windDirection} {current.windScale?.text || '微风'}
                  </Text>
                  <Text style={[styles.w4x3MetaText, selectedStyle === 'white' && styles.textDarkSub]}>
                    湿度 {current.humidity}%
                  </Text>
                </View>

                {/* 第 1 排：间隔 2 小时逐时预报 */}
                <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold', marginTop: 4, marginBottom: 2 }}>逐时预报 · 间隔2小时</Text>
                <View style={styles.w4x3ForecastRow}>
                  {[
                    { time: '现在', icon: 'sunny', color: '#f59e0b', temp: current.temp },
                    { time: '01:00', icon: 'cloudy', color: '#38bdf8', temp: current.temp - 2 },
                    { time: '03:00', icon: 'cloudy', color: '#94a3b8', temp: current.temp - 3 },
                    { time: '05:00', icon: 'sunny', color: '#f59e0b', temp: current.temp - 4 },
                    { time: '07:00', icon: 'sunny', color: '#f59e0b', temp: current.temp - 1 },
                    { time: '09:00', icon: 'sunny', color: '#f59e0b', temp: current.temp + 2 },
                    { time: '11:00', icon: 'rainy', color: '#60a5fa', temp: current.temp + 1 },
                  ].map((item, idx) => (
                    <View key={`4x3-h-${idx}`} style={[styles.w4x3DayCol, selectedStyle === 'white' && { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.w4x3DayTitle, selectedStyle === 'white' && styles.textDarkSub]}>{item.time}</Text>
                      <Ionicons name={item.icon} size={14} color={item.color} style={{ marginVertical: 1 }} />
                      <Text style={[styles.w4x3DayTemp, selectedStyle === 'white' && styles.textDark]}>{item.temp}°</Text>
                    </View>
                  ))}
                </View>

                {/* 第 2 排：未来 7 天天气预报 */}
                <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 'bold', marginTop: 6, marginBottom: 2 }}>未来预报 · 每天天气</Text>
                <View style={styles.w4x3ForecastRow}>
                  {[
                    { day: '今天', icon: 'sunny', color: '#f59e0b', max: today.maxTemp, min: today.minTemp },
                    { day: '明天', icon: 'cloudy', color: '#38bdf8', max: today.maxTemp - 1, min: today.minTemp - 1 },
                    { day: '后天', icon: 'rainy', color: '#60a5fa', max: today.maxTemp - 2, min: today.minTemp - 2 },
                    { day: '周二', icon: 'cloudy', color: '#94a3b8', max: today.maxTemp - 3, min: today.minTemp - 3 },
                    { day: '周三', icon: 'sunny', color: '#f59e0b', max: today.maxTemp - 1, min: today.minTemp - 2 },
                    { day: '周四', icon: 'rainy', color: '#60a5fa', max: today.maxTemp - 4, min: today.minTemp - 4 },
                    { day: '周五', icon: 'sunny', color: '#f59e0b', max: today.maxTemp - 2, min: today.minTemp - 3 },
                  ].map((item, idx) => (
                    <View key={`4x3-f-${idx}`} style={[styles.w4x3DayCol, selectedStyle === 'white' && { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.w4x3DayTitle, selectedStyle === 'white' && styles.textDarkSub]}>{item.day}</Text>
                      <Ionicons name={item.icon} size={14} color={item.color} style={{ marginVertical: 1 }} />
                      <Text style={[styles.w4x3DayTemp, { fontSize: 8.5 }, selectedStyle === 'white' && styles.textDark]}>{item.max}°/{item.min}°</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* 微件 2：4x2 24小时逐时天气预报微件 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>2. 4×2 双排综合天气微件</Text>
                <Text style={[styles.sectionTag, { color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>逐时+逐日双排</Text>
              </View>

              <View
                style={[
                  styles.previewBox,
                  selectedStyle === 'glass' && styles.glassBg,
                  selectedStyle === 'white' && styles.whiteBg,
                  selectedStyle === 'dark' && styles.darkBg,
                ]}
              >
                {/* 顶栏：城市与当前气温 */}
                <View style={[styles.w4x3Top, { marginBottom: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location" size={13} color="#38bdf8" />
                    <Text style={[styles.w4x3City, selectedStyle === 'white' && styles.textDark]}>{city.name}</Text>
                    {showAqi && aqi && (
                      <View style={[styles.wAqiBadge, { backgroundColor: aqi.color, marginLeft: 6 }]}>
                        <Text style={styles.wAqiText}>AQI {aqi.aqi} {aqi.level}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name={current.weather.icon}
                      size={18}
                      color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.wTempText, { fontSize: 16 }, selectedStyle === 'white' && styles.textDark]}>{current.temp}°</Text>
                    <Text style={[styles.wSubCondition, { marginLeft: 4 }, selectedStyle === 'white' && styles.textDarkSub]}>{current.weather.label}</Text>
                  </View>
                </View>

                {/* 4x2 第 1 排：间隔 2 小时逐时预报 */}
                <View style={[styles.w4x3ForecastRow, { marginBottom: 3 }]}>
                  {[
                    { time: '现在', icon: 'sunny', color: '#f59e0b', temp: current.temp },
                    { time: '01:00', icon: 'cloudy', color: '#38bdf8', temp: current.temp - 2 },
                    { time: '03:00', icon: 'cloudy', color: '#94a3b8', temp: current.temp - 4 },
                    { time: '05:00', icon: 'sunny', color: '#f59e0b', temp: current.temp - 5 },
                    { time: '07:00', icon: 'sunny', color: '#f59e0b', temp: current.temp - 1 },
                    { time: '09:00', icon: 'rainy', color: '#60a5fa', temp: current.temp + 1 },
                  ].map((item, idx) => (
                    <View key={`4x2-h-${idx}`} style={[styles.w4x3DayCol, selectedStyle === 'white' && { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.w4x3DayTitle, selectedStyle === 'white' && styles.textDarkSub]}>{item.time}</Text>
                      <Ionicons name={item.icon} size={14} color={item.color} style={{ marginVertical: 1 }} />
                      <Text style={[styles.w4x3DayTemp, selectedStyle === 'white' && styles.textDark]}>{item.temp}°</Text>
                    </View>
                  ))}
                </View>

                {/* 4x2 第 2 排：未来每天天气 */}
                <View style={styles.w4x3ForecastRow}>
                  {[
                    { day: '今天', icon: 'sunny', color: '#f59e0b', max: today.maxTemp, min: today.minTemp },
                    { day: '明天', icon: 'cloudy', color: '#38bdf8', max: today.maxTemp - 1, min: today.minTemp - 1 },
                    { day: '后天', icon: 'rainy', color: '#60a5fa', max: today.maxTemp - 2, min: today.minTemp - 2 },
                    { day: '周二', icon: 'cloudy', color: '#94a3b8', max: today.maxTemp - 3, min: today.minTemp - 3 },
                    { day: '周三', icon: 'sunny', color: '#f59e0b', max: today.maxTemp - 1, min: today.minTemp - 2 },
                    { day: '周四', icon: 'rainy', color: '#60a5fa', max: today.maxTemp - 4, min: today.minTemp - 4 },
                  ].map((item, idx) => (
                    <View key={`4x2-f-${idx}`} style={[styles.w4x3DayCol, selectedStyle === 'white' && { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.w4x3DayTitle, selectedStyle === 'white' && styles.textDarkSub]}>{item.day}</Text>
                      <Ionicons name={item.icon} size={14} color={item.color} style={{ marginVertical: 1 }} />
                      <Text style={[styles.w4x3DayTemp, { fontSize: 8.5 }, selectedStyle === 'white' && styles.textDark]}>{item.max}°/{item.min}°</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* 微件 3：4x1 精简时钟天气横条微件 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>3. 4×1 精简时钟天气微件</Text>
                <Text style={styles.sectionTag}>轻薄横条首选</Text>
              </View>

              <View
                style={[
                  styles.previewBoxSlim,
                  selectedStyle === 'glass' && styles.glassBg,
                  selectedStyle === 'white' && styles.whiteBg,
                  selectedStyle === 'dark' && styles.darkBg,
                ]}
              >
                <View style={styles.slimLeft}>
                  <Text style={[styles.slimTime, selectedStyle === 'white' && styles.textDark]}>21:30</Text>
                  <Text style={[styles.slimCity, selectedStyle === 'white' && styles.textDarkSub]}>10月3日 周六</Text>
                </View>
                <View style={styles.wDivider} />
                <View style={{ flex: 1, paddingLeft: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location" size={12} color="#38bdf8" />
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: '#fff', marginLeft: 2 }, selectedStyle === 'white' && styles.textDark]}>{city.name}</Text>
                    {showAqi && aqi && (
                      <View style={[styles.wAqiBadge, { backgroundColor: aqi.color, marginLeft: 6 }]}>
                        <Text style={styles.wAqiText}>AQI {aqi.aqi} {aqi.level}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[{ fontSize: 10, color: '#94a3b8', marginTop: 2 }, selectedStyle === 'white' && styles.textDarkSub]}>
                    {current.windDirection} {current.windScale?.text || '微风'} · 湿度 {current.humidity}%
                  </Text>
                </View>
                <View style={styles.slimRight}>
                  <Ionicons
                    name={current.weather.icon}
                    size={22}
                    color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                    style={{ marginRight: 6 }}
                  />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.slimTemp, selectedStyle === 'white' && styles.textDark]}>{current.temp}°</Text>
                    <Text style={[{ fontSize: 9, color: '#cbd5e1' }, selectedStyle === 'white' && styles.textDarkSub]}>{current.weather.label} {today.maxTemp}°/{today.minTemp}°</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 微件 4：2x2 紧凑天气方块 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>4. 2×2 精巧方块微件</Text>
                <Text style={styles.sectionTag}>百搭桌面网格</Text>
              </View>

              <View
                style={[
                  styles.previewBoxSquare,
                  selectedStyle === 'glass' && styles.glassBg,
                  selectedStyle === 'white' && styles.whiteBg,
                  selectedStyle === 'dark' && styles.darkBg,
                ]}
              >
                <View style={styles.sqTop}>
                  <Ionicons
                    name={current.weather.icon}
                    size={30}
                    color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                  />
                  <Text style={[styles.sqTemp, selectedStyle === 'white' && styles.textDark]}>{current.temp}°</Text>
                </View>
                <Text style={[styles.sqCity, selectedStyle === 'white' && styles.textDark]}>{city.name} · {current.weather.label}</Text>
                <Text style={[styles.sqTip, selectedStyle === 'white' && styles.textDarkSub]}>体感 {current.apparentTemp}° · 湿度 {current.humidity}%</Text>
              </View>
            </View>

            {/* 手机桌面添加指南卡片 */}
            <View style={styles.guideCard}>
              <Ionicons name="information-circle-outline" size={18} color="#38bdf8" style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guideTitle}>如何添加到安卓手机桌面？</Text>
                <Text style={styles.guideText}>
                  1. 在手机桌面空白区域【长按】或双指捏合；{'\n'}
                  2. 点击底部出现的【小部件】或【微件 / 桌面插件】；{'\n'}
                  3. 找到【墨迹纯净天气】，选择【4×3 一周预报】、【4×2 24小时天气】或【4×1 时钟天气】长按拖动至桌面即可！
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 6,
  },
  styleChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  styleChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  styleChipText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  styleChipTextActive: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  scrollList: {
    marginTop: 4,
  },
  widgetPreviewSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  sectionTag: {
    fontSize: 11,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewBox: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
  },
  previewBoxSlim: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBoxSquare: {
    width: 170,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
  },
  glassBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  whiteBg: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  darkBg: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  textDark: {
    color: '#0f172a',
  },
  textDarkSub: {
    color: '#64748b',
  },
  w4x3Top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  w4x3City: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 4,
  },
  w4x3Update: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6,
  },
  w4x3PillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 8,
  },
  w4x3MetaText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  w4x3ForecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  w4x3DayCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 6,
  },
  w4x3DayTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  w4x3DayTemp: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  w4x2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wClockNum: {
    fontSize: 38,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -1,
  },
  wDateLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  wDivider: {
    width: 1,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  wRightInfo: {
    alignItems: 'flex-start',
  },
  wIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wTempText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 6,
  },
  wSubCondition: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  wAqiBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 4,
  },
  wAqiText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  slimLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  slimTime: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 6,
  },
  slimCity: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  slimRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slimTemp: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 6,
  },
  miniAqi: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniAqiText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  sqTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sqTemp: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  sqCity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  sqTip: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 18,
  },
});
