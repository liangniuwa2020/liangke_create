/**
 * react-native 的 Web 桩实现。
 * 只用 React.createElement 书写（不含 JSX），因此可以被 Node 原生作为 ESM 加载，
 * 不需要经过站点自己的 Babel 转换流程。
 *
 * 用途：让 src/ 下的组件能在 Node 里用 react-dom/server 真实渲染，
 * 从而对「15 天 / 30 天预报是否真的全部显示」做 DOM 级断言。
 */

import React from 'react';

// React Native 特有、HTML 不认识的属性。渲染成 DOM 前剔除，
// 否则 React 会刷一堆 "does not recognize the prop" 警告淹没测试输出。
const RN_ONLY_PROPS = new Set([
  'numberOfLines', 'ellipsizeMode', 'hitSlop', 'showsVerticalScrollIndicator',
  'showsHorizontalScrollIndicator', 'horizontal', 'activeOpacity', 'resizeMode',
  'onPress', 'onPressIn', 'onPressOut', 'onLongPress', 'underlayColor',
  'scrollEnabled', 'pointerEvents', 'adjustsFontSizeToFit', 'minimumFontScale',
  'allowFontScaling', 'onLayout', 'contentContainerStyle', 'decelerationRate',
  'snapToInterval', 'pagingEnabled', 'scrollEventThrottle', 'onScroll',
  'keyboardShouldPersistTaps', 'removeClippedSubviews', 'accessibilityRole',
  'accessibilityLabel', 'accessibilityState', 'accessible', 'testID',
  'importantForAccessibility', 'selectionColor', 'placeholderTextColor',
  'autoCapitalize', 'autoCorrect', 'returnKeyType', 'blurOnSubmit',
  'keyboardType', 'secureTextEntry', 'multiline', 'editable', 'maxLength',
  'onChangeText', 'onSubmitEditing', 'onFocus', 'onBlur', 'shadowColor',
  'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation',
]);

function strip(props) {
  const out = {};
  for (const key of Object.keys(props)) {
    if (RN_ONLY_PROPS.has(key)) continue;
    out[key] = props[key];
  }
  return out;
}

const pass = (tag) => {
  const Component = React.forwardRef((props, ref) => React.createElement(tag, { ...strip(props), ref }));
  Component.displayName = `Stub(${tag})`;
  return Component;
};

export const View = pass('div');
export const Text = pass('span');
export const Image = pass('img');
export const ScrollView = pass('div');
export const SafeAreaView = pass('div');
export const KeyboardAvoidingView = pass('div');
export const Pressable = pass('button');
export const ActivityIndicator = pass('div');
export const Switch = pass('input');
export const TextInput = React.forwardRef((props, ref) =>
  React.createElement('input', {
    ...strip(props),
    ref,
    value: props.value,
    placeholder: props.placeholder,
    onChange: (e) => props.onChangeText && props.onChangeText(e.target.value),
  })
);
TextInput.displayName = 'Stub(TextInput)';

/** FlatList 桩：把 data 按 renderItem 逐条渲染成 div，便于断言行数。 */
export const FlatList = React.forwardRef((props, ref) => {
  const { data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent, ListEmptyComponent } = props;
  const items = Array.isArray(data) ? data : [];
  const children = [];
  if (ListHeaderComponent) {
    children.push(React.createElement('div', { key: 'header' }, ListHeaderComponent));
  }
  if (items.length === 0 && ListEmptyComponent) {
    children.push(React.createElement('div', { key: 'empty' }, ListEmptyComponent));
  }
  items.forEach((item, index) => {
    if (!renderItem) return;
    const key = keyExtractor ? keyExtractor(item, index) : String(index);
    children.push(React.createElement('div', { key, 'data-row': index }, renderItem({ item, index, separators: {} })));
  });
  if (ListFooterComponent) {
    children.push(React.createElement('div', { key: 'footer' }, ListFooterComponent));
  }
  return React.createElement('div', { ...strip(props), ref, 'data-listlen': items.length }, children);
});
FlatList.displayName = 'Stub(FlatList)';

export const SectionList = FlatList;

export const TouchableOpacity = (props) =>
  React.createElement('button', { ...strip(props), onClick: props.onPress }, props.children);
TouchableOpacity.displayName = 'Stub(TouchableOpacity)';

export const TouchableWithoutFeedback = (props) =>
  React.createElement('button', { ...strip(props), onClick: props.onPress }, props.children);
TouchableWithoutFeedback.displayName = 'Stub(TouchableWithoutFeedback)';


export const Modal = ({ visible, children }) =>
  visible ? React.createElement('div', { 'data-modal': 'open' }, children) : null;

export const RefreshControl = () => null;

export const Platform = {
  OS: 'android',
  Version: 34,
  select: (obj) => (obj.android !== undefined ? obj.android : obj.default),
};

export const Dimensions = { get: () => ({ width: 400, height: 800 }) };

export const StyleSheet = {
  create: (styles) => styles,
  flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}),
  compose: (a, b) => [a, b],
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
};

const noopAnimation = () => ({ start: (cb) => cb && cb({ finished: true }), stop: () => {} });

export const Animated = {
  View: pass('div'),
  Text: pass('span'),
  ScrollView: pass('div'),
  Image: pass('img'),
  Value: class {
    constructor(v) { this.v = v; }
    setValue() {}
    interpolate() { return this; }
  },
  timing: noopAnimation,
  spring: noopAnimation,
  sequence: noopAnimation,
  parallel: noopAnimation,
  loop: noopAnimation,
  createAnimatedComponent: (c) => c,
  event: () => () => {},
};

export const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  inOut: (f) => f,
  bezier: () => (t) => t,
};

export const NativeModules = {};
export const PermissionsAndroid = { request: async () => 'granted', PERMISSIONS: {} };
export const Linking = { openURL: async () => true };
export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
};
export const Alert = { alert: () => {} };
export const Vibration = { vibrate: () => {} };
export const BackHandler = { addEventListener: () => ({ remove: () => {} }) };
export const useColorScheme = () => 'dark';

export default {
  View, Text, Image, ScrollView, SafeAreaView, Pressable, TouchableOpacity,
  TouchableWithoutFeedback, Modal, RefreshControl, ActivityIndicator, Switch,
  TextInput, FlatList, SectionList, KeyboardAvoidingView,
  Platform, Dimensions, StyleSheet, Animated, Easing, NativeModules,
  PermissionsAndroid, Linking, AppState, Alert, Vibration, BackHandler,
  useColorScheme,
};
