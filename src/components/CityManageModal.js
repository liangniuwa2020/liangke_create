import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchCities, DEFAULT_CITIES } from '../services/weatherService';

export default function CityManageModal({
  visible,
  onClose,
  currentCity,
  savedCities = [],
  onSelectCity,
  onRemoveCity,
  onAddCity,
}) {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 防抖搜索
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCities(keyword);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSelectSearchResult = (city) => {
    onAddCity(city);
    onSelectCity(city);
    setKeyword('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* 顶部标题与关闭 */}
        <View style={styles.header}>
          <Text style={styles.title}>城市管理</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 搜索输入框 */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索全球城市或国内城市（中文/拼音）"
            placeholderTextColor="#9ca3af"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* 搜索中指示器 */}
        {isSearching && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>正在检索卫星城市数据库...</Text>
          </View>
        )}

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionHeader}>搜索结果</Text>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `search-${item.id}-${item.latitude}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View>
                    <Text style={styles.resultCityName}>{item.name}</Text>
                    <Text style={styles.resultAdmin}>
                      {[item.admin1, item.country].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color="#3b82f6" />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 热门城市快捷标签 */}
        {searchResults.length === 0 && (
          <View style={styles.hotSection}>
            <Text style={styles.sectionHeader}>热门城市</Text>
            <View style={styles.hotChipsContainer}>
              {DEFAULT_CITIES.map((city) => (
                <TouchableOpacity
                  key={`hot-${city.id}`}
                  style={[
                    styles.hotChip,
                    currentCity.id === city.id && styles.hotChipActive,
                  ]}
                  onPress={() => {
                    onAddCity(city);
                    onSelectCity(city);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.hotChipText,
                      currentCity.id === city.id && styles.hotChipTextActive,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 已收藏的城市列表 */}
        {searchResults.length === 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.sectionHeader}>我的收藏城市 ({savedCities.length})</Text>
            <FlatList
              data={savedCities}
              keyExtractor={(item) => `saved-${item.id || item.name}`}
              renderItem={({ item }) => {
                const isSelected = currentCity.name === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.savedCityItem, isSelected && styles.savedCityActive]}
                    onPress={() => {
                      onSelectCity(item);
                      onClose();
                    }}
                  >
                    <View style={styles.cityLeft}>
                      <Ionicons
                        name={isSelected ? 'location' : 'location-outline'}
                        size={18}
                        color={isSelected ? '#3b82f6' : '#9ca3af'}
                        style={{ marginRight: 10 }}
                      />
                      <View>
                        <Text style={[styles.savedCityName, isSelected && styles.savedCityNameActive]}>
                          {item.name}
                        </Text>
                        <Text style={styles.savedCityAdmin}>
                          {[item.admin1, item.country].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cityRight}>
                      {savedCities.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => onRemoveCity(item)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-forward" size={16} color="#6b7280" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 13,
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hotSection: {
    marginBottom: 20,
  },
  hotChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hotChip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  hotChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  hotChipText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  hotChipTextActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  savedSection: {
    flex: 1,
  },
  savedCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  savedCityActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedCityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  savedCityNameActive: {
    color: '#60a5fa',
  },
  savedCityAdmin: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  cityRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 6,
    marginRight: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  resultCityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultAdmin: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});
