@echo off
title A resenha - Servidor + Desktop
echo ========================================================
echo   Iniciando A resenha Completo (Servidor + Desktop)
echo ========================================================
cd /d "%~dp0"

:: Libertar portas 3001 e 5173 caso tenham ficado presas
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1

npm run dev
pause
