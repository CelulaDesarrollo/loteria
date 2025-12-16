# 🚀 GUIA RAPIDA - Migracion a Servidor Local

## TL;DR - Pasos Basicos

### 1. Compilar y Desplegar
```powershell
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1
```

### 2. Iniciar Servidor (en OTRA terminal)
```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start
```

### 3. Acceder a la App
```
https://loteriainfosegura.uv.mx
```

---

## Arquitectura

```
Cliente (Next.js SPA)  
        ↓↓↓  
    IIS Proxy (HTTPS)
        ↓↓↓
Servidor Node.js (localhost:3003)
```

**Flujo de peticiones Socket.io:**
1. Cliente: `io.connect("/api/socket.io/")`
2. IIS recibe: `/api/socket.io/*`
3. IIS proxy reescribe: `http://localhost:3003/socket.io/*`
4. Servidor Fastify responde en puerto 3003

---

## Componentes Principales

### Cliente (`./client`)
- **Framework**: Next.js 15.5.6 (Exportacion Estatica)
- **Socket.io**: URL relativa `/api/socket.io/`
- **Construccion**: `npm run build` → genera carpeta `out/`
- **Configuracion**: `web.config` contiene reglas proxy

### Servidor (`./server`)
- **Framework**: Fastify 4.23.2 + Socket.io 4.7.2
- **Puerto**: 3003 (dinamico si esta ocupado)
- **Base de datos**: JSON en `data/loteria.json`
- **Inicio**: `npm start`

---

## Despliegue Automatizado

```powershell
# 1. Navegar a raiz
cd C:\inetpub\wwwroot\loteria

# 2. Ejecutar deploy (detiene IIS → compila → reinicia IIS)
.\deploy.ps1
```

**Que hace el script:**
- Para IIS (libera archivos)
- Mata procesos Node.js
- Limpia directorios .next, out, dist
- Compila cliente (`npm run build`)
- Inicia IIS
- Muestra proximos pasos

---

## Despliegue Manual

```powershell
# Terminal 1: Cliente
cd C:\inetpub\wwwroot\loteria

# 1. Detener IIS
iisreset /stop

# 2. Esperar 3 segundos
Start-Sleep 3

# 3. Limpiar
cd client
rmdir /s /q .next out dist -Force -ErrorAction SilentlyContinue

# 4. Compilar
npm run build

# 5. Reiniciar IIS
cd ..
iisreset /start

# 6. Esperar a que IIS inicie
Start-Sleep 3
```

```powershell
# Terminal 2: Servidor (NUEVA terminal)
cd C:\inetpub\wwwroot\loteria\server

# 7. Instalar dependencias (primera vez)
npm install

# 8. Iniciar servidor
npm start

# Deberia mostrar:
# [gameSocket] Socket.io listening on port 3003
# [gameSocket] CORS configured for...
```

---

## Verificacion

```powershell
# Ejecutar verification script
cd C:\inetpub\wwwroot\loteria
.\verify.ps1
```

**Checklist manual:**
- [ ] Carpeta `client/out/index.html` existe
- [ ] Carpeta `server/dist/index.js` existe
- [ ] Puerto 3003 activo: `netstat -ano | findstr :3003`
- [ ] IIS corriendo: `Get-Service W3SVC`
- [ ] Abrir https://loteriainfosegura.uv.mx
- [ ] Abrir DevTools (F12) → Console
- [ ] Buscar "[gameSocket] connected" en logs

---

## ⚠️ Problemas Comunes

### Error: EPERM durante npm build
**Causa**: IIS tiene archivos abiertos en carpeta `out/`

**Solucion:**
```powershell
# SIEMPRE ejecutar antes de compilar:
iisreset /stop
Start-Sleep 3

# Luego compilar
npm run build

# Y despues:
iisreset /start
```

### Socket.io no conecta (error 404 o timeout)
**Verificar:**
1. Servidor corriendo: `netstat -ano | findstr :3003`
2. URL cliente es relativa: `/api/socket.io/` (NO URL absoluta)
3. Reglas proxy en `client/web.config` existen
4. DevTools Console (F12) muestra errores

### Servidor falla al iniciar
**Verificar:**
1. Archivo `server/.env` existe
2. Puertos 3002-3009 no ocupados
3. Reinstalar: `cd server && npm install && npm run build`

---

## Archivos Importantes

| Archivo | Proposito |
|---------|-----------|
| `client/web.config` | Proxy IIS + Rewrite rules |
| `client/src/lib/gameSocket.ts` | Socket.io client (URL: `/api/socket.io/`) |
| `server/src/index.ts` | Servidor Fastify + Socket.io |
| `server/src/config/database.ts` | Persistencia JSON |
| `server/data/loteria.json` | Base de datos (generado) |
| `deploy.ps1` | Script automatizado |
| `verify.ps1` | Verificacion estado |

---

## Urls y Puertos

| Componente | URL/Puerto | Notas |
|-----------|-----------|-------|
| Cliente | https://loteriainfosegura.uv.mx | Via IIS HTTPS |
| Servidor | localhost:3003 | Solo interno |
| Socket.io | /api/socket.io/ | Proxy via IIS |
| API REST | /api/* | Proxy via IIS |

---

## Siguientes Pasos

1. **Desplegar:**
   ```powershell
   cd C:\inetpub\wwwroot\loteria
   .\deploy.ps1
   ```

2. **Iniciar servidor** (nueva terminal):
   ```powershell
   cd C:\inetpub\wwwroot\loteria\server
   npm start
   ```

3. **Probar aplicacion:**
   - Abrir https://loteriainfosegura.uv.mx
   - Abrir DevTools (F12)
   - Ver logs de Socket.io

4. **Verificar estado:**
   ```powershell
   .\verify.ps1
   ```

---

## Variables de Entorno (Server)

Archivo: `server/.env`

```
NODE_ENV=production
PORT=3003
HOST=localhost
CLIENT_URL_PROD=https://loteriainfosegura.uv.mx
CLIENT_URL_DEV=http://localhost:3000
ADMIN_TOKEN=admin123
```

---

## Estructura de Carpetas

```
C:\inetpub\wwwroot\loteria\
├── client/
│   ├── src/              # Codigo Next.js
│   ├── public/           # Assets estaticos
│   ├── out/              # Build output (GENERADO)
│   ├── web.config        # Configuracion IIS proxy
│   └── package.json
├── server/
│   ├── src/              # Codigo Fastify
│   ├── dist/             # Build output (GENERADO)
│   ├── data/
│   │   └── loteria.json  # Base de datos JSON
│   ├── .env              # Variables entorno
│   └── package.json
├── deploy.ps1            # Script despliegue
├── verify.ps1            # Script verificacion
└── README.md             # Documentacion original
```

---

## 💡 Tips Utiles

**Buscar errores del socket.io:**
```powershell
# En terminal servidor, buscar logs
# Deberia mostrar "Socket.io listening on port 3003"
```

**Limpiar todo y empezar de cero:**
```powershell
cd C:\inetpub\wwwroot\loteria
iisreset /stop
Start-Sleep 3
rmdir /s /q client\out client\dist client\.next client\node_modules
rmdir /s /q server\dist server\node_modules
iisreset /start
```

**Ver que esta en puerto 3003:**
```powershell
netstat -ano | findstr :3003
tasklist /FI "PID eq <PID>"  # Reemplazar <PID> con numero
```

**Ver logs del servidor en tiempo real:**
```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start
# Los logs aparecen en la consola
```

---

**Ultima actualizacion:** 2024
**Infraestructura:** Windows IIS 10+ + Node.js 20+ + PowerShell 5.1
