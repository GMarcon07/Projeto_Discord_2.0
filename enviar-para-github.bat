@echo off
title Discord Mini - Enviar para o GitHub
echo ========================================================
echo   Enviando o projeto para o GitHub:
echo   https://github.com/GMarcon07/Projeto_Discord_2.0.git
echo ========================================================
cd /d "%~dp0"
"C:\Users\gabri\AppData\Local\Programs\Git\cmd\git.exe" push -u origin main
echo.
echo ========================================================
echo   Processo concluido! Verifica o teu repositorio:
echo   https://github.com/GMarcon07/Projeto_Discord_2.0
echo ========================================================
pause
