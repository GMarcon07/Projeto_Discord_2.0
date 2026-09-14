@echo off
title Discord Mini - Aplicacao Desktop
echo ========================================================
echo   Iniciando Aplicacao Desktop Discord Mini (Electron)
echo ========================================================
cd /d "%~dp0"

:: Libertar porta 5173 do Vite caso tenha ficado presa
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1

npm run dev:electron --workspace=electron-app
pause
