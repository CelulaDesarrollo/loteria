"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const database_1 = require("../config/database");
const loteria_1 = require("../services/loteria");
const cardIntervals = new Map();
const CALL_INTERVAL = 4500; // 4.5 segundos entre cartas
const MAX_PLAYERS = 100; // ajustar según necesidad
const MAX_PLAYERS_PER_ROOM = 25; // Límite de 25 jugadores por sala
class RoomService {
    static enqueue(roomId, fn) {
        const prev = this.roomLocks.get(roomId) || Promise.resolve();
        const next = prev.then(() => fn()).catch((e) => {
            console.error(`roomLocks[${roomId}] error:`, e);
        });
        // guardar la promesa encadenada (no await aquí)
        this.roomLocks.set(roomId, next);
        return next;
    }
    static async getRoom(roomId) {
        const result = (await (0, database_1.dbGetAsync)('SELECT data FROM rooms WHERE id = ?', [roomId]));
        return result ? JSON.parse(result.data) : null;
    }
    static async createOrUpdateRoom(roomId, roomData) {
        await (0, database_1.dbRunAsync)('INSERT OR REPLACE INTO rooms (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [roomId, JSON.stringify(roomData)]);
    }
    static async listRooms() {
        const rows = await (0, database_1.dbAllAsync)('SELECT data FROM rooms', []);
        return rows.map(row => {
            try {
                return JSON.parse(row.data);
            }
            catch (e) {
                console.error('listRooms: error parsing room:', e);
                return null;
            }
        }).filter((r) => r !== null);
    }
    static async deleteRoom(roomId) {
        await this.stopCallingCards(roomId);
        await (0, database_1.dbRunAsync)('DELETE FROM rooms WHERE id = ?', [roomId]);
        console.log(`✅ Sala ${roomId} eliminada de la base de datos`);
    }
    static async addPlayer(roomId, playerName, playerData) {
        const room = await this.getRoom(roomId) || {
            players: {},
            gameState: {
                host: '',
                isGameActive: false,
                winner: null,
                gameMode: '',
                deck: [],
                calledCardIds: [],
                timestamp: Date.now(),
                finalRanking: null,
            },
        };
        // Validar límite de jugadores
        const playerCount = Object.keys(room.players || {}).length;
        if (playerCount >= MAX_PLAYERS_PER_ROOM) {
            console.warn(`⚠️ Sala ${roomId} llena (${playerCount}/${MAX_PLAYERS_PER_ROOM})`);
            return { added: false, reason: 'room_full' };
        }
        // Validar nombre único
        if (room.players && room.players[playerName]) {
            console.warn(`⚠️ Nombre ${playerName} ya existe en sala ${roomId}`);
            return { added: false, reason: 'name_exists' };
        }
        // Agregar jugador
        if (!room.players)
            room.players = {};
        room.players[playerName] = {
            name: playerName,
            isOnline: true,
            lastSeen: Date.now(),
            markedIndices: [],
            ...playerData,
        };
        // Si no hay host, asignar al primero
        if (!room.gameState?.host && playerCount === 0) {
            room.gameState = {
                ...room.gameState,
                host: playerName,
            };
        }
        await this.createOrUpdateRoom(roomId, room);
        console.log(`✅ Jugador ${playerName} añadido a sala ${roomId}`);
        return { added: true };
    }
    static async removePlayer(roomId, playerName) {
        const room = await this.getRoom(roomId);
        if (!room || !room.players)
            return;
        delete room.players[playerName];
        console.log(`✅ Jugador ${playerName} removido de sala ${roomId}`);
        // Si no hay más jugadores, eliminar la sala
        if (Object.keys(room.players).length === 0) {
            await this.deleteRoom(roomId);
            console.log(`✅ Sala ${roomId} vacía, eliminada`);
            return;
        }
        // Si el host se fue, reasignar
        if (room.gameState?.host === playerName) {
            const remainingPlayers = Object.keys(room.players);
            room.gameState = {
                ...room.gameState,
                host: remainingPlayers[0] || '',
            };
            console.log(`🔄 Host reasignado a ${room.gameState.host} en sala ${roomId}`);
        }
        await this.createOrUpdateRoom(roomId, room);
    }
    static async markPlayerActive(roomId, playerName) {
        const room = await this.getRoom(roomId);
        if (!room?.players?.[playerName])
            return;
        room.players[playerName].isOnline = true;
        room.players[playerName].lastSeen = Date.now();
        await this.createOrUpdateRoom(roomId, room);
    }
    static async markPlayerOffline(roomId, playerName) {
        const room = await this.getRoom(roomId);
        if (!room?.players?.[playerName])
            return;
        room.players[playerName].isOnline = false;
        room.players[playerName].lastSeen = Date.now();
        await this.createOrUpdateRoom(roomId, room);
    }
    static async cleanupStalePlayers(timeoutMs = 5000) {
        const rows = await (0, database_1.dbAllAsync)('SELECT id, data FROM rooms', []);
        const changes = [];
        const now = Date.now();
        for (const row of rows) {
            try {
                const room = JSON.parse(row.data);
                const roomId = row.id;
                const stalePlayers = Object.entries(room.players || {})
                    .filter(([, player]) => !player.isOnline && (now - (player.lastSeen || 0)) > timeoutMs)
                    .map(([name]) => name);
                if (stalePlayers.length > 0) {
                    console.log(`🧹 Limpiando ${stalePlayers.length} jugadores inactivos de sala ${roomId}`);
                    for (const playerName of stalePlayers) {
                        delete room.players[playerName];
                    }
                    if (Object.keys(room.players).length === 0) {
                        // Sala vacía, eliminar
                        await this.deleteRoom(roomId);
                        changes.push({ roomId, room: null });
                    }
                    else {
                        // Reasignar host si es necesario
                        if (!room.gameState?.host || !room.players[room.gameState.host]) {
                            const remaining = Object.keys(room.players);
                            room.gameState = {
                                ...room.gameState,
                                host: remaining[0] || '',
                            };
                        }
                        await this.createOrUpdateRoom(roomId, room);
                        changes.push({ roomId, room });
                    }
                }
            }
            catch (e) {
                console.error(`cleanupStalePlayers: error procesando sala ${row.id}:`, e);
            }
        }
        return changes;
    }
    // limpia todas las listas de players en la base de datos (mantiene gameState pero vacía host)
    static async clearAllPlayers() {
        const rows = await (0, database_1.dbAllAsync)('SELECT id, data FROM rooms', []);
        for (const row of rows) {
            try {
                const parsed = JSON.parse(row.data);
                if (parsed) {
                    parsed.players = {}; // vaciar players históricos
                    if (parsed.gameState)
                        parsed.gameState.host = ''; // limpiar host
                    await (0, database_1.dbRunAsync)('UPDATE rooms SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(parsed), row.id]);
                }
            }
            catch (e) {
                // ignora filas malformadas
                console.error('clearAllPlayers: error parsing row', row.id, e);
            }
        }
    }
    // 2. Lógica atómica para llamar a la siguiente carta
    static async callNextCard(roomId, io) {
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
            const remaining = deck.filter((id) => !called.includes(id));
            // ✅ SI NO HAY CARTAS RESTANTES: detener y calcular ranking
            if (remaining.length === 0) {
                console.log(`⏹️ Mazo agotado en sala ${roomId} (${called.length}/${deck.length} cartas). Deteniendo bucle.`);
                await this.stopCallingCards(roomId);
                // Calcular ranking final
                const ranking = Object.values(room.players || {}).map((p) => ({
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
    static async startCallingCards(roomId, io) {
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
        }
        catch (e) {
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
            }
            catch (err) {
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
    static async stopCallingCards(roomId) {
        const interval = cardIntervals.get(roomId);
        if (interval) {
            clearInterval(interval);
            cardIntervals.delete(roomId);
            console.log(`✅ Bucle detenido para ${roomId}`);
        }
    }
    // ✅ NUEVO: Validar y limpiar deck al inicializar
    static async initializeGame(roomId, gameMode) {
        const room = await this.getRoom(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} no encontrada`);
        }
        const newDeck = (0, loteria_1.createDeck)().map(c => c.id);
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
exports.RoomService = RoomService;
// locks por sala para serializar operaciones asíncronas (evitar carreras locales)
RoomService.roomLocks = new Map();
