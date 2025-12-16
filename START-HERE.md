# 🎯 START-HERE.md

## ¡Bienvenido! Empieza Aqui

Esta es tu guia para desplegar y ejecutar la aplicacion **Loteria Seguridad de la Informacion** en local.

---

## ⚡ Opcion 1: Rapido (3 pasos)

Si solo quieres que funcione:

```powershell
# Terminal 1
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1

# Terminal 2
cd C:\inetpub\wwwroot\loteria\server
npm start

# Navegador
https://loteriainfosegura.uv.mx
```

**Tiempo**: ~3 minutos ✅

---

## 📖 Opcion 2: Entender Todo

Si quieres saber como funciona:

1. **Leer** `QUICK-GUIDE.md` (5 min)
   - Arquitectura simplificada
   - Componentes principales
   - Pasos de despliegue

2. **Leer** `SETUP-LOCAL-SERVER.md` (15 min)
   - Setup paso a paso
   - Configuracion detallada
   - Variables de entorno

3. **Hacer** los pasos en QUICK-GUIDE.md
   - Ejecutar deploy.ps1
   - Iniciar servidor
   - Verificar

4. **Leer** `TROUBLESHOOTING.md` para referencia
   - Errores comunes
   - Soluciones rapidas
   - Diagnostico

---

## 🎓 Estructura de Archivos

```
C:\inetpub\wwwroot\loteria\
├── 👉 START-HERE.md              ← TU ESTAS AQUI
├── 📚 QUICK-GUIDE.md             ← LEER SIGUIENTE
├── 📚 TROUBLESHOOTING.md         ← Cuando hay errores
├── 🚀 deploy.ps1                 ← Ejecutar esto
├── 🔄 reset.ps1                  ← Si algo falla
├── ✓ verify.ps1                  ← Verificar estado
├── client/                        ← Frontend
└── server/                        ← Backend
```

---

## 🚀 Despliegue Paso a Paso

### Paso 1: Compilar Cliente
```powershell
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1
```

**Que hace:**
- Para IIS
- Compila cliente (Next.js → carpeta `out/`)
- Reinicia IIS

**Duracion**: ~2-3 minutos

### Paso 2: Iniciar Servidor
```powershell
# EN OTRA TERMINAL (Terminal 2)
cd C:\inetpub\wwwroot\loteria\server
npm start
```

**Que hace:**
- Inicia servidor Fastify en puerto 3003
- Configura Socket.io
- Escucha peticiones

**Duracion**: ~1 segundo

### Paso 3: Acceder a Aplicacion
```
Abrir en navegador: https://loteriainfosegura.uv.mx
```

**Que ves:**
- Pagina principal de Loteria
- Boton para crear/unirse a sala
- Juego funcionando en tiempo real

---

## ✅ Verificar que Funciona

```powershell
cd C:\inetpub\wwwroot\loteria
.\verify.ps1
```

Deberia mostrar:
```
✓ client\out\index.html
✓ server\dist\index.js
✓ Node.js corriendo (PID: 12345)
✓ Puerto 3003 activo
✓ IIS esta corriendo
```

---

## 🔍 Si Algo No Funciona

### Opcion A: Lectura Rapida
Leer seccion relevante en `TROUBLESHOOTING.md`:
- **Error EPERM** → Seccion "Error 1"
- **Socket.io no conecta** → Seccion "Error 2"
- **Servidor no inicia** → Seccion "Error 3"

### Opcion B: Reset Completo
```powershell
cd C:\inetpub\wwwroot\loteria
.\reset.ps1
```

Luego ejecuta deploy.ps1 nuevamente.

---

## 🎯 Arquitectura en 60 Segundos

```
Usuario accede a:
    https://loteriainfosegura.uv.mx
            ↓
        IIS (puerto 443, HTTPS)
        - Sirve cliente (archivos HTML/JS/CSS)
        - Proxy: /api/* → localhost:3003
            ↓
    Node.js Server (puerto 3003, interno)
    - Maneja Socket.io
    - Gestiona salas de juego
    - Persiste datos en loteria.json
```

---

## 💡 Puntos Importantes

### ⚠️ IIS File Locking
El problema mas comun es que IIS tiene archivos abiertos cuando intentas compilar.

**Solucion**: El script `deploy.ps1` maneja esto automaticamente:
1. Detiene IIS
2. Compila
3. Reinicia IIS

### 🔌 Socket.io Proxy
El cliente se conecta a `/api/socket.io/` (URL relativa). IIS lo redirecciona a `localhost:3003`.

### 📊 Base de Datos
Los datos de salas se guardan en `server/data/loteria.json` (archivo JSON simple, sin base de datos compleja).

---

## 📋 Tareas Diarias

### Desplegar cambios
```powershell
.\deploy.ps1
# Luego acceder a aplicacion
```

### Revisar logs del servidor
```powershell
cd server && npm start
# Ver logs en la consola
```

### Verificar estado
```powershell
.\verify.ps1
```

### Reset si algo falla
```powershell
.\reset.ps1
```

---

## 📚 Documentacion Disponible

| Archivo | Para | Tiempo |
|---------|------|--------|
| **QUICK-GUIDE.md** | Comenzar | 5 min |
| **SETUP-LOCAL-SERVER.md** | Entender setup | 15 min |
| **DEPLOY-GUIDE.md** | Pasos manuales | 10 min |
| **TROUBLESHOOTING.md** | Resolver errores | ~10 min |
| **CHEATSHEET.md** | Comandos rapidos | Referencia |
| **DOCUMENTATION-INDEX.md** | Encontrar info | 3 min |
| **DEPLOYMENT-STATUS.md** | Resumen completo | 5 min |

---

## 🎬 Video Mental: Lo que Sucede

```
1. Haces: .\deploy.ps1
   → IIS se detiene (libera archivos)
   → npm compila cliente
   → IIS se reinicia
   → Cliente servido en https://loteriainfosegura.uv.mx

2. Haces: npm start (en otra terminal)
   → Node.js inicia en localhost:3003
   → Socket.io comienza a escuchar

3. Usuario accede a: https://loteriainfosegura.uv.mx
   → Browser carga HTML/JS del cliente
   → Cliente se conecta a /api/socket.io/ (proxy IIS)
   → Socket.io conecta a localhost:3003
   → Juego funciona en tiempo real

4. Datos de salas se guardan automaticamente en:
   → server/data/loteria.json
```

---

## 🆘 SOS: Todo Falla

No entres en panico. Soluciona paso a paso:

```powershell
cd C:\inetpub\wwwroot\loteria

# 1. Detener IIS
iisreset /stop

# 2. Matar procesos
Get-Process node, npm -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Limpiar compilaciones antiguas
cmd /c "rmdir /s /q client\.next client\out 2>nul"
cmd /c "rmdir /s /q server\dist 2>nul"

# 4. Reiniciar IIS
iisreset /start
Start-Sleep 3

# 5. Ejecutar deploy
.\deploy.ps1

# 6. En otra terminal
cd server && npm start
```

Si sigue sin funcionar: Leer `TROUBLESHOOTING.md` seccion "Diagnostico Paso a Paso".

---

## ✅ Checklist Final

Antes de considerar "completo":

- [ ] `.\deploy.ps1` ejecutado sin errores
- [ ] `npm start` inicia servidor sin errores
- [ ] `.\verify.ps1` muestra todo verde
- [ ] https://loteriainfosegura.uv.mx carga pagina
- [ ] DevTools Console muestra "[gameSocket] connected"
- [ ] Puedes crear sala y jugar
- [ ] Datos persisten en loteria.json

---

## 🚀 Siguiente Paso

```powershell
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1
```

Luego abre una segunda terminal:
```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start
```

Luego accede a:
```
https://loteriainfosegura.uv.mx
```

**¡Disfruta!** 🎮

---

## 📞 Necesitas Ayuda?

- **Error especifico** → TROUBLESHOOTING.md
- **Paso a paso** → QUICK-GUIDE.md o SETUP-LOCAL-SERVER.md
- **Comandos rapidos** → CHEATSHEET.md
- **Estado general** → DEPLOYMENT-STATUS.md

---

**Creado**: 2024
**Version**: 1.0
**Status**: ✅ LISTO

¡Comienza con `.\deploy.ps1`!
