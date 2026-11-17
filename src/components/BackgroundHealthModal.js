import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  readBackgroundDiagnostics,
  describeBackgroundDiagnosis,
  ensureBackgroundScheduler,
  openBatterySettings,
  parseWorkState,
  STALE_WARN_MINUTES,
} from '../services/syncHealth';
import { formatSyncAge } from '../services/refreshPolicy';

/**
 * 后台保活体检面板
 *
 * 为什么需要这个面板：用户「睡一觉起来还是昨晚的数据」时，我们在此前的版本里
 * 只能给一句「点刷新或检查后台权限」，用户照做也未必有用，因为真正的原因可能
 * 有四种，处理方式各不相同：
 *
 *   1. WorkManager 周期任务被 ROM 连同后台权限一起清掉了  → 点「重新登记」
 *   2. 任务还在，但一直排不进 CPU（省电策略压着）         → 打开电池优化白名单
 *   3. 系统没给精确闹钟权限（Android 12+ 默认不给）      → 同上，去系统设置手动开
 *   4. 任务跑了但每次请求都失败（网络/流量受限）         → 查网络
 *
 * 把 WorkManager 状态、电池白名单、精确闹钟三项系统级事实直接摊在界面上，
 * 用户不连电脑也能自己判断，我们排查时也不用再靠猜。
 */
export default function BackgroundHealthModal({ visible, onClose, onManualRefresh }) {
  const [loading, setLoading] = useState(true);
  const [diag, setDiag] = useState(null);
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const raw = await readBackgroundDiagnostics();
    setDiag(raw);
    setIssues(describeBackgroundDiagnosis(raw));
    setNotice('');
    setLoading(false);
  }, []);

  // 打开面板时自动体检一次。
  // setState 必须发生在 Promise 回调里而不是 effect 同步阶段，
  // 否则会触发级联渲染（react-hooks/set-state-in-effect）。
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    readBackgroundDiagnostics().then((raw) => {
      if (!alive) return;
      setDiag(raw);
      setIssues(describeBackgroundDiagnosis(raw));
      setNotice('');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  const handleReschedule = async () => {
    setBusy(true);
    const ok = await ensureBackgroundScheduler();
    setNotice(ok ? '已重新登记后台刷新任务' : '登记失败，请重启一次 App 再试');
    await load();
    setBusy(false);
  };

  const handleBattery = async () => {
    const ok = await openBatterySettings();
    setNotice(ok ? '已打开系统设置，请把本应用设为「不限制」' : '没能打开系统设置，请手动进入 设置 → 电池 → 应用耗电管理');
  };

  const handleRefreshNow = () => {
    if (typeof onManualRefresh === 'function') onManualRefresh();
    setNotice('已请求一次立即刷新');
  };

  const workParsed = parseWorkState(diag ? diag.workState : '');
  const ageText = diag ? formatSyncAge(diag.lastSyncAt) : '时间未知';
  const deviceLabel = diag
    ? [diag.manufacturer, diag.model].filter(Boolean).join(' ') || '未知机型'
    : '未知机型';

  const renderIssueAction = (action) => {
    if (action === 'reschedule') {
      return (
        <TouchableOpacity style={styles.issueBtn} onPress={handleReschedule} disabled={busy}>
          <Text style={styles.issueBtnText}>重新登记</Text>
        </TouchableOpacity>
      );
    }
    if (action === 'battery') {
      return (
        <TouchableOpacity style={styles.issueBtn} onPress={handleBattery} disabled={busy}>
          <Text style={styles.issueBtnText}>去设置</Text>
        </TouchableOpacity>
      );
    }
    if (action === 'refresh') {
      return (
        <TouchableOpacity style={styles.issueBtn} onPress={handleRefreshNow} disabled={busy}>
          <Text style={styles.issueBtnText}>立即刷新</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="pulse-outline" size={24} color="#38bdf8" />
            </View>
            <Text style={styles.title}>后台刷新体检</Text>
            <Text style={styles.subtitle}>确认息屏后到底有没有在刷新</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text style={styles.loadingTip}>正在读取系统状态...</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>上次成功同步</Text>
                <Text style={styles.factValue}>{ageText}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>后台任务状态</Text>
                <Text
                  style={[
                    styles.factValue,
                    workParsed.state === 'MISSING' || workParsed.state === 'CANCELLED'
                      ? styles.factBad
                      : null,
                  ]}
                >
                  {workParsed.state}
                  {workParsed.runs > 0 ? ` · 已重试${workParsed.runs}次` : ''}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>电池优化白名单</Text>
                <Text
                  style={[
                    styles.factValue,
                    diag && diag.batteryOptimizationIgnored ? styles.factGood : styles.factBad,
                  ]}
                >
                  {diag && diag.batteryOptimizationIgnored ? '已放行' : '未放行'}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>精确闹钟权限</Text>
                <Text
                  style={[
                    styles.factValue,
                    diag && diag.exactAlarmAllowed ? styles.factGood : styles.factBad,
                  ]}
                >
                  {diag && diag.exactAlarmAllowed ? '已允许' : '未允许'}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>连续失败次数</Text>
                <Text
                  style={[
                    styles.factValue,
                    diag && diag.failCount > 0 ? styles.factBad : styles.factGood,
                  ]}
                >
                  {diag ? diag.failCount : 0}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>机型</Text>
                <Text style={styles.factValue}>
                  {deviceLabel} · Android {diag ? diag.sdkInt : 0}
                </Text>
              </View>

              <View style={styles.divider} />

              {issues.length === 0 ? (
                <View style={styles.allGood}>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                  <Text style={styles.allGoodText}>
                    一切正常。超过 {STALE_WARN_MINUTES} 分钟没成功同步时会在这里提示。
                  </Text>
                </View>
              ) : (
                issues.map((issue) => (
                  <View key={issue.key} style={styles.issueRow}>
                    <Ionicons
                      name={issue.level === 'error' ? 'alert-circle' : 'warning'}
                      size={15}
                      color={issue.level === 'error' ? '#fca5a5' : '#fcd34d'}
                      style={styles.issueIcon}
                    />
                    <Text style={styles.issueText}>{issue.text}</Text>
                    {renderIssueAction(issue.action)}
                  </View>
                ))
              )}

              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            </ScrollView>
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.footerBtn} onPress={handleBattery} disabled={busy}>
              <Ionicons name="battery-half-outline" size={14} color="#93c5fd" />
              <Text style={styles.footerBtnText}>电池设置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={handleReschedule} disabled={busy}>
              <Ionicons name="refresh-outline" size={14} color="#93c5fd" />
              <Text style={styles.footerBtnText}>重新登记</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={load} disabled={busy}>
              <Ionicons name="reload-outline" size={14} color="#93c5fd" />
              <Text style={styles.footerBtnText}>重新检测</Text>
            </TouchableOpacity>
          </View>

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
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 3,
  },
  loadingWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingTip: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  body: {
    maxHeight: 400,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  factLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  factValue: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    maxWidth: 180,
    textAlign: 'right',
  },
  factGood: {
    color: '#6ee7b7',
  },
  factBad: {
    color: '#fca5a5',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 10,
  },
  allGood: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  allGoodText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  issueIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  issueText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginRight: 8,
  },
  issueBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  issueBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bae6fd',
  },
  notice: {
    fontSize: 11,
    color: '#fcd34d',
    marginTop: 8,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.35)',
  },
  footerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93c5fd',
  },
  closeBtn: {
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
