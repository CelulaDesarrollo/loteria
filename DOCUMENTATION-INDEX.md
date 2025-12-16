# 📚 INDICE DE DOCUMENTACION

## Archivos de Documentacion Disponibles

### 🚀 Para Empezar Rapidamente
- **QUICK-GUIDE.md** ← **LEER PRIMERO**
  - Pasos basicos (3 pasos para desplegar)
  - Arquitectura simplificada
  - Troubleshooting rapido

### 📖 Guias Detalladas
- **SETUP-LOCAL-SERVER.md**
  - Configuracion inicial completa
  - Paso a paso del ambiente
  - Variables de entorno

- **DEPLOY-GUIDE.md**
  - Instrucciones manuales de despliegue
  - Explicacion de cada paso
  - Verificaciones intermedias

### 🔧 Resolucion de Problemas
- **TROUBLESHOOTING.md**
  - 7 errores comunes y soluciones
  - Diagnostico paso a paso
  - Scripts de ayuda

### 📋 Checklists
- **IMPLEMENTATION-CHECKLIST.md**
  - Verificacion de configuracion completa
  - Lista de cambios realizados
  - Items de validacion

- **MIGRATION-COMPLETE.md**
  - Resumen de la migracion
  - Lo que cambio
  - Lo que se mantiene igual

- **IMPLEMENTATION-SUMMARY.md**
  - Cambios tecnico por componente
  - Configuraciones realizadas
  - Nuevas funcionalidades

---

## Scripts PowerShell Disponibles

### 🚀 Scripts Principales

**deploy.ps1** - Despliegue automatizado
```powershell
.\deploy.ps1
# Automáticamente: detiene IIS → compila → reinicia IIS
```

**reset.ps1** - Reset completo del ambiente
```powershell
.\reset.ps1
# Limpia todo, reinstala dependencias (opcional), reinicia IIS
```

**verify.ps1** - Verificacion de estado
```powershell
.\verify.ps1
# Muestra: archivos, procesos, puertos, IIS status
```

### 📊 Scripts del Servidor

**server/setup-server.ps1** - Instalacion del servidor
```powershell
cd server
.\setup-server.ps1
# Instala dependencias y compila servidor
```

**server/start-server.ps1** - Inicia servidor
```powershell
cd server
.\start-server.ps1
# Inicia Socket.io en puerto 3003
```

---

## Flujo Recomendado Segun Situacion

### Caso 1: Primera vez configurando

1. Leer **QUICK-GUIDE.md**
2. Leer **SETUP-LOCAL-SERVER.md**
3. Ejecutar `.\deploy.ps1`
4. En otra terminal: `cd server && npm start`
5. Verificar `.\verify.ps1`

### Caso 2: Desplegar cambios

1. Ejecutar `.\deploy.ps1`
2. Si hay error, leer **TROUBLESHOOTING.md**
3. Si sigue errando, ejecutar `.\reset.ps1`

### Caso 3: Error desconocido

1. Ejecutar `.\verify.ps1`
2. Leer **TROUBLESHOOTING.md** seccion relevante
3. Ejecutar solucion propuesta
4. Ejecutar `.\verify.ps1` nuevamente

### Caso 4: Limpiar todo y empezar de cero

1. Ejecutar `.\reset.ps1`
2. Responder "s" para limpiar node_modules
3. Ejecutar `.\deploy.ps1`
4. En otra terminal: `cd server && npm start`

---

## Estructura de Archivos de Documentacion

```
C:\inetpub\wwwroot\loteria\
├── 📄 README.md                      (Documentacion original del proyecto)
├── 📚 QUICK-GUIDE.md                 ← LEER PRIMERO
├── 📚 SETUP-LOCAL-SERVER.md          (Setup detallado)
├── 📚 DEPLOY-GUIDE.md                (Pasos manuales)
├── 📚 TROUBLESHOOTING.md             (Errores y soluciones)
├── ✅ IMPLEMENTATION-CHECKLIST.md    (Verificacion)
├── ✅ MIGRATION-COMPLETE.md          (Resumen migracion)
├── ✅ IMPLEMENTATION-SUMMARY.md      (Cambios tecnicos)
├── 📖 DOCUMENTATION-INDEX.md         (Este archivo)
│
├── 🚀 deploy.ps1                     (Script despliegue)
├── 🔄 reset.ps1                      (Script reset completo)
├── ✓ verify.ps1                      (Script verificacion)
│
├── client/
│   ├── src/
│   ├── public/
│   ├── web.config                    (Proxy IIS configuration)
│   └── package.json
│
└── server/
    ├── src/
    ├── data/
    │   └── loteria.json              (Base de datos)
    ├── .env                          (Variables entorno)
    ├── setup-server.ps1              (Setup script)
    ├── start-server.ps1              (Start script)
    └── package.json
```

---

## Comandos Rapidos

### Compilar Cliente
```powershell
cd C:\inetpub\wwwroot\loteria

# IMPORTANTE: Detener IIS primero
iisreset /stop
Start-Sleep 3

# Compilar
cd client
npm run build

# Reiniciar IIS
cd ..
iisreset /start
```

### Iniciar Servidor
```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start

# Deberia mostrar:
# [gameSocket] Socket.io listening on port 3003
```

### Verificar Puerto 3003
```powershell
netstat -ano | findstr :3003
# Si muestra LISTENING, servidor esta activo
```

### Acceder a Aplicacion
```
https://loteriainfosegura.uv.mx
```

### Verificar Socket.io Conectado
```
1. Abrir https://loteriainfosegura.uv.mx
2. Presionar F12 (DevTools)
3. Tab: Console
4. Buscar: "[gameSocket] connected"
```

---

## Archivos de Configuracion Importantes

### client/web.config
- Contiene reglas proxy de IIS
- Redirige `/api/*` a `localhost:3003`
- Configuracion de SPA routing

### client/src/lib/gameSocket.ts
- Socket.io client configuration
- URL: `/api/socket.io/` (relativa)

### server/src/index.ts
- Servidor Fastify principal
- Escucha en puerto 3003
- Configura Socket.io

### server/src/config/database.ts
- Persistencia de datos
- Almacenamiento JSON
- Caché en memoria

### server/.env
- Variables de entorno
- Puerto, HOST, URLs
- Admin token

---

## Cambios en la Migracion

### ✅ Completado
- [x] Cliente migrado a URL relativa (`/api/socket.io/`)
- [x] web.config configurado con proxy rules
- [x] Servidor Node.js operativo en puerto 3003
- [x] Base de datos migrada de SQLite a JSON
- [x] Scripts de despliegue automatizado
- [x] Documentacion completa

### Necesita Atencion
- [ ] Iniciar servidor manualmente en terminal separada
- [ ] Acceder a https://loteriainfosegura.uv.mx
- [ ] Verificar Socket.io conecta en DevTools

---

## FAQ - Preguntas Frecuentes

**P: ¿Por que tengo que detener IIS antes de compilar?**
R: IIS tiene archivos abiertos que impiden que npm escriba en la carpeta `out/`. Detener IIS libera esos archivos.

**P: ¿Puedo compilar y desplegar automaticamente?**
R: Si, ejecuta `.\deploy.ps1`. El script detiene IIS, compila, y reinicia IIS automaticamente.

**P: ¿El servidor Node.js se inicia automaticamente?**
R: No, debe hacerlo manualmente en otra terminal con `npm start`. Se puede automatizar con Windows Task Scheduler si lo deseas.

**P: ¿Donde se guardan los datos de las salas?**
R: En `server/data/loteria.json`. Se sincroniza con memoria y se guarda automaticamente.

**P: ¿Como cambio variables como PORT o ADMIN_TOKEN?**
R: Edita `server/.env` y reinicia el servidor.

**P: ¿Puedo usar otro puerto que no sea 3003?**
R: Si, cambia en `server/.env` y en `client/web.config` la regla de proxy.

---

## Proximos Pasos

1. **Leer**: QUICK-GUIDE.md (5 minutos)
2. **Ejecutar**: `.\deploy.ps1` (3 minutos)
3. **Ejecutar**: `cd server && npm start` (en otra terminal)
4. **Acceder**: https://loteriainfosegura.uv.mx
5. **Verificar**: `.\verify.ps1`

---

## Version y Actualizaciones

**Ultima actualizacion**: 2024
**Estado**: Produccion
**Infraestructura**: Windows IIS 10+ / Node.js 20+ / PowerShell 5.1

---

## Notas Importantes

⚠️ **IIS File Locking**: El bloqueo de archivos por IIS es la causa principal de problemas. Siempre detener IIS antes de compilar.

⚠️ **Puerto 3003**: El servidor Node.js DEBE estar corriendo en puerto 3003 en localhost. El proxy de IIS redirige trafico a este puerto.

⚠️ **URL Relativa**: El cliente DEBE usar `/api/socket.io/` (relativa) no una URL absoluta a `localhost:3003`.

⚠️ **Dos Terminales**: Necesitas DOS terminales PowerShell:
- Terminal 1: Para compilar cliente (IIS)
- Terminal 2: Para servidor Node.js

---

**¿Necesitas ayuda? Consulta TROUBLESHOOTING.md**
