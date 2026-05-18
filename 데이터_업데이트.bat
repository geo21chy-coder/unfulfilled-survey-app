@echo off
echo ===================================================
echo Updating field survey data...
echo (Converting DB.xlsx to app data)
echo ===================================================

cd /d "%~dp0"

echo Running python script...
python extract_unfulfilled.py

echo.
echo Update Completed! You can close this window.
pause
