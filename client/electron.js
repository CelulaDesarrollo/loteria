const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

// Directorio donde Next.js genera los archivos estáticos (por el comando 'npm run build' modificado)
const BUILD_DIR = path.join(__dirname, 'out');

/**
 * Crea la ventana principal de la aplicación.
 */
function createWindow() {
    // 1. Configuración de la Ventana
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false, // Por seguridad
            contextIsolation: true, // Por seguridad
            // Si necesitas usar APIs de Node.js en el renderizador, usa 'preload.js'
            // preload: path.join(__dirname, 'preload.js') 
        },
        title: "Lotería InfoSegura - UV"
    });

    // 2. Cargar el contenido estático de Next.js
    // Cargamos index.html dentro de la carpeta 'out'
    mainWindow.loadURL(url.format({
        pathname: path.join(BUILD_DIR, 'index.html'),
        protocol: 'file:', // Protocolo necesario para cargar archivos locales
        slashes: true
    }));

    // Opcional: Abrir las Developer Tools (útil para debug)
    // mainWindow.webContents.openDevTools();

    // 3. Remover el menú por defecto
    Menu.setApplicationMenu(null);
}

// 4. Ciclo de vida de la aplicación
app.whenReady().then(createWindow);

// 5. Salir cuando todas las ventanas estén cerradas, excepto en macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});