/**
 * 注册渲染测试用的模块加载器（JSX 转换 + React Native 桩）。
 * 用法：node --import ./scripts/register-render.mjs <脚本>
 */

import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(here, 'render-loader.mjs')));
