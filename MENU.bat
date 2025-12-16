@REM MENU.bat - Menu visual para acceder a la documentacion

@echo off
setlocal enabledelayedexpansion
cls

:menu
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          LOTERIA - MENU DE DOCUMENTACION Y SCRIPTS             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo  COMIENZA AQUI (Nuevos):
echo  [1] START-HERE.md                    - Guia rapida 3 pasos
echo  [2] _SUMMARY.md                      - Resumen visual
echo.
echo  GUIAS PRINCIPALES:
echo  [3] QUICK-GUIDE.md                   - Arquitectura en 5 min
echo  [4] SETUP-LOCAL-SERVER.md            - Setup detallado
echo  [5] TROUBLESHOOTING.md               - Resolver problemas
echo.
echo  REFERENCIA RAPIDA:
echo  [6] CHEATSHEET.md                    - Comandos copy-paste
echo  [7] DOCUMENTATION-INDEX.md           - Indice completo
echo.
echo  DESPLIEGUE Y HERRAMIENTAS:
echo  [8] Ejecutar: deploy.ps1             - Compilar y desplegar
echo  [9] Ejecutar: reset.ps1              - Reset completo
echo  [10] Ejecutar: verify.ps1            - Ver estado
echo.
echo  [11] Listar todos los archivos
echo  [0] Salir
echo.
set /p choice="Selecciona una opcion [0-11]: "

if "%choice%"=="1" goto open_start
if "%choice%"=="2" goto open_summary
if "%choice%"=="3" goto open_quick
if "%choice%"=="4" goto open_setup
if "%choice%"=="5" goto open_trouble
if "%choice%"=="6" goto open_cheat
if "%choice%"=="7" goto open_index
if "%choice%"=="8" goto run_deploy
if "%choice%"=="9" goto run_reset
if "%choice%"=="10" goto run_verify
if "%choice%"=="11" goto list_files
if "%choice%"=="0" goto end

echo.
echo Error: Opcion no valida
timeout /t 2 /nobreak
goto menu

:open_start
notepad START-HERE.md
goto menu

:open_summary
notepad _SUMMARY.md
goto menu

:open_quick
notepad QUICK-GUIDE.md
goto menu

:open_setup
notepad SETUP-LOCAL-SERVER.md
goto menu

:open_trouble
notepad TROUBLESHOOTING.md
goto menu

:open_cheat
notepad CHEATSHEET.md
goto menu

:open_index
notepad DOCUMENTATION-INDEX.md
goto menu

:run_deploy
powershell -NoExit -Command ".\deploy.ps1"
goto menu

:run_reset
powershell -NoExit -Command ".\reset.ps1"
goto menu

:run_verify
powershell -NoExit -Command ".\verify.ps1"
goto menu

:list_files
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    TODOS LOS ARCHIVOS                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo DOCUMENTACION:
dir /b *.md
echo.
echo SCRIPTS:
dir /b *.ps1
echo.
pause
goto menu

:end
exit
