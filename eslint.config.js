// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'android/*', 'ios/*', '.expo/*'],
  },
  {
    // 构建/校验脚本运行在 Node.js 环境，需要 __dirname 等 Node 全局变量
    files: ['scripts/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },
  {
    rules: {
      // 这些规则曾经被降级成 warn/off，导致 `0 warnings` 变成一句空话：
      // hooks 依赖遗漏会直接造成「定时器不触发」「旧闭包读到过期 state」这类
      // 生产 bug，必须按 error 拦住。真正无法满足时用 eslint-disable-next-line
      // 就地说明原因，而不是全局静音。
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          // catch (e) 里只做兜底、不打印时用 _e 表示「有意忽略」
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Metro / React Native 的解析规则与 eslint-import-resolver 不一致，
      // 对 .png/字体等静态资源会误报，这项保持关闭。
      'import/no-unresolved': 'off',
      // 生产日志误留问题：console.log 会打进 release bundle，按警告提示清理
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // 校验脚本本身是命令行工具，日志就是它的输出
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // 测试用 React Native 桩：forwardRef 包裹函数组件 + 手工 displayName，
    // react/display-name 会对这类动态创建的桩组件误报。
    files: ['scripts/stubs/**/*.mjs'],
    rules: {
      'react/display-name': 'off',
    },
  },
  {
    // App.js 里这几条 console.log 是「30 分钟自动刷新」的现场诊断痕迹，
    // scripts/verify_refresh.js 会正则断言它们的存在（用于确认定时器真的被注册/清理），
    // 删掉或换成 warn 都会让回归测试失败，因此在这里单独放行。
    files: ['App.js'],
    rules: {
      'no-console': 'off',
    },
  },
]);
