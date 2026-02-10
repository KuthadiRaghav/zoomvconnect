import Redis from "ioredis";

interface ParticipantState {
    participantId: string;
    identity: string;
    name?: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing?: boolean;
    isHandRaised: boolean;
    connectionQuality?: "excellent" | "good" | "poor" | "lost";
}

interface RoomState {
    roomId: string;
    participants: ParticipantState[];
    isRecording: boolean;
    activeSpeakerId: string | null;
}

export class RoomManager {
    private redis: Redis;
    private readonly ROOM_PREFIX = "room:state:";
    private readonly PARTICIPANT_PREFIX = "room:participants:";
    private readonly TTL = 24 * 60 * 60; // 24 hours

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async addParticipant(roomId: string, participant: ParticipantState): Promise<void> {
        const key = `${this.PARTICIPANT_PREFIX}${roomId}`;
        await this.redis.hset(key, participant.participantId, JSON.stringify(participant));
        await this.redis.expire(key, this.TTL);
    }

    async removeParticipant(roomId: string, participantId: string): Promise<void> {
        const key = `${this.PARTICIPANT_PREFIX}${roomId}`;
        await this.redis.hdel(key, participantId);
    }

    async getParticipants(roomId: string): Promise<ParticipantState[]> {
        const key = `${this.PARTICIPANT_PREFIX}${roomId}`;
        const data = await this.redis.hgetall(key);
        return Object.values(data).map((p) => JSON.parse(p));
    }

    async getParticipant(roomId: string, participantId: string): Promise<ParticipantState | null> {
        const key = `${this.PARTICIPANT_PREFIX}${roomId}`;
        const data = await this.redis.hget(key, participantId);
        return data ? JSON.parse(data) : null;
    }

    async updateParticipantState(
        roomId: string,
        participantId: string,
        update: Partial<ParticipantState>
    ): Promise<void> {
        const participant = await this.getParticipant(roomId, participantId);
        if (participant) {
            await this.addParticipant(roomId, { ...participant, ...update });
        }
    }

    async getRoomState(roomId: string): Promise<RoomState> {
        const participants = await this.getParticipants(roomId);
        const stateKey = `${this.ROOM_PREFIX}${roomId}`;
        const stateData = await this.redis.get(stateKey);
        const state = stateData ? JSON.parse(stateData) : { isRecording: false, activeSpeakerId: null };

        return {
            roomId,
            participants,
            ...state,
        };
    }

    async updateRoomState(roomId: string, update: Partial<RoomState>): Promise<void> {
        const stateKey = `${this.ROOM_PREFIX}${roomId}`;
        const currentState = await this.getRoomState(roomId);
        await this.redis.setex(stateKey, this.TTL, JSON.stringify({ ...currentState, ...update }));
    }

    async setActiveSpeaker(roomId: string, participantId: string | null): Promise<void> {
        await this.updateRoomState(roomId, { activeSpeakerId: participantId });
    }

    async setRecording(roomId: string, isRecording: boolean): Promise<void> {
        await this.updateRoomState(roomId, { isRecording });
    }

    async deleteRoom(roomId: string): Promise<void> {
        await this.redis.del(`${this.PARTICIPANT_PREFIX}${roomId}`);
        await this.redis.del(`${this.ROOM_PREFIX}${roomId}`);
    }

    async getParticipantCount(roomId: string): Promise<number> {
        const key = `${this.PARTICIPANT_PREFIX}${roomId}`;
        return this.redis.hlen(key);
    }
}
