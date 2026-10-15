@echo off
title Anon Luxury eCommerce Server
cd /d "%~dp0"
echo ===============================================================
echo  ✨ Starting Anon Luxury eCommerce Full-Stack Platform...
echo ===============================================================
python backend/app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Backend encountered an issue. Trying with root app.py...
    python app.py
)
pause
