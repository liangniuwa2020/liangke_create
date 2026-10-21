@echo off
chcp 65001 >nul
cd /d "E:\Antigravity ex_project\no-ad-weather"
echo ========================================================
echo   姝ｅ湪鎺ㄩ€佷唬鐮佸埌 GitHub: liangniuwa2020/liangke_create
echo ========================================================
echo.
git push -u origin main
echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo [鎴愬姛] 浠ｇ爜宸插叏閮ㄦ帹閫佽嚦 GitHub 浠撳簱锛?) else (
    echo [鎻愮ず] 濡傞渶閲嶆柊楠岃瘉锛岃鎸夋彁绀哄畬鎴愭祻瑙堝櫒鎺堟潈鎴栫櫥褰曘€?)
echo ========================================================
pause

