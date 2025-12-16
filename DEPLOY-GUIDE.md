# RESUMEN - QUE HACER MANUALMENTE

El problema de permisos en IIS mientras compila se resuelve así:

## OPCION 1: Método Limpio (Recomendado)

```powershell
# En terminal de Administrator:

# 1. Detener IIS completamente
iisreset /stop

# 2. Matar procesos que bloquean
Get-Process node, npm, next -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Borrar directorios de compilación (cmd es más efectivo)
cd C:\inetpub\wwwroot\loteria\client
cmd /c "rmdir /s /q .next 2>nul"
cmd /c "rmdir /s /q out 2>nul"
cmd /c "rmdir /s /q dist 2>nul"

# 4. Compilar
npm run build

# 5. Esperar ~120 segundos

# 6. Iniciar IIS
iisreset /start

# 7. Verificar resultado
dir out
```

## OPCION 2: Script Automatizado

```powershell
# En terminal de Administrator:
cd C:\inetpub\wwwroot\loteria
.\deploy.ps1
```

## Lo que está pasando:

- IIS está "enganchado" a los directorios .next y out
- Cuando npm intenta acceder, recibe EPERM (permission denied)
- Necesitas detener IIS ANTES de compilar

## Verificar si build exitoso:

```powershell
cd C:\inetpub\wwwroot\loteria\client
Get-ChildItem out -Recurse -Filter "*.html" | Measure-Object
# Debe mostrar al menos 1 archivo .html
```

## Próximos pasos después de compilar:

1. Accede a: https://loteriainfosegura.uv.mx
2. Abre consola (F12)
3. Busca: "[gameSocket] connected"

Si no aparece, reinicia el servidor Node.js:

```powershell
cd C:\inetpub\wwwroot\loteria\server
npm start
```

## Notas:

- No compiles con IIS activo (siempre iisreset /stop primero)
- El servidor Node.js debe estar en otra terminal
- Sígueme el flujo: STOP IIS → LIMPIAR → BUILD → START IIS → INICIAR NODE
