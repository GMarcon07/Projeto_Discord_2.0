@echo off
title A resenha - Versao Host (Servidor Local)
echo Iniciando A resenha (Versao Host Local)...
cd /d %~dp0
start wscript.exe %~dp0Iniciar-A-Resenha-Host.vbs
exit
