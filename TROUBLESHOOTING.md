# 🔧 TROUBLESHOOTING - Solucion de Problemas

## Error 1: EPERM: operation not permitted

### Sintomas
```
Error: EPERM: operation not permitted, mkdir 'C:\inetpub\wwwroot\loteria\client\out\_next\...'
Error: EPERM: operation not permitted, lstat 'C:\inetpub\wwwroot\loteria\client\out'
```

### Causa
IIS tiene archivos abiertos en la carpeta `out/` mientras npm intenta escribir.

### Solucion Rapida
```powershell
# 1. Detener IIS
iisreset /stop
Start-Sleep 3

# 2. Compilar
cd C:\inetpub\wwwroot\loteria\client
npm run build

# 3. Reiniciar IIS
cd ..
iisreset /start
```

### Solucion Agresiva (si lo anterior no funciona)
```powershell
# 1. Detener IIS
iisreset /stop
Start-Sleep 3

# 2. Matar procesos
Get-Process node, npm -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Limpiar con cmd.exe (mas potente)
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\client\.next 2>nul"
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\client\out 2>nul"
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\client\dist 2>nul"

# 4. Compilar
cd C:\inetpub\wwwroot\loteria\client
npm run build

# 5. Reiniciar IIS
cd ..
iisreset /start
```

---

## Error 2: Socket.io connection timeout or 404

### Sintomas
- DevTools Console muestra: `404 Not Found` o `timeout`
- Pagina carga pero no conecta al servidor
- Console log no muestra `[gameSocket] connected`

### Verificar

**1. Servidor corriendo:**
```powershell
netstat -ano | findstr :3003
# Deberia mostrar: TCP    127.0.0.1:3003    LISTENING
```

**2. Proceso Node.js activo:**
```powershell
Get-Process node
# Si no aparece nada, servidor no esta corriendo
```

**3. URL del cliente es relativa:**
```bash
# En client/src/lib/gameSocket.ts
# Deberia ser:
const SERVER_URL = "/api/socket.io/"  # ✓ CORRECTO

# NO deberia ser:
const SERVER_URL = "http://localhost:3003"  # ✗ INCORRECTO
```

**4. web.config tiene reglas proxy:**
```xml
<!-- En client/web.config deberia existir: -->
<rule name="Proxy Socket.io" patternSyntax="Wildcard">
    <match url="api/socket.io/*" />
    <conditions trackAllCaptures="false" />
    <action type="Rewrite" url="http://localhost:3003/socket.io/{R:1}" />
</rule>
```

### Solucion

**Paso 1: Verificar servidor corriendo**
```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start

# Deberia mostrar algo como:
# [gameSocket] Socket.io listening on port 3003
# [gameSocket] CORS configured for: https://loteriainfosegura.uv.mx
```

**Paso 2: Forzar recarga del cliente**
```
En navegador:
1. Abrir https://loteriainfosegura.uv.mx
2. Presionar Ctrl+Shift+Delete (limpiar cache)
3. Presionar Ctrl+F5 (recarga forzada)
4. Abrir DevTools (F12)
5. Buscar "[gameSocket]" en logs
```

**Paso 3: Verificar URL proxy**
```powershell
# Acceder a endpoint API
https://loteriainfosegura.uv.mx/api/health

# Si devuelve JSON, proxy funciona
# Si devuelve 404, revisar web.config
```

---

## Error 3: Node.js server crashes on startup

### Sintomas
```
npm start
# Termina inmediatamente sin errores o con error generico
```

### Causas Comunes

**1. Puerto ocupado**
```powershell
netstat -ano | findstr :3003
# Si muestra algo, puerto esta ocupado

# Matar proceso
taskkill /PID <numero> /F
```

**2. Archivo .env faltante**
```powershell
# Verificar archivo existe
Test-Path C:\inetpub\wwwroot\loteria\server\.env

# Si no existe, crear con minimo:
@"
NODE_ENV=production
PORT=3003
HOST=localhost
CLIENT_URL_PROD=https://loteriainfosegura.uv.mx
ADMIN_TOKEN=admin123
"@ | Out-File .env
```

**3. Dependencias no instaladas**
```powershell
cd C:\inetpub\wwwroot\loteria\server
rm -r node_modules -Force -ErrorAction SilentlyContinue
npm install
npm run build
npm start
```

**4. Archivo database.ts tiene error**
```powershell
# Verificar compilacion
npm run build

# Si falla, ver error especifico
```

### Solucion Completa

```powershell
cd C:\inetpub\wwwroot\loteria\server

# 1. Reinstalar todo
rm -r node_modules dist -Force -ErrorAction SilentlyContinue
npm install

# 2. Compilar
npm run build

# 3. Limpiar datos (si es necesario)
# rm data/loteria.json -Force -ErrorAction SilentlyContinue

# 4. Iniciar
npm start
```

---

## Error 4: IIS devuelve 404 or 500

### Sintomas
```
https://loteriainfosegura.uv.mx
# Muestra: 404 Not Found o 500 Internal Server Error
```

### Causas

**1. Carpeta out/ no existe o esta vacia**
```powershell
dir C:\inetpub\wwwroot\loteria\client\out

# Deberia mostrar:
# index.html (archivo)
# _next (carpeta)
# public (carpeta)
```

**2. Permisos de lectura incorrectos**
```powershell
# Dar permisos a IIS
icacls C:\inetpub\wwwroot\loteria\client\out /grant "IIS_IUSRS:R" /t
icacls C:\inetpub\wwwroot\loteria\client\out /grant "IUSR:R" /t
```

**3. Configuracion del sitio web incorrecta**
En IIS Manager:
- Verificar "Physical path" = `C:\inetpub\wwwroot\loteria\client\out`
- Verificar "Default document" incluye `index.html`

### Solucion

```powershell
# 1. Verificar contenido
dir C:\inetpub\wwwroot\loteria\client\out | head -10

# 2. Dar permisos
icacls C:\inetpub\wwwroot\loteria\client\out /grant "IIS_IUSRS:F" /t
icacls C:\inetpub\wwwroot\loteria\client\out /grant "IUSR:F" /t

# 3. Reiniciar IIS
iisreset

# 4. Acceder en navegador
# https://loteriainfosegura.uv.mx
```

---

## Error 5: npm ERR! code ERESOLVE

### Sintomas
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

### Causa
Versiones incompatibles de paquetes.

### Solucion

```powershell
cd C:\inetpub\wwwroot\loteria\client

# Opcion 1: Instalar ignorando dependencias
npm install --legacy-peer-deps

# Opcion 2: Limpiar y reinstalar
rm -r node_modules package-lock.json -Force
npm install
```

---

## Error 6: "Address already in use" or "EADDRINUSE"

### Sintomas
```
Error: listen EADDRINUSE: address already in use :::3003
```

### Solucion

```powershell
# Encontrar proceso usando puerto
netstat -ano | findstr :3003

# Resultado: TCP    127.0.0.1:3003    LISTENING    12345
# Matar proceso
taskkill /PID 12345 /F

# O matar todos los node
Get-Process node | Stop-Process -Force
```

---

## Error 7: Build fails with "Out of memory"

### Sintomas
```
JavaScript heap out of memory
```

### Solucion

```powershell
# Aumentar memoria de Node.js
set NODE_OPTIONS=--max-old-space-size=4096
npm run build
```

---

## Diagnostico Paso a Paso

Si algo no funciona, seguir este orden:

### 1. Verificar Estado Basico
```powershell
cd C:\inetpub\wwwroot\loteria

# A. ¿Existen los archivos?
Test-Path "client\out\index.html"
Test-Path "server\dist\index.js"
Test-Path "server\.env"

# B. ¿IIS esta corriendo?
Get-Service W3SVC

# C. ¿Servidor Node.js esta corriendo?
netstat -ano | findstr :3003

# D. ¿Procesos OK?
Get-Process node, w3wp, npm -ErrorAction SilentlyContinue
```

### 2. Verificar Conectividad
```powershell
# Conectarse al servidor directamente
$response = Invoke-WebRequest -Uri http://localhost:3003 -ErrorAction SilentlyContinue
$response.StatusCode

# Conectarse via proxy IIS
$response = Invoke-WebRequest -Uri https://loteriainfosegura.uv.mx -ErrorAction SilentlyContinue
$response.StatusCode
```

### 3. Revisar Logs
```powershell
# Logs del servidor (mientras esta corriendo)
cd C:\inetpub\wwwroot\loteria\server
npm start

# Logs del navegador
# 1. Abrir https://loteriainfosegura.uv.mx
# 2. F12 (DevTools)
# 3. Tab: Console
# 4. Buscar "ERROR" o "[gameSocket]"
```

### 4. Limpiar y Reintentar
```powershell
cd C:\inetpub\wwwroot\loteria

# Detener IIS
iisreset /stop

# Matar procesos
Get-Process node, npm -ErrorAction SilentlyContinue | Stop-Process -Force

# Limpiar compilaciones antiguas
cmd /c "rmdir /s /q client\.next 2>nul"
cmd /c "rmdir /s /q client\out 2>nul"
cmd /c "rmdir /s /q client\dist 2>nul"
cmd /c "rmdir /s /q server\dist 2>nul"

# Ejecutar deploy
.\deploy.ps1

# En otra terminal
cd server
npm start
```

---

## Scripts de Ayuda

### Script: Reset Completo
```powershell
# reset.ps1

$path = "C:\inetpub\wwwroot\loteria"
cd $path

Write-Host "Deteniendo IIS..."
iisreset /stop
Start-Sleep 3

Write-Host "Matando procesos..."
Get-Process node, npm, next -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Limpiando directorios..."
cmd /c "rmdir /s /q $path\client\.next 2>nul"
cmd /c "rmdir /s /q $path\client\out 2>nul"
cmd /c "rmdir /s /q $path\client\dist 2>nul"
cmd /c "rmdir /s /q $path\server\dist 2>nul"

Write-Host "Iniciando IIS..."
iisreset /start

Write-Host "✓ Reset completo. Ahora ejecutar:"
Write-Host "  .\deploy.ps1"
Write-Host "  y luego en otra terminal:"
Write-Host "  cd server && npm start"
```

### Script: Monitoreo en Tiempo Real
```powershell
# monitor.ps1

while ($true) {
    Clear-Host
    Write-Host "=== ESTADO LOTERIA ===" -ForegroundColor Cyan
    
    Write-Host "`nProcesos:"
    $node = Get-Process node -ErrorAction SilentlyContinue
    if ($node) { Write-Host "✓ Node.js ($($node.Id))" -ForegroundColor Green }
    else { Write-Host "✗ Node.js no corriendo" -ForegroundColor Red }
    
    Write-Host "`nPuertos:"
    $port = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
    if ($port) { Write-Host "✓ Puerto 3003 activo" -ForegroundColor Green }
    else { Write-Host "✗ Puerto 3003 inactivo" -ForegroundColor Red }
    
    Write-Host "`nIIS:"
    $iis = Get-Service W3SVC
    if ($iis.Status -eq 'Running') { Write-Host "✓ IIS corriendo" -ForegroundColor Green }
    else { Write-Host "✗ IIS detenido" -ForegroundColor Red }
    
    Write-Host "`nArchivos:"
    if (Test-Path "C:\inetpub\wwwroot\loteria\client\out\index.html") 
    { Write-Host "✓ Cliente compilado" -ForegroundColor Green }
    else { Write-Host "✗ Cliente no compilado" -ForegroundColor Red }
    
    Write-Host "`n[Actualizar en 10 segundos...]" -ForegroundColor Gray
    Start-Sleep 10
}
```

---

## Contacto y Soporte

Si los problemas persisten:
1. Ejecutar .\verify.ps1
2. Guardar output
3. Enviar junto con error message especifico

**Infraestructura:** Windows IIS 10+ + Node.js 20+
**Ultima actualizacion:** 2024
