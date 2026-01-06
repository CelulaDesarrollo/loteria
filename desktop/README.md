cd client
npm install
npm run build

cd ..
cd ./desktop/
node scripts/copyClientOut.js   # copia manual (el script build lo hace también)
npm run package                 # crea el instalador con electron-builder

# Aparece el .exe llamado "Lotería InfoSegura 1.0.0"