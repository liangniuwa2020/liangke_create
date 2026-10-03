@echo off
chcp 65001 >nul
cd /d "E:\Antigravity ex_project\moji-weather-app"
echo ========================================================
echo   正在推送代码到 GitHub: liangniuwa2020/liangke_create
echo ========================================================
echo.
git push -u origin main
echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo [成功] 代码已全部推送至 GitHub 仓库！
) else (
    echo [提示] 如需重新验证，请按提示完成浏览器授权或登录。
)
echo ========================================================
pause
