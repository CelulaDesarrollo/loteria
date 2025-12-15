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

  // lógica para manejar el intervalo de llamada de cartas por sala
  static async initializeGame(roomId: string, gameMode: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found during initialization.`);
    }

    // El mazo completo barajado (guardamos solo los IDs para que sea ligero)
    const newDeck = createDeck().map(c => c.id);

    // Limpiar marcas de jugadores
    Object.keys(room.players).forEach(pName => {
      room.players[pName].markedIndices = [];
    });

    // Asegurarse de que el estado sea un GameState completo
    const newGameState: GameState = {
      ...room.gameState,
      deck: newDeck,
      calledCardIds: [], // Empieza vacío
      isGameActive: true,
      winner: null,
      gameMode: gameMode,
      timestamp: Date.now(),
      finalRanking: null,
    };

    room.gameState = newGameState;

    await this.createOrUpdateRoom(roomId, room);
    return room;
  }
  // 2. Lógica atómica para llamar a la siguiente carta
  static async callNextCard(roomId: string, io: any): Promise<void> {
    // Serializar por sala para evitar condiciones de carrera locales
    await this.enqueue(roomId, async () => {
      const room = await this.getRoom(roomId);
      if (!room) {
        console.warn(`❌ callNextCard: sala ${roomId} no encontrada`);
        return;
      }

      const deck = room.gameState?.deck || [];
      const called = Array.isArray(room.gameState?.calledCardIds) ? [...room.gameState.calledCardIds] : [];

      // ✅ VALIDAR que el deck no está corrupto
      if (!Array.isArray(deck) || deck.length === 0) {
        console.error(`❌ callNextCard: deck inválido para ${roomId}`, { deckLength: deck?.length, deckType: typeof deck });
        this.stopCallingCards(roomId);
        return;
      }

      const remaining = deck.filter((id: any) => !called.includes(id));
      
      // ✅ SI NO HAY CARTAS RESTANTES: detener intervalo automáticamente
      if (remaining.length === 0) {
        console.log(`⏹️ Mazo agotado en sala ${roomId} (${called.length}/${deck.length} cartas llamadas). Deteniendo bucle.`);
        
        // Detener el intervalo automáticamente
        this.stopCallingCards(roomId);
        
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
        console.log(`📊 Ranking final calculado para ${roomId}:`, ranking);
        
        // Notificar a todos los clientes
        io.to(roomId).emit("gameUpdated", room.gameState);
        io.to(roomId).emit("roomUpdated", room);
        return; // ✅ Salir aquí
      }

      // ✅ LLAMAR SIGUIENTE CARTA
      const nextId = remaining[0];
      called.push(nextId);
      console.log(`🎴 Sala ${roomId} -> llamada carta id=${nextId} (${called.length}/${deck.length})`);

      room.gameState.calledCardIds = called;
      room.gameState.timestamp = Date.now();
      await this.createOrUpdateRoom(roomId, room);

      io.to(roomId).emit("gameUpdated", room.gameState);
      io.to(roomId).emit("roomUpdated", room);
    });
  }

  // 3. Iniciar el bucle de llamadas automáticas
  static async startCallingCards(roomId: string, io: any): Promise<void> {
    // ✅ Si ya hay un intervalo corriendo, no crear otro
    if (cardIntervals.has(roomId)) {
      console.log(`⏱️ Ya existe un bucle para ${roomId}, omitiendo nuevo inicio.`);
      return;
    }

    // ✅ VALIDAR que hay deck y cartas pendientes antes de iniciar
    const room = await this.getRoom(roomId);
    if (!room || !room.gameState || !Array.isArray(room.gameState.deck) || room.gameState.deck.length === 0) {
      console.error(`❌ startCallingCards: no se puede iniciar bucle sin deck válido en ${roomId}`, {
        roomExists: !!room,
        gameStateExists: !!room?.gameState,
        deckIsArray: Array.isArray(room?.gameState?.deck),
        deckLength: room?.gameState?.deck?.length,
      });
      return;
    }

    console.log(`🚀 Iniciando bucle de cartas para ${roomId}`, {
      deckSize: room.gameState.deck.length,
      calledSoFar: room.gameState.calledCardIds?.length || 0,
    });

    // Llamar una carta inmediatamente y luego programar el intervalo
    try {
      await this.callNextCard(roomId, io);
    } catch (e) {
      console.error(`❌ Error al llamar la carta inicial para ${roomId}:`, e);
      return; // No iniciar intervalo si falla la primera carta
    }

    // ✅ CREAR INTERVALO CON CLEANUP AUTOMÁTICO
    const interval = setInterval(() => {
      this.callNextCard(roomId, io).catch((err) => {
        console.error(`❌ Error en callNextCard para ${roomId}:`, err);
        // En caso de error crítico, detener el bucle
        this.stopCallingCards(roomId);
      });
    }, CALL_INTERVAL);

    cardIntervals.set(roomId, interval);
    console.log(`⏱️ Bucle de llamadas iniciado para sala ${roomId} (intervalo: ${CALL_INTERVAL / 1000}s)`);
  }

  // 4. Detener el bucle de llamadas
  static async stopCallingCards(roomId: string): Promise<void> {
    const interval = cardIntervals.get(roomId);
    if