@echo off
title Discord Mini - Gerar Instalador Windows (.exe)
echo ========================================================
echo   Compilando e Gerando Instalador Windows NSIS (.exe)
echo ========================================================
cd /d "%~dp0"
call npm run build:shared
call npm run build:electron --workspace=discord-mini-app
call npm run build:renderer --workspace=discord-mini-app
call npm run dist:win --workspace=discord-mini-app
echo ========================================================
echo   Instalador gerado com sucesso em:
echo   electron-app\dist-release\
echo ========================================================
pause
