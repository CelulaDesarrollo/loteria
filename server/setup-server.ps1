# Script de instalación y compilación del servidor
# Ejecutar como: PowerShell -ExecutionPolicy Bypass -File setup-server.ps1

param(
    [switch]$NoCompile,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$serverPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🔧 Instalación del servidor Loteria" -ForegroundColor Green
Write-Host "Path: $serverPath`n" -ForegroundColor Gray

# Verificar Node.js
Write-Host "1️⃣  Verificando Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "   ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Error: Node.js no encontrado" -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host "`n2️⃣  Instalando dependencias NPM..." -ForegroundColor Cyan
Push-Location $serverPath

try {
    Write-Host "   npm install --legacy-peer-deps..."
    & npm install --legacy-peer-deps 2>&1 | ForEach-Object {
        if ($_ -match "added|up to date|warn") {
            Write-Host "   $_"
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Error en npm install"
    }
    Write-Host "   ✓ Dependencias instaladas" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Compilar TypeScript
if (-not $NoCompile) {
    Write-Host "`n3️⃣  Compilando TypeScript..." -ForegroundColor Cyan
    try {
        & npm run build 2>&1 | ForEach-Object {
            if ($_ -match "error|Error" -and $Verbose) {
                Write-Host "   ⚠️  $_"
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Error en compilación"
        }
        
        # Verificar que dist existe
        if (Test-Path "dist\index.js") {
            Write-Host "   ✓ Compilación exitosa" -ForegroundColor Green
            $fileSize = (Get-Item "dist\index.js").Length / 1KB
            Write-Host "   📦 dist/index.js ($([math]::Round($fileSize)) KB)" -ForegroundColor Gray
        } else {
            throw "dist/index.js no encontrado"
        }
    } catch {
        Write-Host "   ✗ Error: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Pop-Location

# Verificar .env
Write-Host "`n4️⃣  Verificando configuración..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "   ✓ .env encontrado" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env no existe, usando valores por defecto" -ForegroundColor Yellow
}

# Resumen
Write-Host "`n✅ Instalación completada" -ForegroundColor Green
Write-Host "`n📋 Pasos siguientes:" -ForegroundColor Cyan
Write-Host "   1. Inicia el servidor: npm start" -ForegroundColor Gray
Write-Host "   2. O usa el script: & '.\start-server.ps1'" -ForegroundColor Gray
Write-Host "`n📌 El servidor estará disponible en: http://localhost:3001" -ForegroundColor Gray
