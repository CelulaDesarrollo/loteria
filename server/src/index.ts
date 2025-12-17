import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySocketIO from "fastify-socket.io";
import { Server } from "socket.io";
import { RoomService } from "./services/roomService";
import { Player } from "./types/game";
import { checkWin } from "./services/loteria"; 
import fastifyStatic from "@fastify/static";
import { initializeDatabase } from "./config/database";
import path from "path";
import { ServerResponse } from "http";

// Helper: calcular ranking final basado en markedIndices actuales
const calculateFinalRanking = (players: Record<string, Player>) => {
  return Object.values(players || {})
    .map((p: any) => ({
      name: p.name || "Anónimo",
      seleccionadas: Array.isArray(p.markedIndices) ? p.markedIndices.length : 0,
    }))
    .sort((a, b) => b.seleccionadas - a.seleccionadas);
};

async function startServer() {
  // Inicializar base de datos (carga datos del archivo JSON si existen)
  await initializeDatabase();
  
  const fastify = Fastify({ logger: true });

  // Token de admin
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin_token_loteria"; // cambia en prod

  // Construir orígenes permitidos según entorno (agrega aquí tus URLs de cliente)
  // CORS - Solo Render y loteriainfosegura.uv.mx en producción
  const PROD_CLIENT = "https://loteriainfosegura.uv.mx";
  const RENDER_API = "https://loteria-gfrn.onrender.com";

  const allowedOrigins = [PROD_CLIENT, RENDER_API];
  const isDev = process.env.NODE_ENV === "development";

  // Función de validador de origen SIMPLIFICADA
  const originValidator = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    
    if (isDev) {
      console.warn("[CORS] Permitiendo origen en desarrollo:", origin);
      return cb(null, true);
    }
    
    console.warn("[CORS] Origen rechazado:", origin);
    cb(new Error("Not allowed by CORS"), false);
  };

  console.log("✅ CORS allowed origins:", allowedOrigins);

  // 1️⃣ CORS para endpoints normales (Fastify)
  await fastify.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // 2️⃣ Socket.IO con CORS explícito y transports adicionales
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: allowedOrigins,  // Array de strings es más simple
      methods: ["GET", "POST"],
      credentials: true,
      allowEIO3: true,  // Permitir Engine.IO v3 (compatibilidad)
    },
    transports: ["websocket", "polling"],  // Soportar websocket y long-polling
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // Middleware para añadir headers restrictivos a imágenes
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../public"),
    prefix: "/cards/",
    constraints: {},
    // headers para prevenir descarga y caché persistente
    // Tipamos `res` como ServerResponse para que TS reconozca setHeader.
    setHeaders: (res: ServerResponse, filePath: string) => {
      if (typeof filePath === "string" && (filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))) {
        try {
          // Prevenir que el navegador cache la imagen de forma persistente
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
          // Indicar que no es para descargar
          res.setHeader("Content-Disposition", "inline; filename=restricted");
          // Prevenir acceso de terceros
          res.setHeader("X-Content-Type-Options", "nosniff");
          // Controlar CORS para las imágenes (opcional)
          res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "http://localhost:3000");
        } catch (err) {
          // Loguear con objeto y mensaje para cumplir overloads de pino/fastify.log
          fastify.log.debug({ err: String(err) }, "setHeaders error");
        }
      }
    }
  });

  // usar IIFE async dentro del ready para poder usar await condicionalmente
  fastify.ready((err) => {
    if (err) throw err;
    const io = fastify.io as Server;
    // Tarea periódica para limpiar players inactivos y notificar cambios
    const CLEANUP_INTERVAL = 20_000; // cada 20s
    setInterval(async () => {
      try {
        const changes = await RoomService.cleanupStalePlayers(5_000); // timeout 5s
        for (const ch of changes) {
          if (!ch.room) {
            // sala eliminada
            io.to(ch.roomId).emit("roomDeleted", { roomId: ch.roomId });
          } else {
            io.to(ch.roomId).emit("roomUpdated", ch.room);
            if (ch.room.gameState) io.to(ch.roomId).emit("gameUpdated", ch.room.gameState);
          }
        }
      } catch (e) {
        fastify.log.error({ err: e }, "Error en cleanupStalePlayers");
      }
    }, CLEANUP_INTERVAL);

    io.on("connection", (socket) => {
      console.log("Cliente conectado:", socket.id);
      socket.data.roomId = null;
      socket.data.playerName = null;

      // Cliente solicita que el servidor valide una victoria
      socket.on("claimWin", async (roomId: string, playerName: string, payload: any, callback: Function) => {
        console.log("📥 claimWin recibido:", { roomId, playerName, markedCount: payload?.markedIndices?.length });
        try {
          if (!roomId || !playerName) {
            console.warn("❌ claimWin: parámetros inválidos");
            if (typeof callback === 'function') callback({ success: false, error: "invalid_params" });
            return;
          }
          const room = await RoomService.getRoom(roomId);
          if (!room || !room.players) {
            console.warn("❌ claimWin: sala no encontrada");
            if (typeof callback === 'function') callback({ success: false, error: "room_not_found" });
            return;
          }
          const player = room.players[playerName];
          if (!player) {
            console.warn("❌ claimWin: jugador no encontrado");
            if (typeof callback === 'function') callback({ success: false, error: "player_not_found" });
            return;
          }

          const mode = payload?.gameMode || room.gameState?.gameMode || "full";
          const markedIndices = Array.isArray(payload?.markedIndices) ? payload.markedIndices : (player.markedIndices || []);
          const board = payload?.board ?? (player as any)?.board;
          if (!board) {
            console.warn("❌ claimWin: no hay board");
            if (typeof callback === 'function') callback({ success: false, error: "no_board" });
            return;
          }
          const firstCard = payload?.firstCard || null;
          const calledCardIds = Array.isArray(room.gameState?.calledCardIds) ? room.gameState.calledCardIds : [];

          console.log("🔍 Validando victoria:", { playerName, mode, markedCount: markedIndices.length, calledCount: calledCardIds.length });

          // Validar con lógica centralizada (pasando calledCardIds)
          const validWin = checkWin(board, markedIndices, mode, firstCard, calledCardIds);
          console.log(`✓ checkWin(${mode}) = ${validWin}`);
          
          if (!validWin) {
            console.log("❌ checkWin devolvió false para", { playerName, mode, markedIndices: markedIndices.length });
            if (typeof callback === 'function') callback({ success: false, error: "invalid_pattern" });
            return;
          }

          // Si ya existe ganador evitar duplicados
          if (room.gameState?.winner) {
            console.log("⚠️ Ya hay ganador:", room.gameState.winner);
            if (typeof callback === 'function') callback({ success: false, alreadyWinner: true });
            return;
          }

          // 🏆 FIJADOR DE GANADOR (una sola vez)
          console.log(`🏆 ¡${playerName} ganó en ${roomId}! Modo: ${mode}`);
          room.gameState = {
            ...(room.gameState || {}),
            winner: playerName,
            isGameActive: false,
            timestamp: Date.now(),
          };
          
          // Calcular ranking con markedIndices intactos
          const finalRanking = calculateFinalRanking(room.players as Record<string, Player>);
          room.gameState.finalRanking = finalRanking;
          console.log(`📊 Ranking calculado:`, finalRanking);

          // Persistir
          await RoomService.createOrUpdateRoom(roomId, room);
          RoomService.stopCallingCards(roomId);

          // 📡 EMITIR A TODOS EN LA SALA
          io.to(roomId).emit("gameUpdated", room.gameState);
          io.to(roomId).emit("roomUpdated", room);
          
          // ✅ RESPONDER AL CLIENTE (solo una vez)
          if (typeof callback === 'function') {
            callback({ success: true });
          }
          
        } catch (e) {
          console.error("❌ Error en claimWin:", e);
          if (typeof callback === 'function') {
            callback({ success: false, error: String(e) });
          }
        }
      });

      // presencia explícita desde cliente para actualizar lastSeen/isOnline
      socket.on("presence", async ({ roomId, playerName }: { roomId: string; playerName: string }) => {
        try {
          if (roomId && playerName) await RoomService.markPlayerActive(roomId, playerName);
        } catch (err) {
          console.error("presence handler error:", err);
        }
      });

      // --- EXISTENTE: joinRoom / leaveRoom / disconnect ---
      socket.on("joinRoom", async ({ roomId, playerName, playerData }) => {
        try {
          console.log("Intento de unión:", { roomId, playerName });
          const result = await RoomService.addPlayer(roomId, playerName, playerData);

          if (!result.added) {
            console.log("Unión fallida:", result.reason);
            socket.emit("joinError", {
              code: result.reason || "unknown",
              message: result.reason === "name_exists" ? "El nombre ya existe" : "Sala llena",
            });
            return;
          }

          // Guardar datos en el socket antes de unirse a la sala
          socket.data.roomId = roomId;
          socket.data.playerName = playerName;

          await socket.join(roomId);
          const room = await RoomService.getRoom(roomId);
          console.log("Unión exitosa, sala:", room);

          // Emitir sala actualizada a todos para sincronizar host/players
          io.to(roomId).emit("roomUpdated", room);
          io.to(roomId).emit("gameUpdated", room?.gameState);

          socket.emit("roomJoined", room);
          socket.to(roomId).emit("playerJoined", { playerName, playerData });
          // marcar activo al unirse
          await RoomService.markPlayerActive(roomId, playerName);
          // emitir playerJoined ya hace roomUpdated/gameUpdated
        } catch (err) {
          console.error("Error en joinRoom:", err);
          socket.emit("joinError", { code: "server_error", message: "Error al unirse a la sala" });
        }
      });

      socket.on("leaveRoom", async ({ roomId, playerName }) => {
        try {
          console.log("Solicitud de salida:", { roomId, playerName });
          await RoomService.removePlayer(roomId, playerName);
          socket.leave(roomId);

          // Obtener sala actualizada y emitir para que clientes re-hidraten UI (host reassignment)
          const updated = await RoomService.getRoom(roomId);
          io.to(roomId).emit("playerLeft", { playerName });
          io.to(roomId).emit("roomUpdated", updated);
          if (updated?.gameState) io.to(roomId).emit("gameUpdated", updated.gameState);

        } catch (err) {
          console.error("Error en leaveRoom:", err);
        }
      });

      socket.on("disconnect", async () => {
        const roomId = socket.data.roomId;
        const playerName = socket.data.playerName;
        console.log("Cliente desconectado:", socket.id, { roomId, playerName });

        if (roomId && playerName) {
          try {
            const room = await RoomService.getRoom(roomId);
            // Si el juego está activo, eliminar inmediatamente al jugador
            // En caso contrario, solo marcar offline (cleanup lo eliminará después)
            if (room?.gameState?.isGameActive) {
              console.log(`🔥 Juego activo: eliminando jugador ${playerName} de sala ${roomId}`);
              await RoomService.removePlayer(roomId, playerName);
            } else {
              // Si no hay juego activo, marcar offline para cleanup eventual
              await RoomService.markPlayerOffline(roomId, playerName);
            }
            // obtener sala actualizada y emitir (si sigue existiendo)
            const updated = await RoomService.getRoom(roomId);
            if (!updated || Object.keys(updated.players || {}).length === 0) {
              // si ya no hay players, deleteRoom se encargará en cleanup; opcionalmente borrar ahora
              await RoomService.deleteRoom?.(roomId);
              return;
            }

            io.to(roomId).emit("playerLeft", { playerName });
            io.to(roomId).emit("roomUpdated", updated);
            if (updated?.gameState) io.to(roomId).emit("gameUpdated", updated.gameState);

          } catch (err) {
            console.error("Error al remover jugador en disconnect:", err);
          }
        }
      });


      socket.on("updateRoom", async (roomId: string, payload: any) => {
        try {
          if (!roomId || !payload) return;
          const room = (await RoomService.getRoom(roomId)) || {
            players: {},
            gameState: {
              host: "",
              isGameActive: false,
              winner: null,
              gameMode: "",
              deck: [],
              calledCardIds: [],
              timestamp: Date.now(),
              finalRanking: null,
            }
          };

          // Fusionar players si vienen
          if (payload.players && typeof payload.players === "object") {
            room.players = { ...(room.players || {}), ...payload.players };
          }

          // Fusionar gameState si viene
          if (payload.gameState && typeof payload.gameState === "object") {
            // permitimos actualizar la mayoría de campos y también calledCardIds
            // (el cliente puede enviar [] para limpiar historial)
            const { deck, ...safeGameState } = payload.gameState;
            room.gameState = {
              ...(room.gameState || {}),
              ...safeGameState // merge general
            };

            // Si viene explicitamente calledCardIds lo aplicamos (incluso si es [])
            if (Object.prototype.hasOwnProperty.call(payload.gameState, "calledCardIds")) {
              room.gameState.calledCardIds = Array.isArray(payload.gameState.calledCardIds)
                ? payload.gameState.calledCardIds
                : [];
            }

            // Si el cliente pide desactivar el juego o hay ganador, paramos el bucle.
            if (safeGameState.isGameActive === false || safeGameState.winner) {
              RoomService.stopCallingCards(roomId);
            }
          }

          // Si hay ganador o el juego se desactiva, asegurarse de limpiar las marcas
          const shouldClearMarks =
            room.gameState?.winner != null ||
            (payload.gameState && payload.gameState.isGameActive === false);

          // Si hay ganador, calcula el ranking con las marcas intactas.
          if (room.gameState?.winner && room.players) {
            const finalRanking = calculateFinalRanking(room.players as Record<string, Player>);
            room.gameState.finalRanking = finalRanking;
            console.log(`🏆 Ranking final calculado para ${roomId}:`, finalRanking);

            // Detener bucle aquí también por si el cliente no mandó isGameActive=false
            RoomService.stopCallingCards(roomId);
          }

          if (shouldClearMarks && room.players && typeof room.players === "object") {
            const players = room.players as Record<string, Player>;
            Object.keys(players).forEach((k: string) => {
              const current = players[k] || ({} as Player);
              // Limpiar las marcas después de haber guardado el ranking
              players[k] = { ...current, markedIndices: [] };
            });
            room.players = players;
          }

          await RoomService.createOrUpdateRoom(roomId, room);

          // Emitir sólo el gameState (el cliente escucha "gameUpdated")
          io.to(roomId).emit("gameUpdated", room.gameState);
          // Emitir también la sala completa por si otros consumidores la necesitan
          io.to(roomId).emit("roomUpdated", room);
          if (shouldClearMarks) {
            const players = room.players as Record<string, Player>;
            Object.keys(players).forEach((pName: string) => {
              // Emitimos el evento que el cliente usa para actualizar un solo jugador
              io.to(roomId).emit("playerJoined", { playerName: pName, playerData: players[pName] });
            });
          }
        } catch (err) {
          console.error("Error en updateRoom:", err);
          socket.emit("error", { message: "Error al actualizar sala", detail: String(err) });
        }
      });

      // Soportar formato alterno: socket.emit("updateGame", { roomId, gameState })
      socket.on("updateGame", async (payload: { roomId: string; gameState: any }) => {
        try {
          if (!payload?.roomId || !payload?.gameState) return;
          const roomId = payload.roomId;
          const room = (await RoomService.getRoom(roomId)) || { players: {} as Record<string, Player>, gameState: {} as any };
          room.gameState = { ...(room.gameState || {}), ...payload.gameState };

          const { deck, calledCardIds, ...safeGameState } = payload.gameState;
          room.gameState = {
            ...(room.gameState || {}),
            ...safeGameState // Solo fusionamos propiedades seguras
          };

          // Si el cliente pide desactivar el juego o hay ganador, paramos el bucle.
          if (safeGameState.isGameActive === false || safeGameState.winner) {
            RoomService.stopCallingCards(roomId);
          }

          // Si hay ganador o el juego se desactiva, limpiar marcas
          const shouldClearMarks =
            room.gameState?.winner != null || payload.gameState.isGameActive === false;

          // Si hay ganador, calcula el ranking con las marcas intactas.
          if (room.gameState?.winner && room.players) {
            const finalRanking = calculateFinalRanking(room.players as Record<string, Player>);
            room.gameState.finalRanking = finalRanking;
            console.log(`🏆 Ranking final calculado (updateGame) para ${roomId}:`, finalRanking);

            // Detener bucle aquí también por si el cliente no mandó isGameActive=false
            RoomService.stopCallingCards(roomId);
          }

          if (shouldClearMarks) {
            Object.keys(room.players).forEach((k) => {
              const players = room.players as Record<string, Player>;
              // Limpiar las marcas después de haber guardado el ranking
              players[k] = { ...(players[k] || {}), markedIndices: [] };
            });
          }

          await RoomService.createOrUpdateRoom(roomId, room);
          io.to(roomId).emit("gameUpdated", room.gameState);
          io.to(roomId).emit("roomUpdated", room);

          if (shouldClearMarks) {
            const players = room.players as Record<string, Player>;
            Object.keys(players).forEach((pName: string) => {
              // Emitimos el evento que el cliente usa para actualizar un solo jugador
              io.to(roomId).emit("playerJoined", { playerName: pName, playerData: players[pName] });
            });
          }
        } catch (err) {
          console.error("Error en updateGame:", err);
          socket.emit("error", { message: "Error al actualizar gameState", detail: String(err) });
        }
      });

      socket.on("startGameLoop", async (roomId: string, gameMode: string) => {
        try {
          console.log(`➡️ Inicializando juego y bucle de llamadas para sala ${roomId} en modo ${gameMode}`);

          // Guardar: si ya hay juego activo no reiniciamos (evitar duplicados)
          const existing = await RoomService.getRoom(roomId);
          if (existing?.gameState?.isGameActive) {
            console.log(`startGameLoop ignorado para ${roomId}: juego ya activo.`);
            return;
          }

          // 1. Inicializa el juego (barajar mazo, limpiar marcas)
          const initialRoom = await RoomService.initializeGame(roomId, gameMode);

          // 2. Inicia el bucle de llamadas automáticas (startCallingCards ya ejecuta la primera llamada)
          await RoomService.startCallingCards(roomId, io);

          // Emitir la sala actualizada (gameUpdated ya es emitido por startCallingCards/callNextCard)
          const updated = await RoomService.getRoom(roomId);
          io.to(roomId).emit("roomUpdated", updated);
        } catch (err) {
          console.error("Error en startGameLoop:", err);
          socket.emit("error", { message: "Error al iniciar juego" });
        }
      });

      socket.on("stopGameLoop", async (roomId: string) => {
        try {
          console.log(`⏹️ Deteniendo bucle de cartas para sala ${roomId}`);
          await RoomService.stopCallingCards(roomId);
          const updated = await RoomService.getRoom(roomId);
          io.to(roomId).emit("roomUpdated", updated);
          io.to(roomId).emit("gameUpdated", updated?.gameState);
        } catch (err) {
          console.error("Error en stopGameLoop:", err);
          socket.emit("error", { message: "Error al detener juego" });
        }
      });

      socket.on("startGameCountdown", async (roomId: string, gameMode: string, callback?: Function) => {
        console.log("⏱️ startGameCountdown recibido:", { roomId, gameMode });
        try {
          if (!roomId || !gameMode) {
            if (typeof callback === 'function') callback({ success: false, error: 'invalid_params' });
            return;
          }

          const room = await RoomService.getRoom(roomId);
          if (!room) {
            if (typeof callback === 'function') callback({ success: false, error: 'room_not_found' });
            return;
          }

          // ✅ Responder al cliente INMEDIATAMENTE (antes de los delays)
          if (typeof callback === 'function') {
            callback({ success: true });
          }

          // Iniciar countdown: 3, 2, 1, 0 (YA)
          const countdownSequence = [3, 2, 1, 0];
          const delayMs = 1000; // 1 segundo entre cada número

          for (let i = 0; i < countdownSequence.length; i++) {
            const countdown = countdownSequence[i];
            
            // Esperar 1 segundo (excepto en el primero que va inmediato)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            // Emitir countdown a todos en la sala
            console.log(`⏱️ Emitiendo countdown ${countdown} para ${roomId}`);
            io.to(roomId).emit("gameStartCountdown", countdown);
          }

          // ✅ Después del countdown (3, 2, 1, 0), iniciar el juego
          await new Promise(resolve => setTimeout(resolve, 500)); // pequeño delay tras "¡YA!"
          
          console.log(`🎮 Iniciando juego en ${roomId} modo ${gameMode}`);
          
          // ✅ Usar initializeGame que gestiona el deck y las marcas correctamente
          const updatedRoom = await RoomService.initializeGame(roomId, gameMode);
          
          io.to(roomId).emit("gameUpdated", updatedRoom.gameState);
          io.to(roomId).emit("roomUpdated", updatedRoom);

          // Iniciar el bucle de cartas
          await RoomService.startCallingCards(roomId, io);

        } catch (e) {
          console.error("❌ Error en startGameCountdown:", e);
          if (typeof callback === 'function') {
            callback({ success: false, error: String(e) });
          }
          socket.emit("startGameCountdownError", { error: String(e) });
        }
      });
    });

    // (removed stray IIFE closure — fastify.ready callback ya está correctamente cerrado arriba)
  }); // <-- cierre correcto de fastify.ready

  // 4️⃣ Iniciar servidor: limpiar players históricos y levantar listener
  await RoomService.clearAllPlayers();
  console.log("Se limpiaron players históricos en la DB.");

  const port = parseInt(process.env.PORT || "3003", 10); // Usar PORT de Render o 3003 local
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`✅ Servidor escuchando en puerto ${port}`);
  } catch (err) {
    throw err;
  }

} // <-- cierre de la función startServer

// arranca la función principal y captura errores
startServer().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});


function shuffleDeck(): number[] {
  const deck: number[] = [];
  for (let i = 1; i <= 55; i++) {
    deck.push(i);
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Iniciar el servidor
// startServer().catch(err => {
//   console.error("Fatal error starting server:", err);
//   process.exit(1);
// });

