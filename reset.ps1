# RESET.PS1 - Reset Completo de la Aplicacion

Write-Host "`n=== RESET COMPLETO - LOTERIA ===" -ForegroundColor Cyan

$path = "C:\inetpub\wwwroot\loteria"

# 1. Detener IIS
Write-Host "`n[1/6] Deteniendo IIS..." -ForegroundColor Yellow
iisreset /stop 2>&1 | Out-Null
Start-Sleep 3

# 2. Matar procesos
Write-Host "[2/6] Deteniendo procesos..." -ForegroundColor Yellow
Get-Process node, npm, next -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# 3. Limpiar compilaciones
Write-Host "[3/6] Limpiando compilaciones anteriores..." -ForegroundColor Yellow
cmd /c "rmdir /s /q $path\client\.next 2>nul"
cmd /c "rmdir /s /q $path\client\out 2>nul"
cmd /c "rmdir /s /q $path\client\dist 2>nul"
cmd /c "rmdir /s /q $path\server\dist 2>nul"

# 4. Limpiar node_modules (opcional, comentar si no quieres)
$cleanModules = Read-Host "¿Limpiar node_modules? (s/n)"
if ($cleanModules -eq "s") {
    Write-Host "[4/6] Limpiando dependencias..." -ForegroundColor Yellow
    cmd /c "rmdir /s /q $path\client\node_modules 2>nul"
    cmd /c "rmdir /s /q $path\server\node_modules 2>nul"
    
    Write-Host "[5/6] Reinstalando dependencias (esto puede tardar 2-3 minutos)..." -ForegroundColor Cyan
    cd $path\client
    npm install --legacy-peer-deps 2>&1 | Out-Null
    cd $path\server
    npm install 2>&1 | Out-Null
    npm run build 2>&1 | Out-Null
} else {
    Write-Host "[4/6] Omitiendo limpieza de node_modules" -ForegroundColor Yellow
    Write-Host "[5/6] Compilando servidor..." -ForegroundColor Cyan
    cd $path\server
    npm run build 2>&1 | Out-Null
}

# 5. Iniciar IIS
Write-Host "`n[6/6] Iniciando IIS..." -ForegroundColor Yellow
iisreset /start 2>&1 | Out-Null
Start-Sleep 3

# 6. Mostrar status
Write-Host "`n=== RESET COMPLETADO ===" -ForegroundColor Green
Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "1. Compilar cliente:"  -ForegroundColor White
Write-Host "   cd $path\client" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host "`n2. Iniciar servidor (en OTRA terminal):" -ForegroundColor White
Write-Host "   cd $path\server" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host "`n3. Acceder a:" -ForegroundColor White
Write-Host "   https://loteriainfosegura.uv.mx" -ForegroundColor Gray
Write-Host ""
