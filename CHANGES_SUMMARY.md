# 🔧 Cambios Realizados - Resumen

## 📁 Servidor (`/server`)

### ✅ Cambio 1: Crear directorio `public/`
```
/server/public/  (nuevo directorio)
```
**Razón:** Render reportaba error: `"root" path "/opt/render/project/src/server/public" must exist`

---

### ✅ Cambio 2: Actualizar CORS en `src/index.ts`

**Línea 30-37:** Agregar dominio IIS con HTTPS
```typescript
// ANTES:
const PROD_CLIENT = process.env.CLIENT_URL_PROD || "https://loteria-infosegura-d9v8.vercel.app";
const EXTRA_DEV = [
  "http://localhost:3000",
  // ... sin https://loteriainfosegura.uv.mx
];

// DESPUÉS:
const PROD_CLIENT = process.env.CLIENT_URL_PROD || "https://loteriainfosegura.uv.mx";
const EXTRA_DEV = [
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:9002",
  "http://148.226.24.22",
  "http://loteria-infosegura.uv.mx",
  "http://loteriainfosegura.uv.mx",
  "https://loteria-infosegura.uv.mx",
  "https://loteriainfosegura.uv.mx",  // ← AGREGADO para IIS con HTTPS
];
```

**Razón:** Cliente en IIS necesita CORS apropiado para conectar a Render

---

### ✅ Cambio 3: Agregar ruta raíz `GET /` en `src/index.ts`

**Línea 62-72:** Nuevo handler para la ruta raíz
```typescript
// ✅ RUTA DE HEALTH CHECK / RAÍZ
fastify.route({
  method: 'GET',
  url: '/',
  handler: async (req, reply) => {
    return reply.send({ 
      status: 'ok', 
      message: 'Lotería Server en Render',
      timestamp: new Date().toISOString()
    });
  }
});
```

**Razón:** Render reportaba: `Route GET:/ not found` - Ahora responde 200 OK

---

## 📁 Cliente (`/client`)

### ✅ Cambio 1: Limpiar `src/lib/gameSocket.ts`

**Línea 5:** Simplificar URL a solo Render
```typescript
// ANTES:
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "https://loteria-gfrn.onrender.com";
//const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://148.226.24.22:3001";

// DESPUÉS:
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "https://loteria-gfrn.onrender.com";
```

**Razón:** Eliminar URLs alternas que pueden causar confusión o fallos

---

### ✅ Cambio 2: Mejorar `web.config` para IIS

**Cambios principales:**
1. ✅ **Agregar HTTPS Redirect** (líneas 9-18)
   - Fuerza HTTP → HTTPS en todos los requests
   - Soluciona "conexión no privada"

2. ✅ **Mejorar reglas de URL Rewrite** (líneas 45-67)
   - Agregar regla explícita para `_next/` assets
   - Agregar regla para archivos estáticos (`.js`, `.css`, `.png`, etc.)
   - SPA catch-all para rutas dinámicas

3. ✅ **Headers de seguridad mejorados** (líneas 73-92)
   - Agregar CSP (Content-Security-Policy)
   - Agregar Referrer-Policy
   - Cambiar X-Frame-Options a SAMEORIGIN (más permisivo que DENY)

4. ✅ **Manejo de errores 404** (líneas 99-102)
   - Redirige 404 a index.html para SPA routing

---

### ✅ Cambio 3: Crear `.env.example`

```
NEXT_PUBLIC_SERVER_URL=https://loteria-gfrn.onrender.com
```

**Razón:** Documentar variables de entorno necesarias

---

## 📊 Resumen de Fixes

| Problema | Solución | Archivo |
|----------|----------|---------|
| `public/` path not found | Crear directorio | `/server/public/` |
| `GET /` retorna 404 | Agregar handler raíz | `/server/src/index.ts` |
| CORS error desde IIS | Agregar origin HTTPS | `/server/src/index.ts` |
| "Conexión no privada" | HTTPS redirect en web.config | `/client/web.config` |
| WebSocket falla | Configurar CORS Socket.IO | `/server/src/index.ts` (ya estaba) |
| SPA routing no funciona | Mejorar rewrite rules | `/client/web.config` |

---

## 🚀 Próximos Pasos

1. **Commit y push** a GitHub:
   ```bash
   git add .
   git commit -m "fix: configure for Render deployment with IIS client"
   git push origin main
   ```

2. **Render va a re-desplegar automáticamente** (verifica dashboard)

3. **Construir cliente y deployar en IIS:**
   ```bash
   cd client
   npm run build
   # Copiar contenido de 'out/' a IIS
   # Copiar 'web.config' a raíz del sitio IIS
   ```

4. **Probar:**
   - Acceder a `https://loteriainfosegura.uv.mx`
   - Crear sala
   - Verificar WebSocket en DevTools (Network → WS)

---

## ⚠️ Verificaciones Importantes

```bash
# En /server
npm run build        # Debe compilar sin errores
npm run start        # Debe escuchar en puerto (LOCAL - no lo hagas en producción)

# En /client
npm run build        # Debe generar carpeta 'out/'
ls out/              # Verificar archivos estáticos
```

