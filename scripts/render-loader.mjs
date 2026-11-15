/**
 * 合并加载器：
 *   1) 把 src/ 与 App.js 的 JSX/ESM 用项目自带 @babel/core 转成可执行模块
 *   2) 把 react-native / expo-* 等 RN 专有模块重定向到 scripts/stubs/ 下的 Web 桩
 *
 * 桩用真实文件路径（file: URL）而不是自定义协议，否则 Node 的 package scope
 * 解析会把自定义 URL 当成包路径去查 package.json 并抛 ERR_INVALID_URL。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import babel from '@babel/core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const STUB_DIR = path.join(HERE, 'stubs');

const stubUrl = (file) => pathToFileURL(path.join(STUB_DIR, file)).href;

const STUB_MAP = {
  'react-native': stubUrl('react-native.mjs'),
  'react-native-safe-area-context': stubUrl('safe-area.mjs'),
  'expo-linear-gradient': stubUrl('expo-linear-gradient.mjs'),
  'expo-status-bar': stubUrl('status-bar.mjs'),
  '@expo/vector-icons': stubUrl('vector-icons.mjs'),
  '@react-native-async-storage/async-storage': stubUrl('async-storage.mjs'),
};

export async function resolve(specifier, context, nextResolve) {
  const mapped = STUB_MAP[specifier];
  if (mapped) {
    return { url: mapped, shortCircuit: true };
  }

  // Metro/Babel 允许省略扩展名的相对导入（`./src/services/weatherService`），
  // Node 的 ESM 解析器要求显式扩展名，这里补上 .js。
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
  if (isRelative && !hasExtension && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const candidate = path.resolve(parentDir, specifier + '.js');
    try {
      await fs.access(candidate);
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    } catch {
      // 落回 Node 默认解析，让真正的错误信息透出来
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) return nextLoad(url, context);

  const filePath = fileURLToPath(url);
  if (!filePath.endsWith('.js')) return nextLoad(url, context);
  if (filePath.includes('node_modules')) return nextLoad(url, context);

  const inProject =
    filePath === path.join(ROOT, 'App.js') ||
    filePath.startsWith(path.join(ROOT, 'src') + path.sep);
  if (!inProject) return nextLoad(url, context);

  const source = await fs.readFile(filePath, 'utf8');
  const result = await babel.transformAsync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
  });

  return { format: 'module', shortCircuit: true, source: result.code };
}
