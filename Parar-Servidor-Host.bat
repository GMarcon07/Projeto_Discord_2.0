@echo off
title A resenha - Parar Servidor Host
echo ========================================================
echo   A parar Servidor Host d'A resenha (Porta 3001)...
echo ========================================================
for /f tokens=5 %%a in ('netstat -aon ^| findstr :3001 ') do taskkill /F /PID %%a >nul 2>&1
echo Servidor parado com sucesso!
timeout /t 2 >nul
exit
