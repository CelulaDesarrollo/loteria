# 💻 COMANDOS RAPIDOS - Cheat Sheet

## 🚀 Despliegue Rapido (El 90% de casos)

```powershell
# Terminal 1: Compilar y desplegar
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1

# Terminal 2: Iniciar servidor
cd C:\inetpub\wwwroot\loteria\server
npm start
```

**Luego acceder a**: `https://loteriainfosegura.uv.mx`

---

## 🔍 Verificacion

```powershell
# Status completo
cd C:\inetpub\wwwroot\loteria
.\verify.ps1

# Verificar puerto 3003
netstat -ano | findstr :3003

# Verificar IIS
Get-Service W3SVC

# Verificar archivos compilados
dir C:\inetpub\wwwroot\loteria\client\out\index.html
dir C:\inetpub\wwwroot\loteria\server\dist\index.js
```

---

## 🔄 Reset y Limpieza

```powershell
# Reset completo (detiene IIS, limpia, reinstala)
cd C:\inetpub\wwwroot\loteria
.\reset.ps1

# Reset minimo (solo limpia .next, out, dist)
iisreset /stop
Start-Sleep 3
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\client\.next 2>nul"
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\client\out 2>nul"
cmd /c "rmdir /s /q C:\inetpub\wwwroot\loteria\server\dist 2>nul"
iisreset /start
```

---

## 📦 Compilacion Manual

```powershell
# Compilar cliente SOLO
cd C:\inetpub\wwwroot\loteria\client
npm run build

# Compilar servidor SOLO
cd C:\inetpub\wwwroot\loteria\server
npm run build

# Compilar ambos
cd C:\inetpub\wwwroot\loteria\client && npm run build
cd C:\inetpub\wwwroot\loteria\server && npm run build
```

---

## ⚙️ IIS Management

```powershell
# Detener IIS
iisreset /stop

# Iniciar IIS
iisreset /start

# Reiniciar IIS
iisreset

# Ver estado
Get-Service W3SVC

# Ver todo
Get-Service W3SVC, WAS, AppHostSvc
```

---

## 🔥 Matar Procesos

```powershell
# Matar Node.js
Get-Process node | Stop-Process -Force

# Matar npm
Get-Process npm | Stop-Process -Force

# Matar todos relacionados
Get-Process node, npm, next -ErrorAction SilentlyContinue | Stop-Process -Force

# Ver que hay en puerto
netstat -ano | findstr :3003

# Matar especifico
taskkill /PID <numero> /F
```

---

## 📁 Navegacion

```powershell
# Ir a raiz
cd C:\inetpub\wwwroot\loteria

# Ir a cliente
cd C:\inetpub\wwwroot\loteria\client

# Ir a servidor
cd C:\inetpub\wwwroot\loteria\server

# Ver contenido
dir          # Lista basica
ls -la       # Lista detallada (alias)
Get-ChildItem  # PowerShell native
```

---

## 📊 Monitoreo

```powershell
# Ver Socket.io log en tiempo real
cd C:\inetpub\wwwroot\loteria\server && npm start

# Ver puertos activos
netstat -ano | findstr LISTENING

# Ver procesos Node.js
Get-Process node | Format-Table Id, ProcessName, Working, CPU

# Ver carpeta cliente
dir C:\inetpub\wwwroot\loteria\client\out

# Ver carpeta servidor
dir C:\inetpub\wwwroot\loteria\server\dist

# Ver base de datos
Get-Content C:\inetpub\wwwroot\loteria\server\data\loteria.json | ConvertFrom-Json | Format-List
```

---

## 🔧 Configuracion

```powershell
# Editar variables entorno
notepad C:\inetpub\wwwroot\loteria\server\.env

# Editar web.config
notepad C:\inetpub\wwwroot\loteria\client\web.config

# Ver contenido .env
Get-Content C:\inetpub\wwwroot\loteria\server\.env

# Ver configuracion Socket.io
Get-Content C:\inetpub\wwwroot\loteria\server\src\index.ts
```

---

## 🧪 Pruebas

```powershell
# Probar conexion al servidor
Test-NetConnection -ComputerName localhost -Port 3003

# Probar request HTTP
Invoke-WebRequest -Uri http://localhost:3003 -ErrorAction SilentlyContinue

# Probar via proxy IIS
Invoke-WebRequest -Uri https://loteriainfosegura.uv.mx -ErrorAction SilentlyContinue

# Probar Socket.io
$response = Invoke-WebRequest -Uri http://localhost:3003/socket.io -ErrorAction SilentlyContinue
$response.StatusCode
```

---

## 📝 Edicion de Archivos

```powershell
# Abrir con notepad
notepad C:\inetpub\wwwroot\loteria\server\.env

# Abrir con VS Code (si instalado)
code C:\inetpub\wwwroot\loteria

# Ver contenido
Get-Content C:\inetpub\wwwroot\loteria\server\.env

# Ver ultimas lineas
Get-Content C:\inetpub\wwwroot\loteria\server\src\index.ts -Tail 20
```

---

## 🚨 Troubleshooting Rapido

```powershell
# Paso 1: Ver status
.\verify.ps1

# Paso 2: Si error EPERM
iisreset /stop
Start-Sleep 3
npm run build
iisreset /start

# Paso 3: Si Socket.io no conecta
netstat -ano | findstr :3003  # Debe estar LISTENING

# Paso 4: Si falla servidor
cd server
npm run build
npm start

# Paso 5: Si todo falla
.\reset.ps1
```

---

## 🔐 Permisos

```powershell
# Dar permisos IIS_IUSRS
icacls C:\inetpub\wwwroot\loteria /grant "IIS_IUSRS:F" /t

# Dar permisos IUSR
icacls C:\inetpub\wwwroot\loteria /grant "IUSR:F" /t

# Dar permisos Administrators
icacls C:\inetpub\wwwroot\loteria /grant "Administrators:F" /t

# Ver permisos actuales
icacls C:\inetpub\wwwroot\loteria
```

---

## 📋 Instalacion de Dependencias

```powershell
# Cliente
cd C:\inetpub\wwwroot\loteria\client
npm install                    # Normal
npm install --legacy-peer-deps # Si hay conflictos

# Servidor
cd C:\inetpub\wwwroot\loteria\server
npm install

# Ambos
cd client && npm install && cd ..\server && npm install
```

---

## 🔗 URLs Utiles

```
Aplicacion:    https://loteriainfosegura.uv.mx
Health Check:  http://localhost:3003
Socket.io:     ws://localhost:3003/socket.io/
Base de datos: C:\inetpub\wwwroot\loteria\server\data\loteria.json
```

---

## 📚 Documentos Relacionados

```
QUICK-GUIDE.md           - Para empezar rapido
TROUBLESHOOTING.md       - Para resolver errores
DEPLOY-GUIDE.md          - Pasos detallados
SETUP-LOCAL-SERVER.md    - Configuracion inicial
```

---

## ⏰ Tiempos Tipicos

| Operacion | Tiempo |
|-----------|--------|
| deploy.ps1 | 2-3 minutos |
| npm run build | 30-60 segundos |
| iisreset /stop | ~3 segundos |
| iisreset /start | ~3 segundos |
| npm start | ~1 segundo |
| Verificar status | ~5 segundos |

---

## 💾 Backup

```powershell
# Backup de datos
Copy-Item C:\inetpub\wwwroot\loteria\server\data\loteria.json `
          C:\backup\loteria.json.backup

# Backup de configuracion
Copy-Item C:\inetpub\wwwroot\loteria\server\.env `
          C:\backup\.env.backup

# Backup completo
Copy-Item C:\inetpub\wwwroot\loteria `
          C:\backup\loteria-$(Get-Date -f yyyyMMdd) -Recurse
```

---

**Tip**: Guarda este archivo para referencia rapida durante mantenimiento.

**Infra**: Windows IIS 10+ / Node.js 20+ / PowerShell 5.1
