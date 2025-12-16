"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.getAllRooms = exports.deleteRoom = exports.getRoom = exports.setRoom = exports.dbAllAsync = exports.dbGetAsync = exports.dbRunAsync = void 0;
exports.initializeDatabase = initializeDatabase;
const path_1 = require("path");
const fs_1 = require("fs");
// Almacenamiento en memoria con persistencia en JSON
// (Alternativa a SQLite para evitar problemas de compilación en Windows)
const dbPath = (0, path_1.join)(__dirname, '../../data/loteria.json');
const memoryStore = {
    rooms: {}
};
// Cargar datos al iniciar
async function initializeDatabase() {
    try {
        const data = await fs_1.promises.readFile(dbPath, 'utf-8');
        const loaded = JSON.parse(data);
        Object.assign(memoryStore, loaded);
        console.log('[database] Datos cargados desde', dbPath);
    }
    catch (e) {
        console.log('[database] Inicializando almacenamiento nuevo');
        // Crear archivo si no existe
        await saveToDisk();
    }
}
// Persistir datos en disco
async function saveToDisk() {
    try {
        await fs_1.promises.writeFile(dbPath, JSON.stringify(memoryStore, null, 2));
    }
    catch (e) {
        console.warn('[database] Error al guardar en disco:', e);
    }
}
// Simular operaciones SQL con almacenamiento en memoria
const dbRunAsync = async (sql, params = []) => {
    // INSERT o UPDATE
    if (sql.toUpperCase().includes('INSERT') || sql.toUpperCase().includes('UPDATE')) {
        // Para esta implementación simple, no procesamos SQL real
        // El RoomService maneja la lógica de negocio directamente
        await saveToDisk();
    }
};
exports.dbRunAsync = dbRunAsync;
const dbGetAsync = async (sql, params = []) => {
    // SELECT single row - para rooms, retorna el registro si existe
    if (sql.toUpperCase().includes('SELECT') && params && params.length > 0) {
        const roomId = params[0];
        const record = memoryStore.rooms[roomId];
        if (record) {
            return JSON.parse(record.data);
        }
    }
    return undefined;
};
exports.dbGetAsync = dbGetAsync;
const dbAllAsync = async (sql, params = []) => {
    // SELECT all rows
    if (sql.toUpperCase().includes('SELECT')) {
        return Object.values(memoryStore.rooms).map((r) => JSON.parse(r.data));
    }
    return [];
};
exports.dbAllAsync = dbAllAsync;
// Funciones adicionales para gestionar rooms en memoria
const setRoom = async (id, data) => {
    memoryStore.rooms[id] = {
        data: JSON.stringify(data),
        updated_at: new Date().toISOString()
    };
    await saveToDisk();
};
exports.setRoom = setRoom;
const getRoom = async (id) => {
    const record = memoryStore.rooms[id];
    if (record) {
        return JSON.parse(record.data);
    }
    return null;
};
exports.getRoom = getRoom;
const deleteRoom = async (id) => {
    delete memoryStore.rooms[id];
    await saveToDisk();
};
exports.deleteRoom = deleteRoom;
const getAllRooms = async () => {
    return Object.values(memoryStore.rooms).map((r) => JSON.parse(r.data));
};
exports.getAllRooms = getAllRooms;
exports.db = {
    serialize: (cb) => {
        // No-op para compatibilidad
        cb();
    },
    run: () => {
        // No-op para compatibilidad
    }
};
