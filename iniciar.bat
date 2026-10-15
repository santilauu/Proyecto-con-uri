@echo off
title Panel de paginas
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js en esta computadora.
  echo Instalalo desde https://nodejs.org ^(version LTS^), reinicia la PC y volve a ejecutar este archivo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias la primera vez...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Fallo la instalacion de dependencias. Revisa el error de arriba.
    pause
    exit /b 1
  )
)

rem Abre el navegador unos segundos despues, cuando el servidor ya esta escuchando.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3300"

call npm.cmd run panel
pause
