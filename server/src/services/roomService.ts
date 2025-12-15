import { dbGetAsync, dbRunAsync, dbAllAsync } from '../config/database';
import { Room, Player, GameState } from '../types/game';
import {createDeck} from '../services/loteria';
interface DBRoom {
  data: string;
}
const cardIntervals: Map<string, any> = new Map();
const CALL_INTERVAL = 4500; // 4.5 segundos entre cartas
const MAX_PLAYERS = 100; // ajustar según necesidad
const MAX_PLAYERS_PER_ROOM = 25; // Límite de 25 jugadores por sala

export class RoomService {
  // locks por sala para serializar operaciones asíncronas (evitar carreras locales)
  private static roomLocks: Map<string, Promise<void>> = new Map();

  private static enqueue(roomId: string, fn: () => Promise<void>) {
    const prev = this.roomLocks.get(roomId) || Promise.resolve();
    const next = prev.then(() => fn()).catch((e) => {
      console.error(`roomLocks[${roomId}] error:`, e);
    });
    // guardar la promesa encadenada (no await aquí)
    this.roomLocks.set(roomId, next);
    return next;
  }

  static async getRoom(roomId: string): Promise<Room | null> {
    const result = (await dbGetAsync<DBRoom>('SELECT data FROM rooms WHERE id = ?', [roomId])) as DBRoom | undefined;
    return result ? (JSON.parse(result.data) as Room) : null;
  }

  static async createOrUpdateRoom(roomId: string, roomData: Room): Promise<void> {
    await dbRunAsync(
      'INSERT OR REPLACE INTO rooms (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [roomId, JSON.stringify(roomData)]
    );
  }

  // limpia todas las listas de players en la base de datos (mantiene gameState pero vacía host)
  static async clearAllPlayers(): Promise<void> {
    const rows = await dbAllAsync<{ id: string; data: string }>('SELECT id, data FROM rooms', []);
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.data) as Room;
        if (parsed) {
          parsed.players = {}; // vaciar players históricos
          if (parsed.gameState) parsed.gameState.host = ''; // limpiar host
          await dbRunAsync('UPDATE rooms SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(parsed), row.id]);
        }
      } catch (e) {
        // ignora filas malformadas
        console.error('clearAllPlayers: error parsing row', row.id, e);
      }
    }
  }

  // 2. Lógica atómica para llamar a la siguiente carta
  static async callNextCard(roomId: string, io: any): Promise<void> {
    await this.enqueue(roomId, async () => {
      const room = await this.getRoom(roomId);
      if (!room) {
        console.warn(`❌ callNextCard: sala ${roomId} no encontrada`);
        return;
      }

      const deck = room.gameState?.deck || [];
      const called = Array.isArray(room.gameState?.calledCardIds) ? [...room.gameState.calledCardIds] : [];

      // ✅ VALIDAR deck
      if (!Array.isArray(deck) || deck.length === 0) {
        console.error(`❌ callNextCard: deck inválido para ${roomId}`, { 
          deckLength: deck?.length, 
          deckType: typeof deck 
        });
        await this.stopCallingCards(roomId);
        return;
      }

      // ✅ VALIDAR called no tiene duplicados
      if (called.length !== new Set(called).size) {
        console.warn(`⚠️ callNextCard: duplicados detectados en called[${roomId}]`, {
          totalCalled: called.length,
          uniqueCalled: new Set(called).size,
        });
        // Limpiar duplicados
        const unique = Array.from(new Set(called));
        room.gameState.calledCardIds = unique;
        await this.createOrUpdateRoom(roomId, room);
      }

      const remaining = deck.filter((id: any) => !called.includes(id));
      
      // ✅ SI NO HAY CARTAS RESTANTES: detener y calcular ranking
      if (remaining.length === 0) {
        console.log(`⏹️ Mazo agotado en sala ${roomId} (${called.length}/${deck.length} cartas). Deteniendo bucle.`);
        
        await this.stopCallingCards(roomId);
        
        // Calcular ranking final
        const ranking = Object.values(room.players || {}).map((p: any) => ({
          name: p.name || "Anónimo",
          seleccionadas: Array.isArray(p.markedIndices) ? p.markedIndices.length : 0,
        })).sort((a, b) => b.seleccionadas - a.seleccionadas);

        // Marcar juego como terminado
        room.gameState.isGameActive = false;
        room.gameState.winner = null;
        room.gameState.finalRanking = ranking;
        room.gameState.timestamp = Date.now();

        await this.createOrUpdateRoom(roomId, room);
        console.log(`📊 Ranking final para ${roomId}:`, ranking);
        
        io.to(roomId).emit("gameUpdated", room.gameState);
        io.to(roomId).emit("roomUpdated", room);
        return;
      }

      // ✅ LLAMAR SIGUIENTE CARTA
      const nextId = remaining[0];
      called.push(nextId);
      console.log(`🎴 Sala ${roomId} -> carta ${nextId} (${called.length}/${deck.length})`);

      room.gameState.calledCardIds = called;
      room.gameState.timestamp = Date.now();
      await this.createOrUpdateRoom(roomId, room);

      io.to(roomId).emit("gameUpdated", room.gameState);
      io.to(roomId).emit("roomUpdated", room);
    });
  }

  // 3. Iniciar el bucle de llamadas automáticas
  static async startCallingCards(roomId: string, io: any): Promise<void> {
    if (cardIntervals.has(roomId)) {
      console.log(`⏱️ Bucle ya existe para ${roomId}`);
      return;
    }

    const room = await this.getRoom(roomId);
    if (!room?.gameState?.deck || !Array.isArray(room.gameState.deck) || room.gameState.deck.length === 0) {
      console.error(`❌ startCallingCards: deck inválido en ${roomId}`);
      return;
    }

    console.log(`🚀 Iniciando bucle para ${roomId} (deck: ${room.gameState.deck.length}, llamadas: ${room.gameState.calledCardIds?.length || 0})`);

    try {
      await this.callNextCard(roomId, io);
    } catch (e) {
      console.error(`❌ Error en primera carta para ${roomId}:`, e);
      return;
    }

    // ✅ Crear intervalo con manejo robusto
    let errorCount = 0;
    const MAX_ERRORS = 5;

    const interval = setInterval(async () => {
      try {
        await this.callNextCard(roomId, io);
        errorCount = 0; // Reset en éxito
      } catch (err) {
        errorCount++;
        console.error(`❌ Error en callNextCard [${errorCount}/${MAX_ERRORS}] para ${roomId}:`, err);
        
        if (errorCount >= MAX_ERRORS) {
          console.error(`❌ Demasiados errores en ${roomId}. Deteniendo bucle.`);
          this.stopCallingCards(roomId);
        }
      }
    }, CALL_INTERVAL);

    cardIntervals.set(roomId, interval);
    console.log(`⏱️ Bucle iniciado para ${roomId} (${CALL_INTERVAL / 1000}s)`);
  }

  // 4. Detener el bucle de llamadas
  static async stopCallingCards(roomId: string): Promise<void> {
    const interval = cardIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      cardIntervals.delete(roomId);
      console.log(`✅ Bucle detenido para ${roomId}`);
    }
  }

  // ✅ NUEVO: Validar y limpiar deck al inicializar
  static async initializeGame(roomId: string, gameMode: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} no encontrada`);
    }

    const newDeck = createDeck().map(c => c.id);
    
    // ✅ Validar deck
    if (!Array.isArray(newDeck) || newDeck.length !== 55) {
      console.error(`❌ Deck inválido para ${roomId}:`, { deckLength: newDeck?.length });
      throw new Error(`Deck debe tener 55 cartas, tiene ${newDeck?.length}`);
    }

    // Limpiar marcas
    Object.keys(room.players).forEach(pName => {
      room.players[pName].markedIndices = [];
    });

    room.gameState = {
      ...room.gameState,
      deck: newDeck,
      calledCardIds: [],
      isGameActive: true,
      winner: null,
      gameMode,
      timestamp: Date.now(),
      finalRanking: null,
    };

    await this.createOrUpdateRoom(roomId, room);
    console.log(`🎮 Juego inicializado para ${roomId} (modo: ${gameMode})`);
    return room;
  }
}