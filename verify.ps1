# VERIFY.PS1 - Verificar estado de la aplicacion

Write-Host "`n=== VERIFICACION - LOTERIA ===" -ForegroundColor Cyan

# 1. Verificar archivos
Write-Host "`n[Archivos]" -ForegroundColor Yellow
$clientFiles = @(
    'C:\inetpub\wwwroot\loteria\client\out\index.html',
    'C:\inetpub\wwwroot\loteria\server\src\index.ts',
    'C:\inetpub\wwwroot\loteria\server\dist\index.js'
)

foreach ($file in $clientFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file" -ForegroundColor Red
    }
}

# 2. Verificar procesos
Write-Host "`n[Procesos]" -ForegroundColor Yellow
$nodeProcess = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "✓ Node.js corriendo (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js no esta corriendo" -ForegroundColor Red
}

# 3. Verificar puertos
Write-Host "`n[Puertos]" -ForegroundColor Yellow
$port3003 = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
if ($port3003) {
    Write-Host "✓ Puerto 3003 activo (Node.js server)" -ForegroundColor Green
} else {
    Write-Host "✗ Puerto 3003 no activo" -ForegroundColor Red
}

# 4. Verificar IIS
Write-Host "`n[IIS]" -ForegroundColor Yellow
$iisStatus = Get-Service W3SVC -ErrorAction SilentlyContinue
if ($iisStatus.Status -eq 'Running') {
    Write-Host "✓ IIS esta corriendo" -ForegroundColor Green
} else {
    Write-Host "✗ IIS no esta corriendo" -ForegroundColor Red
}

Write-Host "`n"
