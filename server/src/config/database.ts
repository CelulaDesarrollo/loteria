import { join } from 'path';
import { promises as fs } from 'fs';

// Almacenamiento en memoria con persistencia en JSON
// (Alternativa a SQLite para evitar problemas de compilación en Windows)

const dbPath = join(__dirname, '../../data/loteria.json');
const memoryStore: { rooms: Record<string, { data: string; updated_at: string }> } = {
  rooms: {}
};

// Cargar datos al iniciar
export async function initializeDatabase() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const loaded = JSON.parse(data);
    Object.assign(memoryStore, loaded);
    console.log('[database] Datos cargados desde', dbPath);
  } catch (e) {
    console.log('[database] Inicializando almacenamiento nuevo');
    // Crear archivo si no existe
    await saveToDisk();
  }
}

// Persistir datos en disco
async function saveToDisk() {
  try {
    await fs.writeFile(dbPath, JSON.stringify(memoryStore, null, 2));
  } catch (e) {
    console.warn('[database] Error al guardar en disco:', e);
  }
}

// Simular operaciones SQL con almacenamiento en memoria
export const dbRunAsync = async (sql: string, params: any[] = []): Promise<void> => {
  // INSERT o UPDATE
  if (sql.toUpperCase().includes('INSERT') || sql.toUpperCase().includes('UPDATE')) {
    // Para esta implementación simple, no procesamos SQL real
    // El RoomService maneja la lógica de negocio directamente
    await saveToDisk();
  }
};

export const dbGetAsync = async <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  // SELECT single row - para rooms, retorna el registro si existe
  if (sql.toUpperCase().includes('SELECT') && params && params.length > 0) {
    const roomId = params[0];
    const record = memoryStore.rooms[roomId];
    if (record) {
      return JSON.parse(record.data) as T;
    }
  }
  return undefined;
};

export const dbAllAsync = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  // SELECT all rows
  if (sql.toUpperCase().includes('SELECT')) {
    return Object.values(memoryStore.rooms).map((r) => JSON.parse(r.data)) as T[];
  }
  return [];
};

// Funciones adicionales para gestionar rooms en memoria
export const setRoom = async (id: string, data: any): Promise<void> => {
  memoryStore.rooms[id] = {
    data: JSON.stringify(data),
    updated_at: new Date().toISOString()
  };
  await saveToDisk();
};

export const getRoom = async (id: string): Promise<any | null> => {
  const record = memoryStore.rooms[id];
  if (record) {
    return JSON.parse(record.data);
  }
  return null;
};

export const deleteRoom = async (id: string): Promise<void> => {
  delete memoryStore.rooms[id];
  await saveToDisk();
};

export const getAllRooms = async (): Promise<any[]> => {
  return Object.values(memoryStore.rooms).map((r) => JSON.parse(r.data));
};

export const db = {
  serialize: (cb: () => void) => {
    // No-op para compatibilidad
    cb();
  },
  run: () => {
    // No-op para compatibilidad
  }
};