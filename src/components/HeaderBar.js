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
            <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.8)" style={styles.chevron} />
          </View>
          <Text style={styles.citySub}>
            {city.admin1 && city.admin1 !== city.name ? `${city.admin1} · ` : ''}
            {updateTime ? `${updateTime} 更新` : '同步中...'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 右侧操作区：纯净版徽章 + 刷新 + 城市管理按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cleanBadge}
          onPress={onOpenCleanModal}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark" size={13} color="#2ecc71" style={{ marginRight: 3 }} />
          <Text style={styles.cleanBadgeText}>无广告纯净版</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenCityModal}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={20} color="#ffffff" />
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
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.4)',
  },
  cleanBadgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});
