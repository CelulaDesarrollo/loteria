# Script para completar la migración y reiniciar IIS

Write-Host "=== FINALIZACION - LOTERIA EN IIS ===" -ForegroundColor Cyan

# 1. Verificar build
Write-Host "`n1. Verificando cliente compilado..." -ForegroundColor Yellow
$outPath = 'C:\inetpub\wwwroot\loteria\client\out'
if (Test-Path $outPath) {
    Write-Host "   OK: out/ existe" -ForegroundColor Green
} else {
    Write-Host "   ERROR: out/ no encontrado" -ForegroundColor Red
}

# 2. Verificar servidor Node.js
Write-Host "`n2. Verificando servidor Node.js..." -ForegroundColor Yellow
$nodeProcess = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "   OK: Servidor activo (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   INFO: Servidor no activo (ejecutar: npm start en server/)" -ForegroundColor Yellow
}

# 3. Verificar puerto 3003
Write-Host "`n3. Verificando puerto 3003..." -ForegroundColor Yellow
$port3003 = netstat -ano 2>$null | Select-String ':3003.*LISTENING' -ErrorAction SilentlyContinue
if ($port3003) {
    Write-Host "   OK: Puerto 3003 activo" -ForegroundColor Green
} else {
    Write-Host "   INFO: Puerto 3003 no activo" -ForegroundColor Yellow
}

# 4. Verificar web.config
Write-Host "`n4. Verificando web.config..." -ForegroundColor Yellow
$webConfigPath = 'C:\inetpub\wwwroot\loteria\client\web.config'
if (Test-Path $webConfigPath) {
    Write-Host "   OK: web.config presente" -ForegroundColor Green
} else {
    Write-Host "   ERROR: web.config no encontrado" -ForegroundColor Red
}

# 5. Reiniciar IIS
Write-Host "`n5. Reiniciando IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "   OK: IIS reiniciado" -ForegroundColor Green

# 6. Resumen
Write-Host "`n=== COMPLETADO ===" -ForegroundColor Green
Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "1. Accede a: https://loteriainfosegura.uv.mx" 
Write-Host "2. Abre consola (F12) y busca: [gameSocket] connected"
Write-Host "3. Para iniciar servidor Node.js:"
Write-Host "   cd C:\inetpub\wwwroot\loteria\server"
Write-Host "   npm start"
Write-Host ""
