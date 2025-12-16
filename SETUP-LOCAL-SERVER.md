# 🎰 Configuración de Lotería - Servidor Local en IIS

## Resumen de Cambios

Se ha migrado la arquitectura de consumir el servicio en Render (nube) a consumir un servicio Node.js local que corre en el mismo servidor IIS, usando un proxy transparente configurado en `web.config`.

```
┌─────────────────────────────────────────┐
│  Cliente (Next.js en IIS)               │
│  https://loteriainfosegura.uv.mx        │
└─────────────────────────────────────────┘
           ↓ /api/socket.io/
┌─────────────────────────────────────────┐
│  URL Rewrite (Proxy en web.config)      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Servidor Node.js (localhost:3001)      │
│  - Socket.io                            │
│  - Room management                      │
│  - Game logic                           │
└─────────────────────────────────────────┘
```

## Pasos de Instalación

### 1. Compilar el servidor Node.js

```powershell
cd C:\inetpub\wwwroot\loteria\server
npm install
npm run build
```

### 2. Iniciar el servidor

**Opción A: Manualmente (para testing)**

```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start
```

**Opción B: Con el script PowerShell**

```powershell
# Ejecutar como Administrator
& "C:\inetpub\wwwroot\loteria\server\start-server.ps1"
```

### 3. Verificar que el servidor está corriendo

```powershell
# Abrir un navegador o ejecutar:
Invoke-WebRequest http://localhost:3001 -Verbose
```

Deberías ver la respuesta del servidor Fastify.

### 4. Verificar configuración de IIS

- Abre IIS Manager
- Ve a la aplicación `loteria-infosegura` (o tu nombre de sitio)
- Verifica que `web.config` tiene las reglas de reescritura para `/api/` y `/api/socket.io/`

### 5. Probar desde el cliente

1. Abre https://loteriainfosegura.uv.mx en el navegador
2. Ingresa un nombre de jugador
3. Abre la consola del navegador (F12)
4. Deberías ver:
   ```
   [gameSocket] connected <socket-id>
   ```

## Cambios Realizados

### 📝 `client/src/lib/gameSocket.ts`
- **Antes**: `const SERVER_URL = "https://loteria-gfrn.onrender.com"`
- **Después**: `const SERVER_URL = "/api/socket.io/"`
- Esto hace que el cliente use una ruta relativa que será reescrita por IIS

### ⚙️ `client/web.config`
Se agregaron dos reglas de reescritura:

1. **Proxy Socket.io**: Reescribe `/api/socket.io/*` → `http://localhost:3001/socket.io/*`
2. **Proxy API General**: Reescribe `/api/*` → `http://localhost:3001/*`
3. **SPA Routing**: Mantiene la reescritura a `index.html` para el routing de Next.js

### 🔧 `server/src/index.ts`
- Se agregaron `localhost` y `127.0.0.1` a los orígenes permitidos (CORS)
- Socket.IO está configurado con CORS para aceptar la ruta de IIS

### 📋 `server/.env`
Archivo de configuración para el servidor:
```
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
CLIENT_URL_PROD=https://loteriainfosegura.uv.mx
CLIENT_URL_DEV=http://localhost:9002
ADMIN_TOKEN=admin_token_loteria
```

## Configuración de Windows como Servicio (Opcional)

Si quieres que el servidor se inicie automáticamente con Windows, puedes usar `NSSM` (Non-Sucking Service Manager):

### Instalación de NSSM
```powershell
# Descargar desde: https://nssm.cc/download
# Extraer y agregar a PATH, o ejecutar desde la carpeta:

cd C:\nssm\win64
.\nssm.exe install LoteriaServer "C:\Program Files\nodejs\node.exe" "C:\inetpub\wwwroot\loteria\server\dist\index.js"
.\nssm.exe start LoteriaServer
```

### Gestionar el servicio
```powershell
# Ver estado
.\nssm.exe status LoteriaServer

# Detener
.\nssm.exe stop LoteriaServer

# Iniciar
.\nssm.exe start LoteriaServer

# Desinstalar
.\nssm.exe remove LoteriaServer confirm
```

## Troubleshooting

### Error 404 al recargar `/room/main_loteria?name=...`

✓ **Solucionado** con la regla "SPA Rewrite To Index" en `web.config`

Si persiste:
1. Verifica que `URL Rewrite Module` está instalado en IIS
2. Recicla el AppPool de IIS
3. Borra caché del navegador (Ctrl+Shift+Delete)

### Socket.io no conecta

1. Abre DevTools (F12) → Consola
2. Verifica que no hay errores CORS:
   ```
   Access to XMLHttpRequest at 'http://localhost:3001/socket.io/...' 
   from origin 'https://loteriainfosegura.uv.mx' has been blocked by CORS policy
   ```

3. Si ves ese error, verifica:
   - El servidor está corriendo en `localhost:3001`
   - La regla de reescritura en `web.config` es correcta
   - Los orígenes en `server/src/index.ts` incluyen `https://loteriainfosegura.uv.mx`

### Nombre de jugador duplicado muestra 404 en lugar del modal

Este es un problema separado en `page.tsx`. Revisar:
- `loteria/client/src/app/room/[id]/page.tsx`
- La lógica de recarga de página no debería causar error 404 en IIS

Verifica:
1. La regla SPA está correctamente configurada
2. El routing de Next.js maneja la ruta correctamente
3. Considera agregar un middleware para interceptar recargas

## URLs de Referencia

- **Cliente en Producción**: https://loteriainfosegura.uv.mx
- **Servidor Local**: http://localhost:3001 (solo accesible internamente)
- **Socket.io via Proxy**: https://loteriainfosegura.uv.mx/api/socket.io/
- **Admin Panel**: https://loteriainfosegura.uv.mx/admin (si existe)

## Monitoreo

### Ver logs del servidor
```powershell
Get-Content C:\inetpub\wwwroot\loteria\server\server.log -Tail 50 -Wait
```

### Ver errores
```powershell
Get-Content C:\inetpub\wwwroot\loteria\server\server.error.log -Tail 50
```

### Verificar conexiones activas
```powershell
netstat -ano | findstr :3001
```

## Preguntas Frecuentes

**P: ¿Por qué no usar directamente la URL del servidor?**
R: Por seguridad. Al proxear a través de IIS obtienes:
- Certificado HTTPS de IIS (no necesitas certificado aparte en Node.js)
- Control de acceso centralizado
- Rate limiting y WAF desde IIS

**P: ¿Qué pasa si el servidor Node.js cae?**
R: El cliente no podrá unirse a salas. Implementa:
- Health checks periódicos
- Reinicio automático del servicio
- Dashboard de monitoreo

**P: ¿Puedo escalar esto a múltiples servidores?**
R: Sí, usando Redis para sincronización de sesiones y Socket.io, pero está fuera del scope actual.

---

**Fecha de configuración**: 2025-12-16
**Versión**: 1.0
**Mantenedor**: CelulaDesarrollo
