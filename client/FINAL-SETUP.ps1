# FINAL-SETUP.PS1 - Completar la configuracion

Write-Host "`n=== LOTERIA - SETUP FINAL ===" -ForegroundColor Cyan

# 1. Esperar compilacion si aun esta en progreso
Write-Host "`n[1/4] Esperando compilacion..." -ForegroundColor Yellow
$maxWait = 0
while ((Get-Process npm -ErrorAction SilentlyContinue) -and $maxWait -lt 360) {
    Start-Sleep 5
    $maxWait += 5
}

if ($maxWait -ge 360) {
    Write-Host "⚠ Compilacion aun en progreso, continuando..." -ForegroundColor Yellow
}

# 2. Copiar compilacion a public/ si existe
Write-Host "`n[2/4] Verificando compilacion..." -ForegroundColor Yellow
if (Test-Path "C:\inetpub\wwwroot\loteria\client\out\index.html") {
    Write-Host "✓ Compilacion encontrada en out/" -ForegroundColor Green
    Write-Host "Copiando a public/..." -ForegroundColor Gray
    
    # Backup del index.html actual
    if (Test-Path "C:\inetpub\wwwroot\loteria\client\public\index.html") {
        Copy-Item "C:\inetpub\wwwroot\loteria\client\public\index.html" `
                  "C:\inetpub\wwwroot\loteria\client\public\index.html.backup"
    }
    
    # Copiar archivos (excepto web.config que ya existe)
    Copy-Item "C:\inetpub\wwwroot\loteria\client\out\*" `
              "C:\inetpub\wwwroot\loteria\client\public\" -Recurse -Force -Exclude "web.config"
    
    Write-Host "✓ Archivos copiados" -ForegroundColor Green
} else {
    Write-Host "⚠ out/index.html no encontrado" -ForegroundColor Yellow
    Write-Host "  Asegurate de ejecutar: npm run build" -ForegroundColor Gray
}

# 3. Verificar web.config
Write-Host "`n[3/4] Verificando web.config..." -ForegroundColor Yellow
if (Test-Path "C:\inetpub\wwwroot\loteria\client\public\web.config") {
    Write-Host "✓ web.config existe" -ForegroundColor Green
} else {
    Write-Host "✗ web.config faltante!" -ForegroundColor Red
}

# 4. Reiniciar IIS
Write-Host "`n[4/4] Reiniciando IIS..." -ForegroundColor Yellow
iisreset
Start-Sleep 3

Write-Host "`n=== SETUP COMPLETADO ===" -ForegroundColor Green
Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "1. Inicia servidor Node.js (en otra terminal):" -ForegroundColor White
Write-Host "   cd C:\inetpub\wwwroot\loteria\server" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host "`n2. Accede a:" -ForegroundColor White
Write-Host "   https://loteriainfosegura.uv.mx" -ForegroundColor Gray
Write-Host ""
