import React from 'react';

const div = (props) => React.createElement('div', props);

export const SafeAreaProvider = ({ children }) =>
  React.createElement('div', { 'data-safe-area': 'provider' }, children);
export const SafeAreaView = div;
export const SafeAreaInsetsContext = React.createContext({ top: 0, bottom: 0, left: 0, right: 0 });
export const SafeAreaFrameContext = React.createContext({ x: 0, y: 0, width: 400, height: 800 });
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 400, height: 800 });
export const useSafeArea = () => ({
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 400, height: 800 },
});
export const initialWindowMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 400, height: 800 },
};

export default {
  SafeAreaProvider, SafeAreaView, useSafeAreaInsets, useSafeAreaFrame,
  useSafeArea, initialWindowMetrics, SafeAreaInsetsContext, SafeAreaFrameContext,
};
