@echo off
title A resenha - Servidor Backend
echo ========================================================
echo   Iniciando Servidor de Sinalizacao A resenha
echo   Porta: 3001
echo ========================================================
cd /d "%~dp0"

:: Libertar porta 3001 caso tenha ficado presa
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /F /PID %%a >nul 2>&1

npm run dev --workspace=server
pause
