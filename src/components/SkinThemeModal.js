import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SKINS } from '../utils/themeContext';

export default function SkinThemeModal({
  visible,
  onClose,
  currentSkinId,
  onSelectSkin,
}) {
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
                <Ionicons name="color-palette" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.title}>墨迹皮肤中心</Text>
                <Text style={styles.subtitle}>随心选择心仪的天空视觉皮肤</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* 皮肤卡片列表 */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {SKINS.map((skin) => {
              const isSelected = currentSkinId === skin.id;
              return (
                <TouchableOpacity
                  key={`skin-${skin.id}`}
                  style={[styles.skinCard, isSelected && styles.skinCardActive]}
                  onPress={() => {
                    onSelectSkin(skin.id);
                  }}
                  activeOpacity={0.8}
                >
                  {/* 皮肤色彩预览长条 */}
                  <LinearGradient
                    colors={skin.previewColors || ['#3b82f6', '#60a5fa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.colorBar}
                  />

                  <View style={styles.cardContent}>
                    <View style={styles.infoCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.skinName}>{skin.name}</Text>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagText}>{skin.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.skinDesc}>{skin.desc}</Text>
                    </View>

                    <View style={styles.actionCol}>
                      {isSelected ? (
                        <View style={styles.activeCheck}>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                          <Text style={styles.activeText}>使用中</Text>
                        </View>
                      ) : (
                        <View style={styles.applyBtn}>
                          <Text style={styles.applyText}>应用</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  scrollList: {
    marginTop: 4,
  },
  skinCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skinCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  colorBar: {
    height: 8,
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  skinName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 8,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  skinDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  activeCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 3,
  },
  applyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  applyText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
});
