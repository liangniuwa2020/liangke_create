#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
无广告天气 · 桌面小部件换肤/刷新验证脚本

用法：
    python test_widget_skin_verification.py                 # 先构建 APK，再校验 APK + 源码
    python test_widget_skin_verification.py --skip-apk      # 只校验源码与资源（不要求 APK）
    python test_widget_skin_verification.py --apk <path>    # 指定要校验的 APK

校验内容：
    APK 级   resources.arsc 含换肤图标 / 换肤按钮 / 三套小部件布局 / 4x2 背景
             classes.dex 含换肤广播与 30 分钟自动刷新相关符号
    源码级   三个 Provider 的换肤与刷新调用完整
             SyncHelper 有 30 分钟周期、精确闹钟降级、AQI 六档、更新时间幂等格式化
             Manifest 权限与广播接收器注册正确
             三个 info.xml 的 updatePeriodMillis 精确为 1800000
"""

import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
JAVA_SRC = os.path.join(
    ROOT, "android", "app", "src", "main", "java", "com", "pure", "mojiweather"
)
RES_XML = os.path.join(ROOT, "android", "app", "src", "main", "res", "xml")
MANIFEST = os.path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml")
DEFAULT_APK = os.path.join(
    ROOT, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"
)

WIDGET_SIZES = ["4x1", "4x2", "4x3"]

passed = 0
failed = 0


def ok(msg):
    global passed
    passed += 1
    print("    [OK] " + msg)


def bad(msg):
    global failed
    failed += 1
    print("    [FAIL] " + msg)


def check(cond, msg):
    if cond:
        ok(msg)
    else:
        bad(msg)


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def test_apk(apk_path):
    print("[*] 正在校验 APK 产物: " + apk_path)
    if not os.path.exists(apk_path):
        bad("APK 文件不存在: " + apk_path)
        return
    size = os.path.getsize(apk_path)
    print("    APK 文件大小: %.2f MB" % (size / (1024.0 * 1024.0)))
    check(size > 10 * 1024 * 1024, "APK 体积合理（> 10 MB）")

    with zipfile.ZipFile(apk_path, "r") as z:
        names = z.namelist()
        arsc = z.read("resources.arsc")
        check(b"ic_widget_skin" in arsc, "resources.arsc 含换肤图标 ic_widget_skin")
        check(b"widget_btn_skin" in arsc, "resources.arsc 含换肤按钮 widget_btn_skin")
        check(
            b"widget_bg_4x2" in arsc,
            "resources.arsc 含 4x2 独立背景 widget_bg_4x2",
        )
        check(
            all(("widget_weather_" + s).encode() in arsc for s in WIDGET_SIZES),
            "resources.arsc 含三套小部件布局 widget_weather_4x1/4x2/4x3",
        )

        check(
            "assets/index.android.bundle" in names,
            "assets/index.android.bundle 已打包（release 不会白屏）",
        )

        dex_files = [n for n in names if n.endswith(".dex")]
        print("    DEX 文件数量: %d" % len(dex_files))
        blob = b"".join(z.read(d) for d in dex_files)

    symbols = [
        b"ACTION_SWITCH_WIDGET_SKIN",
        b"toggleWidgetSkin",
        b"ACTION_AUTO_REFRESH_30MIN",
        b"scheduleAutoRefresh",
        b"canScheduleExactAlarms",
        b"formatUpdateTimeLabel",
        b"WeatherWidgetAutoRefreshReceiver",
        b"NoAdWeather/",
    ]
    for sym in symbols:
        check(sym in blob, "DEX 含符号 " + sym.decode())
    check(b"ACTION_AUTO_REFRESH_20MIN" not in blob, "DEX 不含已废弃的 ACTION_AUTO_REFRESH_20MIN")


def test_source():
    print("[*] 正在校验三个小部件 Provider 的换肤与刷新逻辑...")
    for size in WIDGET_SIZES:
        name = "WeatherWidget%sProvider.kt" % size
        path = os.path.join(JAVA_SRC, name)
        if not os.path.exists(path):
            bad("缺少源文件 " + name)
            continue
        code = read(path)
        check("ACTION_SWITCH_WIDGET_SKIN" in code, name + " 处理换肤广播")
        check("widget_btn_skin" in code, name + " 绑定换肤按钮")
        check("setColorFilter" in code, name + " 按皮肤设置图标颜色")
        check("pendingSkinIntent" in code, name + " 设置换肤点击意图")
        check("scheduleAutoRefresh(" in code, name + " 调用 30 分钟调度")
        check(
            "schedule20MinAutoRefresh(" not in code,
            name + " 不再调用已废弃的 20 分钟调度",
        )

    print("[*] 正在校验 WeatherWidgetSyncHelper 的实现细节...")
    helper = read(os.path.join(JAVA_SRC, "WeatherWidgetSyncHelper.kt"))
    check("toggleWidgetSkin" in helper, "Helper 含 toggleWidgetSkin")
    check("KEY_WIDGET_SKIN" in helper, "Helper 含 KEY_WIDGET_SKIN")
    for skin in ("dark", "white", "glass"):
        check('"%s"' % skin in helper, "Helper 含皮肤 %s" % skin)
    check(
        re.search(r"REFRESH_INTERVAL_MILLIS\s*=\s*30\s*\*\s*60\s*\*\s*1000L", helper)
        is not None,
        "刷新周期为 30 分钟",
    )
    check("canScheduleExactAlarms()" in helper, "调度前检查 canScheduleExactAlarms()")
    check("setAndAllowWhileIdle" in helper, "无精确闹钟权限时降级 setAndAllowWhileIdle")
    check('SimpleDateFormat("HH:mm"' in helper, "updateTime 只存 HH:mm")
    check('"HH:mm 更新"' not in helper, "不再存在 \"HH:mm 更新\" 旧格式")
    check("formatUpdateTimeLabel" in helper, "Helper 提供幂等的更新时间格式化")
    check("hourlyStartIndex" in helper, "hourly24 通过 hourlyStartIndex 对齐真实小时")
    for level in ("轻度污染", "中度污染", "重度污染", "严重污染"):
        check(level in helper, "AQI 分档含「%s」（与 JS 六档一致）" % level)
    check("ACTION_AUTO_REFRESH_20MIN" not in helper, "Helper 已移除 20 分钟旧动作")
    check("conn?.disconnect()" in helper, "httpGet 在 finally 中释放连接")

    print("[*] 正在校验 Manifest 权限与广播注册...")
    manifest = read(MANIFEST)
    for perm in (
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.WAKE_LOCK",
    ):
        check(perm in manifest, "Manifest 声明 " + perm)
    check(
        "com.pure.mojiweather.ACTION_AUTO_REFRESH_30MIN" in manifest,
        "Manifest 注册 ACTION_AUTO_REFRESH_30MIN",
    )
    check(
        "com.pure.mojiweather.ACTION_AUTO_REFRESH_20MIN" not in manifest,
        "Manifest 已移除 ACTION_AUTO_REFRESH_20MIN",
    )
    check(
        ".WeatherWidgetAutoRefreshReceiver" in manifest
        and 'android:exported="false"' in manifest,
        "自动刷新接收器导出关闭（第三方无法伪造刷新）",
    )
    check('android:allowBackup="false"' in manifest, "allowBackup 已关闭")
    for perm in (
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.VIBRATE",
    ):
        check(perm not in manifest, "Manifest 已移除未使用权限 " + perm)

    print("[*] 正在校验三套 widget info.xml...")
    for size in WIDGET_SIZES:
        info_path = os.path.join(RES_XML, "weather_widget_%s_info.xml" % size)
        if not os.path.exists(info_path):
            bad("缺少 info.xml: weather_widget_%s_info.xml" % size)
            continue
        info = read(info_path)
        check(
            'android:updatePeriodMillis="1800000"' in info,
            "weather_widget_%s_info.xml updatePeriodMillis=1800000" % size,
        )
        check(
            'android:previewLayout="@layout/widget_weather_%s"' % size in info,
            "weather_widget_%s_info.xml 设置 previewLayout（选择器有预览图）" % size,
        )


def main():
    args = sys.argv[1:]
    skip_apk = "--skip-apk" in args
    apk_path = DEFAULT_APK
    if "--apk" in args:
        idx = args.index("--apk")
        if idx + 1 < len(args):
            apk_path = args[idx + 1]

    if not skip_apk:
        test_apk(apk_path)
    else:
        print("[*] 已跳过 APK 校验（--skip-apk）")
    test_source()

    print("-" * 60)
    if failed:
        print("FAILED: %d 项通过, %d 项失败" % (passed, failed))
        return 1
    print("ALL TESTS PASSED: %d 项检查全部通过" % passed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
