# Script para iniciar el servidor de Loteria como servicio en Windows
# Requisitos: Node.js instalado, PowerShell como Admin

$serverPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = "node"
$mainFile = Join-Path $serverPath "dist\index.js"
$logFile = Join-Path $serverPath "server.log"
$pidFile = Join-Path $serverPath ".pid"

Write-Host "🚀 Iniciando servidor de Loteria..." -ForegroundColor Green
Write-Host "Path: $serverPath" -ForegroundColor Gray

# Verificar si Node.js está instalado
try {
    $nodeVersion = & $nodePath --version
    Write-Host "✓ Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Compilar TypeScript si es necesario
Write-Host "`n📦 Compilando TypeScript..." -ForegroundColor Yellow
Push-Location $serverPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en la compilación" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Verificar que el archivo compilado existe
if (-not (Test-Path $mainFile)) {
    Write-Host "❌ Error: $mainFile no encontrado después de compilar" -ForegroundColor Red
    exit 1
}

# Detener servidor anterior si existe
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile
    try {
        $process = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "⏹️  Deteniendo proceso anterior (PID: $oldPid)..." -ForegroundColor Yellow
            Stop-Process -Id $oldPid -Force
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "⚠️  No se pudo detener el proceso anterior" -ForegroundColor Gray
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Iniciar servidor en background
Write-Host "`n🌟 Iniciando servicio en puerto 3001..." -ForegroundColor Cyan
$process = Start-Process `
    -FilePath $nodePath `
    -ArgumentList $mainFile `
    -WorkingDirectory $serverPath `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError ($logFile -replace '.log$', '.error.log') `
    -PassThru `
    -NoNewWindow

# Guardar PID
$process.Id | Out-File $pidFile

Write-Host "✓ Servidor iniciado (PID: $($process.Id))" -ForegroundColor Green
Write-Host "📊 Log file: $logFile" -ForegroundColor Gray
Write-Host "`n⏳ Aguardando conexión en localhost:3001..." -ForegroundColor Cyan

# Esperar a que el servidor esté listo
$maxWait = 10
$waited = 0
$serverReady = $false

while ($waited -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 1 -ErrorAction SilentlyContinue
        $serverReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline
    }
}

if ($serverReady) {
    Write-Host "`n✓ Servidor está listo" -ForegroundColor Green
    Write-Host "`nℹ️  Acceso desde cliente:"
    Write-Host "  - Local: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  - Via IIS Proxy: https://loteriainfosegura.uv.mx/api/socket.io/" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Servidor puede no estar listo. Revisa el log:" -ForegroundColor Yellow
    Write-Host "  tail $logFile" -ForegroundColor Gray
}

Write-Host "`n📌 Para detener el servidor, ejecuta: Stop-Process -Id $($process.Id)" -ForegroundColor Gray
