# 🎯 GUIA - Configurar loteria25 en IIS Manager

## Problema
No tienes acceso a la carpeta `out/` desde IIS. Necesitas configurar correctamente la ruta física del sitio web.

---

## ✅ Solucion: Configurar desde IIS Manager

### Paso 1: Abrir IIS Manager
```
Presiona: Windows + R
Escribe: inetmgr
Presiona: Enter
```

### Paso 2: Navegar al Sitio Web
```
En el panel izquierdo:
1. INFOSEGURALOTTO (tu servidor)
   └─ Sites
      └─ loteria25 ← Selecciona esto
```

### Paso 3: Editar Physical Path

**Opcion A: Usando el Panel Central**
```
1. En loteria25 Home, busca un icono de "Physical Path"
   O busca en la columna central un item que diga la ruta actual

2. Haz click en ese item o busca una opcion "Edit Physical Path"
```

**Opcion B: Click Derecho**
```
1. Haz click derecho en "loteria25"
2. Selecciona: "Edit Site..."
3. En la ventana, busca "Physical path:"
4. Cambia a: C:\inetpub\wwwroot\loteria\client\out
5. Click en "..." para seleccionar carpeta si prefieres
6. Click OK
```

**Opcion C: Desde Properties**
```
1. Haz click derecho en "loteria25"
2. Selecciona: "Properties" o "Manage Website" > "Edit Binding"
3. Busca la pestaña o seccion "Physical Path"
4. Cambia a: C:\inetpub\wwwroot\loteria\client\out
```

### Paso 4: Configurar Default Documents
```
1. Selecciona "loteria25" en el lado izquierdo
2. En el panel central, busca: "Default Document"
3. Haz doble click en "Default Document"
4. Verifica que "index.html" esté en la lista
5. Si no está, haz click en "Add..." y escribe "index.html"
6. Si está, asegúrate que sea el PRIMERO en la lista
7. Cierra la ventana
```

### Paso 5: Verificar web.config
```
1. Selecciona "loteria25"
2. En panel central, busca: "Configuration Editor"
3. En el dropdown de arriba, selecciona: "system.webServer"
4. Verifica que existan las rewrite rules para:
   - /api/socket.io/* → localhost:3003
   - /api/* → localhost:3003
   - SPA routing (non-file requests → index.html)
```

### Paso 6: Dar Permisos a IIS
```
1. Haz click derecho en la carpeta C:\inetpub\wwwroot\loteria\client\out
2. Selecciona: "Properties"
3. Pestaña: "Security"
4. Click: "Edit"
5. Selecciona: "IIS_IUSRS"
6. Click: "Full Control" (check en todas las columnas)
7. Selecciona: "IUSR"
8. Click: "Read & Execute", "List Folder Contents", "Read"
9. Click OK en ambas ventanas
```

### Paso 7: Reiniciar IIS
```
PowerShell (como Administrator):
iisreset /start
```

---

## 🔍 Verificar que Funciona

### En IIS Manager
```
1. Selecciona "loteria25"
2. Busca "Browse" en el lado derecho
3. Click en "Browse *.443 (https)"
   O "Browse *.80 (http)" segun tu configuracion
```

### En el Navegador
```
Accede a: https://loteriainfosegura.uv.mx

Si ves:
✓ La pagina de Loteria carga
✓ No hay errores 404

Entonces: ¡FUNCIONA!
```

---

## 🚨 Si Sigue Sin Funcionar

### Verificar Ruta Actual
```
PowerShell:
Get-WebFilePath "IIS:\Sites\loteria25"
```

Deberia mostrar: `C:\inetpub\wwwroot\loteria\client\out`

### Verificar Permisos
```
PowerShell:
icacls "C:\inetpub\wwwroot\loteria\client\out"
```

Deberia mostrar: `IIS_IUSRS:(OI)(CI)(F)` o similar con permisos

### Verificar que el Directorio Existe
```
PowerShell:
Test-Path "C:\inetpub\wwwroot\loteria\client\out\index.html"
```

Si muestra `True`: El archivo existe
Si muestra `False`: Necesitas compilar con `npm run build`

---

## 📋 Checklist

- [ ] Physical Path = `C:\inetpub\wwwroot\loteria\client\out`
- [ ] Default Document = `index.html` (primero en la lista)
- [ ] Permisos IIS_IUSRS = Full Control
- [ ] Archivo `index.html` existe en la carpeta
- [ ] IIS reiniciado
- [ ] URL funciona en navegador

---

## 🎯 Flujo Rapido en IIS Manager

```
IIS Manager (abierto)
        ↓
loteria25 (lado izquierdo, seleccionar)
        ↓
Click derecho → Edit Site...
        ↓
Physical path: C:\inetpub\wwwroot\loteria\client\out
        ↓
Click OK
        ↓
Default Document (en panel central, doble click)
        ↓
Verifica que index.html sea PRIMERO
        ↓
Cierra ventana
        ↓
En PowerShell: iisreset /start
        ↓
En navegador: https://loteriainfosegura.uv.mx
        ↓
✓ ¡Funciona!
```

---

## 📞 Notas Importantes

**Physical Path**: Es la carpeta donde IIS obtiene los archivos para servir
- Si es incorrecta: Obtienes 404
- Si no tienes permisos: Obtienes 403 (Access Denied)

**web.config**: Debe estar en la carpeta raíz (donde está index.html)
- Es quien redirige /api/* al servidor Node.js
- Es quien hace el SPA routing

**Permisos**: IIS_IUSRS necesita poder LEER la carpeta
- Si no los tiene, verás "Access Denied" o 403
- En Properties > Security > Edit, selecciona IIS_IUSRS y da permisos

---

**Si esto no funciona, vuelve a ejecutar:**
```powershell
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1
```

El script se encargará de:
1. Detener IIS
2. Limpiar compilaciones antiguas
3. Compilar cliente fresco
4. Reiniciar IIS
5. Dar permisos correctos
