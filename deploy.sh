#!/bin/bash
# 🚀 Script de despliegue - Lotería Infosegura
# Ejecutar este script después de hacer cambios

echo "================================"
echo "🎰 DESPLIEGUE LOTERÍA INFOSEGURA"
echo "================================"
echo ""

# PASO 1: Compilar servidor
echo "📦 PASO 1: Compilando servidor (Render)..."
cd server
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error compilando servidor"
    exit 1
fi
echo "✅ Servidor compilado exitosamente"
cd ..
echo ""

# PASO 2: Compilar cliente
echo "📦 PASO 2: Compilando cliente (Next.js Estático)..."
cd client
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error compilando cliente"
    exit 1
fi
echo "✅ Cliente compilado exitosamente"
echo "   Archivos estáticos en: client/out/"
cd ..
echo ""

# PASO 3: Información de despliegue
echo "================================"
echo "✅ COMPILACIÓN EXITOSA"
echo "================================"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo ""
echo "1️⃣  DESPLEGAR CLIENTE EN IIS:"
echo "   • Copiar contenido de 'client/out/' a:"
echo "     C:\\inetpub\\wwwroot\\loteria-infosegura"
echo "   • Copiar 'client/web.config' a:"
echo "     C:\\inetpub\\wwwroot\\loteria-infosegura\\web.config"
echo "   • Acceder a: https://loteriainfosegura.uv.mx"
echo ""
echo "2️⃣  DESPLEGAR SERVIDOR EN RENDER:"
echo "   • Commit y push a main branch:"
echo "     git add ."
echo "     git commit -m 'fix: Render deployment configuration'"
echo "     git push origin main"
echo "   • Render re-desplegará automáticamente"
echo "   • Verificar en: https://loteria-gfrn.onrender.com"
echo ""
echo "3️⃣  VERIFICACIONES:"
echo "   ✓ GET https://loteria-gfrn.onrender.com/ → retorna JSON"
echo "   ✓ WSS wss://loteria-gfrn.onrender.com/socket.io → conecta"
echo "   ✓ Acceder a https://loteriainfosegura.uv.mx (sin errores SSL)"
echo "   ✓ Crear una sala y verificar conexión WebSocket en DevTools"
echo ""
echo "================================"
