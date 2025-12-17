# 🎰 Guía de Despliegue - Lotería Infosegura

## 📋 Arquitectura

```
┌─────────────────────────────────────────────┐
│  Cliente: loteriainfosegura.uv.mx (IIS)     │
│  - Next.js estático (carpeta 'out')         │
│  - Se construye con: npm run build          │
└──────────────────────┬──────────────────────┘
                       │
                       │ WebSocket + HTTP
                       │ https://
                       ▼
┌─────────────────────────────────────────────┐
│  Servidor: loteria-gfrn.onrender.com        │
│  (Render - Node.js + Fastify + Socket.IO)   │
└─────────────────────────────────────────────┘
```

---

## 🚀 Pasos de Despliegue

### PASO 1: Construir Cliente (Next.js Estático)

En la carpeta `client/`:

```bash
cd client
npm install
npm run build
```

✅ Esto genera la carpeta `out/` con archivos estáticos HTML, CSS, JS.

### PASO 2: Desplegar Cliente en IIS

1. **Copiar carpeta `out/` a IIS:**
   ```
   C:\inetpub\wwwroot\loteria-infosegura  <- contenido de 'out/'
   ```

2. **Configurar sitio en IIS:**
   - Nombre del sitio: `loteriainfosegura.uv.mx`
   - Ruta física: `C:\inetpub\wwwroot\loteria-infosegura`
   - Binding: `https://loteriainfosegura.uv.mx:443` (Puerto 443, HTTPS)
   - Pool de aplicaciones: .NET CLR (4.0 Integrated) o superior

3. **Copiar web.config:**
   - El archivo `client/web.config` debe estar en la raíz de `C:\inetpub\wwwroot\loteria-infosegura`
   - Este archivo maneja:
     ✅ Redirect HTTP → HTTPS
     ✅ Compresión Gzip
     ✅ SPA routing (rutas dinámicas → index.html)
     ✅ Headers de seguridad

4. **Certificado SSL:**
   - Asegurar que loteriainfosegura.uv.mx tenga certificado SSL válido
   - IIS puede obtenerlo de Let's Encrypt o use un certificado autofirmado para testing

### PASO 3: Servidor en Render (Ya está desplegado)

El servidor está en: `https://loteria-gfrn.onrender.com`

**Cambios realizados:**
- ✅ Directorio `public/` creado (eliminó error de ruta faltante)
- ✅ Ruta raíz `GET /` agregada (ahora responde 200 OK)
- ✅ CORS configurado para aceptar `https://loteriainfosegura.uv.mx`
- ✅ Socket.IO configurado con CORS apropiado
- ✅ Variables de entorno configuradas en Render

**Para re-desplegar en Render:**
```bash
cd server
npm install
npm run build
# Render detecta cambios automáticamente en main branch
```

---

## 🔧 Variables de Entorno

### Cliente (`client/.env.local`)

```env
# NO NECESITA - El cliente se construye estático y apunta directamente a Render
NEXT_PUBLIC_SERVER_URL=https://loteria-gfrn.onrender.com
```

### Servidor (`server` - en Render Dashboard)

```env
# Render auto-configura PORT=10000 (o según su configuración)
PORT=10000
NODE_ENV=production
ADMIN_TOKEN=admin_token_loteria  # Cambiar en producción
CLIENT_URL_PROD=https://loteriainfosegura.uv.mx
CLIENT_URL_DEV=http://localhost:9002
```

---

## ✅ Checklist de Verificación

### Cliente
- [ ] `npm run build` genera carpeta `out/`
- [ ] Archivos estáticos están en IIS (`.html`, `_next/`, `public/`)
- [ ] `web.config` está en la raíz del sitio IIS
- [ ] Sitio accesible en `https://loteriainfosegura.uv.mx`
- [ ] HTTPS funciona (no hay advertencia de conexión no privada)
- [ ] SPA routing funciona (ej: `/room/main_loteria` carga correctamente)

### Servidor
- [ ] Render muestra status "Deploy live" ✅
- [ ] `GET https://loteria-gfrn.onrender.com/` retorna JSON
- [ ] WebSocket en `wss://loteria-gfrn.onrender.com/socket.io/` funciona
- [ ] Logs en Render no muestran error de `public` path

### Conectividad
- [ ] Cliente conecta correctamente a WebSocket de Render
- [ ] CORS permite peticiones desde `loteriainfosegura.uv.mx`
- [ ] Juego puede crear salas y jugadores pueden unirse
- [ ] Socket.IO heartbeat (ping/pong) funciona sin desconexiones

---

## 🐛 Troubleshooting

### Error: "WebSocket connection failed"
**Causa:** Cliente no conecta a servidor
**Solución:**
1. Verificar que `gameSocket.ts` tiene URL: `https://loteria-gfrn.onrender.com`
2. En navegador, abrir DevTools → Network → WS y verificar URL
3. Permitir puerto WebSocket en firewall IIS

### Error: "Route not found 404"
**Causa:** Servidor no tiene rutas configuradas
**Solución:** Verificar que `server/src/index.ts` tiene `GET /` handler

### Error: "CORS origin not allowed"
**Causa:** CORS no acepta origen del cliente
**Solución:** Agregar origin en `server/src/index.ts`:
```typescript
const allowedOrigins = new Set<string>([
  "https://loteriainfosegura.uv.mx",  // ← Agregar aquí
  // ... otros orígenes
]);
```

### Error: "Connection not private" (HTTPS)
**Causa:** Certificado SSL inválido o faltante
**Solución:**
1. En IIS, validar certificado en el binding
2. Usar `certbot` para Let's Encrypt
3. Esperar propagación DNS

---

## 📝 Notas Importantes

1. **No desplegar en localhost:** El servidor SOLO debe estar en Render
2. **No usar puertos raros:** Render se configura automáticamente en puerto 10000
3. **IIS solo para cliente:** IIS SOLO sirve archivos estáticos HTML/CSS/JS
4. **Certificados HTTPS obligatorios:** Ambos dominios deben usar HTTPS
5. **CORS siempre activo:** Socket.IO requiere CORS para WSS (WebSocket Secure)

---

## 📞 Contacto y Soporte

Si hay problemas:
1. Revisar logs de Render: https://dashboard.render.com
2. Revisar Event Viewer de IIS (Windows)
3. DevTools del navegador → Console y Network tabs

