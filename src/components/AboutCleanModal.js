import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AboutCleanModal({ visible, onClose }) {
  const highlights = [
    {
      icon: 'ban-outline',
      color: '#ef4444',
      title: '零广告轰炸',
      desc: '杜绝传统墨迹天气繁杂的开屏广告、弹窗推销、假红包和信息流视频，还原天气软件应有的纯粹。',
    },
    {
      icon: 'flash-outline',
      color: '#f59e0b',
      title: '极速启动秒开',
      desc: '无臃肿营销 SDK，内存占用低至极致，打开瞬间即可获取当前温度与降水预报。',
    },
    {
      icon: 'globe-outline',
      color: '#3b82f6',
      title: '全球公开气象源',
      desc: '采用 Open-Meteo 高精度数值预报模型及国家级空气质量监测网，无任何商业数据绑架。',
    },
    {
      icon: 'shield-checkmark-outline',
      color: '#10b981',
      title: '墨迹精髓生活指数',
      desc: '完整复刻穿衣、紫外线、洗车、雨伞、感冒、运动等 8 大实用生活指南，让日常出行更安心。',
    },
    {
      icon: 'heart-outline',
      color: '#ec4899',
      title: '专注气象本质',
      desc: '没有新闻八卦，没有低俗资讯，只有关乎您出行的风雨冷暖。',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 顶部标题栏 */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sunny" size={26} color="#3b82f6" />
            </View>
            <Text style={styles.title}>墨迹天气 · 纯净无广告版</Text>
            <Text style={styles.subtitle}>Pure Clean Weather Experience</Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {highlights.map((item, index) => (
              <View key={`hl-${index}`} style={styles.itemRow}>
                <View style={[styles.itemIconWrap, { backgroundColor: `${item.color}22` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <View style={styles.versionCard}>
              <Text style={styles.versionTitle}>版本信息：v1.1.0 (全天气专属皮肤与小部件版)</Text>
              <Text style={styles.versionSub}>专为追求清爽体验的用户量身定制</Text>
            </View>
          </ScrollView>

          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>返回天气</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 3,
  },
  body: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 3,
  },
  itemDesc: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
  versionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  versionTitle: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '600',
  },
  versionSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
