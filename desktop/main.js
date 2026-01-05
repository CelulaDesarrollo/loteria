const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');

const DEV_BUILD_DIR = path.join(__dirname, '../client/out');
const PORT = 3000;
let server;
let mainWindow;

function getBuildDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'client', 'out')
    : DEV_BUILD_DIR;
}

function getIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'client', 'public', 'icono-CDC.png')
    : path.join(__dirname, '../client/public/icono-CDC.png');
}

function startLocalServer(buildDir) {
  return new Promise((resolve, reject) => {
    const expressApp = express();
    expressApp.use(express.static(buildDir));
    expressApp.get('*', (req, res) => {
      const indexPath = path.join(buildDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sirviendo index.html:', err);
          res.status(404).send('Error cargando la aplicación');
        }
      });
    });

    server = http.createServer(expressApp);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Servidor local ejecutándose en http://localhost:${PORT}`);
      resolve();
    });
    server.on('error', (err) => {
      console.error('Error del servidor:', err);
      reject(err);
    });
  });
}

async function createWindow() {
  const buildDir = getBuildDir();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  try {
    if (app.isPackaged) {
      const indexFile = path.join(buildDir, 'index.html');
      if (!fs.existsSync(indexFile)) {
        const msg = `No se encontró ${indexFile}. Asegúrate de incluir client/out en los archivos de build.`;
        console.error(msg);
        dialog.showErrorBox('Error cargando la aplicación', msg);
        app.quit();
        return;
      }
      await mainWindow.loadFile(indexFile);
      console.log('Aplicación cargada desde archivos empaquetados');
    } else {
      await startLocalServer(buildDir);
      await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
      console.log('Aplicación cargada en modo desarrollo');
    }
  } catch (err) {
    console.error('Error cargando la aplicación:', err);
    dialog.showErrorBox('Error cargando la aplicación', String(err));
  }

  Menu.setApplicationMenu(null);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (err) {
    console.error('Error al iniciar:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      server.close(() => console.log('Servidor cerrado'));
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (server) server.close(() => console.log('Servidor cerrado al salir'));
});