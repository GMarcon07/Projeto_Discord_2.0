@echo off
title Discord Mini - Gerar Instalador Windows (.exe)
echo ========================================================
echo   Compilando e Gerando Instalador Windows (.exe)
echo ========================================================
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false

call npm run build:shared
call npm run build:electron --workspace=discord-mini-app
call npm run build:renderer --workspace=discord-mini-app
call npm run dist:win --workspace=discord-mini-app

echo.
echo ========================================================
echo   Instaladores gerados com SUCESSO em:
echo   F:\Projeto_Discord_2.0\electron-app\dist-release\
echo.
echo   - DiscordMini Setup 1.0.0.exe (Instalador NSIS)
echo   - DiscordMini 1.0.0.exe (Versao Portatil sem instalacao)
echo ========================================================
pause
