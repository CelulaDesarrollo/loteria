# DEPLOY.PS1 - Despliegue automatizado
# Uso: PowerShell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host "`n=== DESPLIEGUE - LOTERIA ===" -ForegroundColor Cyan

# 1. Detener IIS
Write-Host "`n[1/5] Deteniendo IIS..." -ForegroundColor Yellow
iisreset /stop 2>&1 | Out-Null
Start-Sleep 3

# 2. Matar procesos
Write-Host "[2/5] Deteniendo procesos..." -ForegroundColor Yellow
Get-Process node, npm, next -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# 3. Limpiar directorios (usando cmd para máxima compatibilidad)
Write-Host "[3/5] Limpiando directorios..." -ForegroundColor Yellow
cd 'C:\inetpub\wwwroot\loteria\client'
cmd /c "rmdir /s /q .next 2>nul"
cmd /c "rmdir /s /q out 2>nul"
cmd /c "rmdir /s /q dist 2>nul"

# 4. Compilar
Write-Host "[4/5] Compilando cliente (esto puede tardar 2-3 minutos)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Fallo en compilacion" -ForegroundColor Red
    exit 1
}

# 5. Iniciar IIS
Write-Host "`n[5/5] Iniciando IIS..." -ForegroundColor Yellow
iisreset /start 2>&1 | Out-Null
Start-Sleep 3

Write-Host "`n=== DESPLIEGUE COMPLETADO ===" -ForegroundColor Green
Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "1. Accede a: https://loteriainfosegura.uv.mx" -ForegroundColor White
Write-Host "2. Para iniciar servidor Node.js (en otra terminal):" -ForegroundColor White
Write-Host "   cd C:\inetpub\wwwroot\loteria\server" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
