@echo off
title A resenha - Gerar Instalador Windows (.exe)
echo ========================================================
echo   Compilando e Gerando Instalador Windows (.exe)
echo   Aplicacao: A resenha
echo ========================================================
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false

call npm run build:shared
call npm run build:server
call npm run build:electron --workspace=electron-app
call npm run build:renderer --workspace=electron-app
call npm run dist:win --workspace=electron-app

echo.
echo ========================================================
echo   Instaladores gerados com SUCESSO em:
echo   %~dp0electron-app\dist-release\
echo.
echo   - A resenha Setup 1.0.0.exe (Instalador NSIS com atalho)
echo   - A resenha 1.0.0.exe (Versao Portatil sem instalacao)
echo ========================================================
pause
