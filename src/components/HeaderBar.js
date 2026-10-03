import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderBar({
  city,
  updateTime,
  onOpenCityModal,
  onRefresh,
  isRefreshing,
  onOpenCleanModal,
  onOpenSkinModal,
  onOpenWidgetModal,
}) {
  return (
    <View style={styles.header}>
      {/* 城市选择与定位按钮 */}
      <TouchableOpacity
        style={styles.cityContainer}
        onPress={onOpenCityModal}
        activeOpacity={0.7}
      >
        <Ionicons name="location-sharp" size={20} color="#ffffff" style={styles.iconPin} />
        <View>
          <View style={styles.cityNameRow}>
            <Text style={styles.cityName}>{city.name}</Text>
            <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.9)" style={styles.chevron} />
          </View>
          <Text style={styles.citySub}>
            {city.admin1 && city.admin1 !== city.name ? `${city.admin1} · ` : ''}
            {updateTime ? `${updateTime} 更新` : '同步中...'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 右侧操作区：皮肤 + 小部件 + 城市管理 + 刷新 */}
      <View style={styles.actions}>
        {/* 皮肤中心 */}
        <TouchableOpacity
          style={styles.actionPill}
          onPress={onOpenSkinModal}
          activeOpacity={0.75}
        >
          <Ionicons name="color-palette-outline" size={14} color="#ffffff" style={{ marginRight: 3 }} />
          <Text style={styles.actionPillText}>皮肤</Text>
        </TouchableOpacity>

        {/* 小部件中心 */}
        <TouchableOpacity
          style={styles.actionPill}
          onPress={onOpenWidgetModal}
          activeOpacity={0.75}
        >
          <Ionicons name="apps-outline" size={14} color="#ffffff" style={{ marginRight: 3 }} />
          <Text style={styles.actionPillText}>微件</Text>
        </TouchableOpacity>

        {/* 刷新 */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="refresh" size={18} color="#ffffff" />
          )}
        </TouchableOpacity>

        {/* 城市管理 */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenCityModal}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconPin: {
    marginRight: 6,
  },
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  chevron: {
    marginLeft: 4,
    marginTop: 2,
  },
  citySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionPillText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
