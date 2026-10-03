import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LivingIndicesCard({ indices = [] }) {
  const [selectedItem, setSelectedItem] = useState(null);

  if (!indices || indices.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="compass-outline" size={17} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.title}>墨迹生活指数</Text>
        </View>
        <Text style={styles.subtitle}>贴心出行与健康指南</Text>
      </View>

      <View style={styles.grid}>
        {indices.map((item, index) => (
          <TouchableOpacity
            key={`index-${item.name}-${index}`}
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedItem(item)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={20} color="#ffffff" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.indexLevel}>{item.level}</Text>
              <Text style={styles.indexName}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 指数详情弹窗 */}
      <Modal
        visible={Boolean(selectedItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedItem(null)}
        >
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name={selectedItem.icon} size={28} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{selectedItem.name}指数 · {selectedItem.level}</Text>
                    <Text style={styles.modalSubtitle}>基于实时气温与天气模型计算</Text>
                  </View>
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.modalTipText}>{selectedItem.tip}</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.closeBtnText}>知道了</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
    color: 'rgba(255, 255, 255, 0.75)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  indexLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  indexName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  modalTipText: {
    fontSize: 14,
    color: '#e5e7eb',
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
