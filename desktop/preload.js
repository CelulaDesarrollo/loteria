// Puedes agregar APIs seguras aquí si las necesitas en el futuro
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  appVersion: '1.0.0'
});