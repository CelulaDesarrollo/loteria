import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

// URL de Render - SIEMPRE debe ser https://loteria-gfrn.onrender.com
// NO usar loteriainfosegura.uv.mx para WebSocket
const SERVER_URL = "https://loteria-gfrn.onrender.com";

interface PlayerData {
    name: string;
    isOnline: boolean;
    board: any;
    markedIndices?: number[];
}

class GameSocket {
    private socket!: Socket;
    private static instance: GameSocket;
    private connecting: boolean = false;
    private lastRoom: any = null;

    private constructor() {
        console.log("[gameSocket] Inicializando con SERVER_URL:", SERVER_URL);
        
        this.socket = io(SERVER_URL, {
            transports: ["websocket", "polling"],
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            secure: true,
            rejectUnauthorized: false,
            upgrade: true,
            // Timeouts y debugging
            connect_timeout: 10000,
            reconnectionDelayMax: 5000,
        });

        // Logging para debugging
        this.socket.on("connect", () => {
            console.log("[gameSocket] ✅ Conectado a Render. Socket ID:", this.socket.id);
        });

        this.socket.on("disconnect", (reason: string) => {
            console.warn("[gameSocket] ⚠️ Desconectado. Razón:", reason);
        });

        this.socket.on("connect_error", (error: any) => {
            console.error("[gameSocket] ❌ Error de conexión:", error.message || error);
        });

        this.socket.on("error", (error: any) => {
            console.error("[gameSocket] ❌ Error de socket:", error);
        });

        // Mantener lastRoom actualizado
        this.socket.on("roomJoined", (room: any) => {
            this.lastRoom = room;
            console.log("[gameSocket] roomJoined received");
        });
    }

    static getInstance() {
        if (!GameSocket.instance) {
            GameSocket.instance = new GameSocket();
        }
        return GameSocket.instance;
    }

    getLastRoom() {
        return this.lastRoom;
    }

    onRoomJoined(cb: (room: any) => void) {
        this.socket.on("roomJoined", cb);
        return () => this.socket.off("roomJoined", cb);
    }

    onGameUpdate(callback: (state: any) => void) {
        this.socket.on("gameUpdated", callback);
        return () => this.socket.off("gameUpdated", callback);
    }

    onRoomUpdate(callback: (room: any) => void) {
        this.socket.on("roomUpdated", callback);
        return () => this.socket.off("roomUpdated", callback);
    }

    onPlayerJoined(cb: (payload: { playerName: string; playerData: PlayerData }) => void) {
        this.socket.on("playerJoined", cb);
        return () => this.socket.off("playerJoined", cb);
    }

    onPlayerLeft(cb: (payload: { playerName: string }) => void) {
        this.socket.on("playerLeft", cb);
        return () => this.socket.off("playerLeft", cb);
    }

    onGameStartCountdown(callback: (countdown: number) => void) {
        this.socket.on("gameStartCountdown", callback);
        return () => this.socket.off("gameStartCountdown", callback);
    }

    async ensureConnection(timeoutMs = 5000): Promise<void> {
        if (this.socket.connected) {
            console.log("[gameSocket] Ya conectado");
            return;
        }
        
        if (this.connecting) {
            console.log("[gameSocket] Conexión en progreso, esperando...");
            await new Promise<void>((resolve) => {
                const check = () => {
                    if (this.socket.connected) {
                        clearInterval(interval);
                        resolve();
                    }
                };
                const interval = setInterval(check, 100);
                setTimeout(() => {
                    clearInterval(interval);
                    resolve();
                }, timeoutMs);
            });
            return;
        }

        console.log("[gameSocket] Iniciando conexión...");
        this.connecting = true;
        this.socket.connect();

        await new Promise<void>((resolve) => {
            const onConnect = () => {
                console.log("[gameSocket] ✅ Conexión exitosa");
                this.socket.off("connect", onConnect);
                this.connecting = false;
                resolve();
            };
            
            const onError = () => {
                console.error("[gameSocket] ❌ Fallo en la conexión");
                this.socket.off("connect_error", onError);
                this.connecting = false;
                resolve();
            };
            
            this.socket.once("connect", onConnect);
            this.socket.once("connect_error", onError);

            setTimeout(() => {
                this.socket.off("connect", onConnect);
                this.socket.off("connect_error", onError);
                this.connecting = false;
                console.warn("[gameSocket] ⚠️ Timeout en conexión");
                resolve();
            }, timeoutMs);
        });
    }

    async joinRoom(roomId: string, playerName: string, playerData: PlayerData) {
        console.log("[gameSocket] Intentando unirse a sala:", { roomId, playerName });
        await this.ensureConnection();
        
        return new Promise<{ success: boolean; room?: any; error?: any }>((resolve) => {
            const onJoined = (room: any) => {
                cleanup();
                this.lastRoom = room;
                console.log("[gameSocket] ✅ Unión exitosa");
                resolve({ success: true, room });
            };
            
            const onError = (err: any) => {
                cleanup();
                console.error("[gameSocket] ❌ Error en unión:", err);
                resolve({ success: false, error: err });
            };
            
            const cleanup = () => {
                this.socket.off("roomJoined", onJoined);
                this.socket.off("joinError", onError);
                this.socket.off("error", onError);
            };

            this.socket.once("roomJoined", onJoined);
            this.socket.once("joinError", onError);
            this.socket.once("error", onError);

            this.socket.emit("joinRoom", { roomId, playerName, playerData });
        });
    }

    async leaveRoom(roomId: string, playerName: string) {
        try {
            await this.ensureConnection();
            this.socket.emit("leaveRoom", { roomId, playerName });
            this.lastRoom = null;
        } catch (e) {
            console.error("[gameSocket] Error en leaveRoom:", e);
        }
    }

    updateRoom(roomId: string, payload: any): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        try {
          this.socket.emit("updateRoom", roomId, payload, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    async emit(event: string, ...args: any[]): Promise<any> {
        await this.ensureConnection();
        try {
            return new Promise<any>((resolve, reject) => {
                try {
                    this.socket.emit(event, ...args, (...cbArgs: any[]) => {
                        if (!cbArgs || cbArgs.length === 0) return resolve(undefined);
                        if (cbArgs.length === 2 && cbArgs[0]) return reject(cbArgs[0]);
                        return resolve(cbArgs[0]);
                    });
                } catch (emitErr) {
                    console.error("[gameSocket] emit error:", emitErr);
                    reject(emitErr);
                }
            });
        } catch (e) {
            console.error("[gameSocket] emit outer error:", e);
            throw e;
        }
    }

    onClaimWinResult(callback: (result: { success: boolean; error?: string; alreadyWinner?: boolean }) => void) {
        this.socket.on("claimWinResult", callback);
        return () => this.socket.off("claimWinResult", callback);
    }
}

export const gameSocket = GameSocket.getInstance();