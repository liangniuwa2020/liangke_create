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
            {/* 微件 1：4x2 经典时钟天气卡片 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>1. 4×2 经典时钟天气微件</Text>
                <Text style={styles.sectionTag}>经典主屏首选</Text>
              </View>

              <View
                style={[
                  styles.previewBox,
                  selectedStyle === 'glass' && styles.glassBg,
                  selectedStyle === 'white' && styles.whiteBg,
                  selectedStyle === 'dark' && styles.darkBg,
                ]}
              >
                <View style={styles.w4x2Row}>
                  <View>
                    <Text style={[styles.wClockNum, selectedStyle === 'white' && styles.textDark]}>18:50</Text>
                    <Text style={[styles.wDateLabel, selectedStyle === 'white' && styles.textDarkSub]}>10月3日 星期六 · {city.name}</Text>
                  </View>

                  <View style={styles.wDivider} />

                  <View style={styles.wRightInfo}>
                    <View style={styles.wIconRow}>
                      <Ionicons
                        name={current.weather.icon}
                        size={28}
                        color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                      />
                      <Text style={[styles.wTempText, selectedStyle === 'white' && styles.textDark]}>{current.temp}°</Text>
                    </View>
                    <Text style={[styles.wSubCondition, selectedStyle === 'white' && styles.textDarkSub]}>{current.weather.label} · {today.maxTemp}°/{today.minTemp}°</Text>
                    {showAqi && aqi && (
                      <View style={[styles.wAqiBadge, { backgroundColor: aqi.color }]}>
                        <Text style={styles.wAqiText}>AQI {aqi.aqi} {aqi.level}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* 微件 2：4x1 极简透明横条微件 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>2. 4×1 极简透明横条微件</Text>
                <Text style={styles.sectionTag}>轻薄不挡壁纸</Text>
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
                  <Text style={[styles.slimTime, selectedStyle === 'white' && styles.textDark]}>18:50</Text>
                  <Text style={[styles.slimCity, selectedStyle === 'white' && styles.textDarkSub]}>{city.name}</Text>
                </View>
                <View style={styles.slimRight}>
                  <Ionicons
                    name={current.weather.icon}
                    size={22}
                    color={current.weather.type === 'sunny' ? '#f59e0b' : '#38bdf8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.slimTemp, selectedStyle === 'white' && styles.textDark]}>{current.temp}° {current.weather.label}</Text>
                  <View style={[styles.miniAqi, { backgroundColor: aqi ? aqi.color : '#2ecc71' }]}>
                    <Text style={styles.miniAqiText}>{aqi ? aqi.level : '优'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 微件 3：2x2 紧凑天气方块 */}
            <View style={styles.widgetPreviewSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>3. 2×2 精巧方块微件</Text>
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
                  2. 点击底部出现的【小部件】或【微件】菜单；{'\n'}
                  3. 找到【墨迹纯净天气】，选择您喜欢的 4×2 或 4×1 尺寸拖动至桌面即可！
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
