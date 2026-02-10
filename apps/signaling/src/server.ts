import { WebSocketServer, WebSocket } from "ws";
import { createServer, Server } from "http";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import { WS_EVENTS } from "@zoomvconnect/shared";
import { RoomManager } from "./room-manager";

interface ServerConfig {
    port: number;
    jwtSecret: string;
    redisUrl: string;
}

interface AuthenticatedSocket extends WebSocket {
    userId?: string;
    participantId?: string;
    roomId?: string;
    isAlive: boolean;
}

interface IncomingMessage {
    type: string;
    payload: any;
}

export class SignalingServer {
    private wss: WebSocketServer;
    private httpServer: Server;
    private redis: Redis;
    private subscriber: Redis;
    private roomManager: RoomManager;
    private config: ServerConfig;
    private pingInterval: NodeJS.Timeout | null = null;

    constructor(config: ServerConfig) {
        this.config = config;
        this.httpServer = createServer((req, res) => {
            if (req.url === "/health") {
                res.writeHead(200);
                res.end("OK");
            }
        });
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.redis = new Redis(config.redisUrl);
        this.subscriber = new Redis(config.redisUrl);
        this.roomManager = new RoomManager(this.redis);

        this.setupWebSocket();
        this.setupRedisSubscriber();
    }

    private setupWebSocket() {
        this.wss.on("connection", async (ws: AuthenticatedSocket, req) => {
            ws.isAlive = true;

            // Authenticate
            const token = this.extractToken(req.url || "");
            if (!token) {
                ws.close(4001, "Authentication required");
                return;
            }

            try {
                const decoded = jwt.verify(token, this.config.jwtSecret) as { sub: string };
                ws.userId = decoded.sub;
            } catch (error) {
                ws.close(4002, "Invalid token");
                return;
            }

            // Handle pong
            ws.on("pong", () => {
                ws.isAlive = true;
            });

            // Handle messages
            ws.on("message", async (data) => {
                try {
                    const message: IncomingMessage = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                } catch (error) {
                    this.sendError(ws, "INVALID_MESSAGE", "Failed to parse message");
                }
            });

            // Handle disconnect
            ws.on("close", async () => {
                if (ws.roomId && ws.participantId) {
                    await this.handleLeave(ws);
                }
            });
        });

        // Heartbeat to detect dead connections
        this.pingInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                const extWs = ws as AuthenticatedSocket;
                if (!extWs.isAlive) {
                    return extWs.terminate();
                }
                extWs.isAlive = false;
                extWs.ping();
            });
        }, 30000);
    }

    private setupRedisSubscriber() {
        this.subscriber.on("message", (channel, message) => {
            // Broadcast to all clients in the room
            const roomId = channel.replace("room:", "");
            this.broadcastToRoom(roomId, JSON.parse(message));
        });
    }

    private extractToken(url: string): string | null {
        const match = url.match(/token=([^&]+)/);
        return match ? match[1] : null;
    }

    private async handleMessage(ws: AuthenticatedSocket, message: IncomingMessage) {
        switch (message.type) {
            case WS_EVENTS.ROOM_JOIN:
                await this.handleJoin(ws, message.payload);
                break;

            case WS_EVENTS.ROOM_LEAVE:
                await this.handleLeave(ws);
                break;

            case WS_EVENTS.MEDIA_TOGGLE_AUDIO:
            case WS_EVENTS.MEDIA_TOGGLE_VIDEO:
                await this.handleMediaToggle(ws, message.type, message.payload);
                break;

            case WS_EVENTS.PARTICIPANT_RAISE_HAND:
                await this.handleRaiseHand(ws, message.payload);
                break;

            case WS_EVENTS.PARTICIPANT_REACTION:
                await this.handleReaction(ws, message.payload);
                break;

            case WS_EVENTS.CHAT_MESSAGE:
                await this.handleChatMessage(ws, message.payload);
                break;

            default:
                this.sendError(ws, "UNKNOWN_EVENT", `Unknown event type: ${message.type}`);
        }
    }

    private async handleJoin(ws: AuthenticatedSocket, payload: { meetingId: string; participantId: string }) {
        const { meetingId, participantId } = payload;

        ws.roomId = meetingId;
        ws.participantId = participantId;

        // Subscribe to room channel
        await this.subscriber.subscribe(`room:${meetingId}`);

        // Add participant to room
        await this.roomManager.addParticipant(meetingId, {
            participantId,
            identity: ws.userId!,
            isMuted: true,
            isVideoOn: false,
            isHandRaised: false,
        });

        // Get room state
        const state = await this.roomManager.getRoomState(meetingId);

        // Send joined confirmation
        this.send(ws, WS_EVENTS.ROOM_JOINED, {
            participants: state.participants,
            state: state,
        });

        // Broadcast to others
        await this.broadcastToRoom(meetingId, {
            type: WS_EVENTS.ROOM_PARTICIPANT_JOINED,
            payload: {
                participantId,
                identity: ws.userId,
            },
        }, ws.participantId);
    }

    private async handleLeave(ws: AuthenticatedSocket) {
        if (!ws.roomId || !ws.participantId) return;

        await this.roomManager.removeParticipant(ws.roomId, ws.participantId);

        // Broadcast to others
        await this.broadcastToRoom(ws.roomId, {
            type: WS_EVENTS.ROOM_PARTICIPANT_LEFT,
            payload: { participantId: ws.participantId },
        }, ws.participantId);

        ws.roomId = undefined;
        ws.participantId = undefined;
    }

    private async handleMediaToggle(
        ws: AuthenticatedSocket,
        type: string,
        payload: { enabled: boolean }
    ) {
        if (!ws.roomId || !ws.participantId) return;

        const field = type === WS_EVENTS.MEDIA_TOGGLE_AUDIO ? "isMuted" : "isVideoOn";
        const value = type === WS_EVENTS.MEDIA_TOGGLE_AUDIO ? !payload.enabled : payload.enabled;

        await this.roomManager.updateParticipantState(ws.roomId, ws.participantId, {
            [field]: value,
        });

        await this.broadcastToRoom(ws.roomId, {
            type: WS_EVENTS.PARTICIPANT_STATE_CHANGED,
            payload: {
                participantId: ws.participantId,
                [field]: value,
            },
        });
    }

    private async handleRaiseHand(ws: AuthenticatedSocket, payload: { raised: boolean }) {
        if (!ws.roomId || !ws.participantId) return;

        await this.roomManager.updateParticipantState(ws.roomId, ws.participantId, {
            isHandRaised: payload.raised,
        });

        await this.broadcastToRoom(ws.roomId, {
            type: WS_EVENTS.PARTICIPANT_STATE_CHANGED,
            payload: {
                participantId: ws.participantId,
                isHandRaised: payload.raised,
            },
        });
    }

    private async handleReaction(ws: AuthenticatedSocket, payload: { type: string }) {
        if (!ws.roomId || !ws.participantId) return;

        await this.broadcastToRoom(ws.roomId, {
            type: WS_EVENTS.PARTICIPANT_REACTION,
            payload: {
                participantId: ws.participantId,
                reactionType: payload.type,
            },
        });
    }

    private async handleChatMessage(ws: AuthenticatedSocket, payload: { content: string; to?: string }) {
        if (!ws.roomId || !ws.participantId) return;

        const message = {
            id: crypto.randomUUID(),
            senderId: ws.participantId,
            content: payload.content,
            recipientId: payload.to,
            timestamp: Date.now(),
        };

        if (payload.to) {
            // Private message
            await this.sendToParticipant(ws.roomId, payload.to, {
                type: WS_EVENTS.CHAT_MESSAGE_RECEIVED,
                payload: message,
            });
            // Also send to sender
            this.send(ws, WS_EVENTS.CHAT_MESSAGE_RECEIVED, message);
        } else {
            // Broadcast to room
            await this.broadcastToRoom(ws.roomId, {
                type: WS_EVENTS.CHAT_MESSAGE_RECEIVED,
                payload: message,
            });
        }
    }

    private send(ws: WebSocket, type: string, payload: any) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
        }
    }

    private sendError(ws: WebSocket, code: string, message: string) {
        this.send(ws, WS_EVENTS.ERROR, { code, message });
    }

    private async broadcastToRoom(roomId: string, message: any, excludeParticipantId?: string) {
        // Publish to Redis for multi-server support
        await this.redis.publish(`room:${roomId}`, JSON.stringify(message));

        // Also broadcast to local connections
        this.wss.clients.forEach((ws) => {
            const client = ws as AuthenticatedSocket;
            if (
                client.readyState === WebSocket.OPEN &&
                client.roomId === roomId &&
                client.participantId !== excludeParticipantId
            ) {
                client.send(JSON.stringify(message));
            }
        });
    }

    private async sendToParticipant(roomId: string, participantId: string, message: any) {
        this.wss.clients.forEach((ws) => {
            const client = ws as AuthenticatedSocket;
            if (
                client.readyState === WebSocket.OPEN &&
                client.roomId === roomId &&
                client.participantId === participantId
            ) {
                client.send(JSON.stringify(message));
            }
        });
    }

    start() {
        this.httpServer.listen(this.config.port, "0.0.0.0");
    }

    async stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        await this.redis.quit();
        await this.subscriber.quit();

        this.wss.close();
        this.httpServer.close();
    }
}
