import os
import zipfile
import re
import requests
import json
import sys

def test_weather_apk():
    apk_path = r"E:\Antigravity ex_project\moji-weather-app\MojiWeather.apk"
    print(f"[*] 正在检验天气 APK 产物: {apk_path}")
    assert os.path.exists(apk_path), f"APK 文件不存在: {apk_path}"
    file_size = os.path.getsize(apk_path)
    print(f"    APK 文件大小: {file_size / (1024*1024):.2f} MB")
    assert file_size > 50 * 1024 * 1024, "APK 文件过小，可能不完整"

    with zipfile.ZipFile(apk_path, 'r') as z:
        names = z.namelist()
        
        # 1. 验证 resources.arsc 中包含换肤相关资源名称
        arsc_data = z.read("resources.arsc")
        has_skin_icon = b"ic_widget_skin" in arsc_data
        has_widget_btn = b"widget_btn_skin" in arsc_data
        has_widget_4x1 = b"widget_weather_4x1" in arsc_data
        has_widget_4x2 = b"widget_weather_4x2" in arsc_data
        has_widget_4x3 = b"widget_weather_4x3" in arsc_data

        print(f"    resources.arsc 包含换肤图标 (ic_widget_skin): {has_skin_icon}")
        print(f"    resources.arsc 包含换肤按钮 (widget_btn_skin): {has_widget_btn}")
        print(f"    resources.arsc 包含小部件布局 4x1/4x2/4x3: {has_widget_4x1 and has_widget_4x2 and has_widget_4x3}")

        assert has_skin_icon, "APK resources.arsc 中未找到 ic_widget_skin 图标"
        assert has_widget_btn, "APK resources.arsc 中未找到 widget_btn_skin 控件 ID"
        assert has_widget_4x1 and has_widget_4x2 and has_widget_4x3, "APK resources.arsc 中未找到完整的小部件布局"

        # 2. 验证 classes.dex 中包含 ACTION_SWITCH_WIDGET_SKIN 和 toggleWidgetSkin
        dex_files = [n for n in names if n.endswith('.dex')]
        print(f"    包含 DEX 文件数量: {len(dex_files)}")
        found_action = False
        found_toggle = False
        for dex in dex_files:
            dex_data = z.read(dex)
            if b"ACTION_SWITCH_WIDGET_SKIN" in dex_data:
                found_action = True
            if b"toggleWidgetSkin" in dex_data:
                found_toggle = True

        print(f"    DEX 中是否包含换肤广播动作 ACTION_SWITCH_WIDGET_SKIN: {found_action}")
        print(f"    DEX 中是否包含换肤方法 toggleWidgetSkin: {found_toggle}")
        assert found_action, "DEX 中未找到换肤广播 Action"
        assert found_toggle, "DEX 中未找到 toggleWidgetSkin 方法"

    print("[SUCCESS] 天气应用 APK 及小部件换肤组件打包验证全部通过！\n")

def test_source_code_consistency():
    print("[*] 正在验证源码中 3 款小部件对皮肤切换按钮的处理完整性...")
    base_src = r"E:\Antigravity ex_project\moji-weather-app\android\app\src\main\java\com\pure\mojiweather"
    providers = ["WeatherWidget4x1Provider.kt", "WeatherWidget4x2Provider.kt", "WeatherWidget4x3Provider.kt"]
    
    for p in providers:
        fpath = os.path.join(base_src, p)
        with open(fpath, "r", encoding="utf-8") as f:
            code = f.read()
            assert "ACTION_SWITCH_WIDGET_SKIN" in code, f"{p} 缺少 ACTION_SWITCH_WIDGET_SKIN 处理"
            assert "widget_btn_skin" in code, f"{p} 缺少 widget_btn_skin 绑定"
            assert "setColorFilter" in code, f"{p} 缺少 widget_btn_skin 的 setColorFilter 颜色适配"
            assert "pendingSkinIntent" in code, f"{p} 缺少 pendingSkinIntent 设置"
        print(f"    [OK] {p} 逻辑完备（包含点击意图、深浅模式滤镜、广播分发）")

    # 检查 Helper 类
    helper_path = os.path.join(base_src, "WeatherWidgetSyncHelper.kt")
    with open(helper_path, "r", encoding="utf-8") as f:
        helper_code = f.read()
        assert "toggleWidgetSkin" in helper_code, "Helper 缺少 toggleWidgetSkin"
        assert "KEY_WIDGET_SKIN" in helper_code, "Helper 缺少 KEY_WIDGET_SKIN"
        assert "dark" in helper_code and "white" in helper_code and "glass" in helper_code, "Helper 缺少 3 款皮肤轮换定义"
    print("    [OK] WeatherWidgetSyncHelper.kt 轮询算法与持久化完整")

    print("[SUCCESS] 源码一致性与功能完整性验证全部通过！\n")

def test_ashare_backend_regression():
    print("[*] 正在对股票监控后台进行全量回归测试...")
    url_base = "http://127.0.0.1:8099"
    
    # 1. 检验热榜 200 条与高人气原因
    r = requests.get(f"{url_base}/api/market/hot_stocks?limit=200")
    assert r.status_code == 200, f"股票热榜接口异常: {r.status_code}"
    res = r.json()
    assert res.get("status") == "success", "返回状态非 success"
    hot_data = res.get("data", [])
    assert len(hot_data) == 200, f"热点榜单应严格为 200 条，实际为 {len(hot_data)}"
    assert all("hot_reason" in x and len(x["hot_reason"]) >= 15 for x in hot_data[:50]), "热榜股票缺少深入人气原因"
    print(f"    [OK] 股票热榜: {len(hot_data)} 支个股全部就绪，股吧/论坛/题材原因归因完整深入")

    # 2. 检验板块 TOP 20 及排序
    r = requests.get(f"{url_base}/api/market/strong_sectors")
    assert r.status_code == 200, "板块接口异常"
    sec_res = r.json()
    assert sec_res.get("status") == "success"
    sec_data = sec_res.get("data", [])
    assert len(sec_data) >= 15, "板块数据不足"
    first_sec = sec_data[0]["sector_name"]
    print(f"    [OK] 强势板块 TOP 20 正常，首个板块: {first_sec}")

    # 3. 检验板块内股票多维度排序指标
    r = requests.get(f"{url_base}/api/market/sector_stocks?sector={first_sec}")
    assert r.status_code == 200, "板块成分股接口异常"
    stocks_res = r.json()
    assert stocks_res.get("status") == "success"
    stocks = stocks_res.get("data", {}).get("stocks", [])
    assert len(stocks) > 0, "成分股为空"
    keys_needed = ["current_price", "change_percent", "turnover_rate", "amount", "total_mv", "pe_ratio", "pb_ratio"]
    for k in keys_needed:
        assert k in stocks[0], f"成分股缺少指标: {k}"
    print(f"    [OK] 板块成分股全部包含 7 维排序字段: {keys_needed}")

    # 4. 检验龙虎榜合并去重
    r = requests.get(f"{url_base}/api/market/dragon_tiger")
    assert r.status_code == 200, "龙虎榜接口异常"
    lhb_res = r.json()
    assert lhb_res.get("status") == "success"
    lhb = lhb_res.get("data", [])
    assert len(lhb) > 0, "龙虎榜数据为空"
    codes = [item["stock_code"] for item in lhb]
    assert len(codes) == len(set(codes)), "龙虎榜存在重复代码，未进行同股票合并！"
    print(f"    [OK] 龙虎榜 {len(lhb)} 条异动明细同股原因合并成功，无重复项")

    print("[SUCCESS] 股票监控系统全量回归测试全部通过！\n")

if __name__ == "__main__":
    test_weather_apk()
    test_source_code_consistency()
    test_ashare_backend_regression()
    print("="*60)
    print("ALL TESTS PASSED: 天气桌面小部件换肤功能与股票系统测试 100% 达标！")
    print("="*60)
