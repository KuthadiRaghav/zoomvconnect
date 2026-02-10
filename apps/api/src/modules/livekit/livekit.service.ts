import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    AccessToken,
    RoomServiceClient,
    EgressClient,
    VideoGrant,
    DataPacket_Kind,
} from "livekit-server-sdk";

@Injectable()
export class LivekitService {
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly apiUrl: string;
    private readonly roomService: RoomServiceClient;
    private readonly egressClient: EgressClient;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>("LIVEKIT_API_KEY", "devkey");
        this.apiSecret = this.configService.get<string>("LIVEKIT_API_SECRET", "secret");
        this.apiUrl = this.configService.get<string>("LIVEKIT_URL", "ws://localhost:7880");

        this.roomService = new RoomServiceClient(this.apiUrl, this.apiKey, this.apiSecret);
        this.egressClient = new EgressClient(this.apiUrl, this.apiKey, this.apiSecret);
    }

    /**
     * Generate a token for a participant to join a room
     */
    async createToken(
        roomName: string,
        participantIdentity: string,
        participantName: string,
        options: {
            canPublish?: boolean;
            canSubscribe?: boolean;
            canPublishData?: boolean;
            isHost?: boolean;
            metadata?: string;
        } = {}
    ): Promise<string> {
        const {
            canPublish = true,
            canSubscribe = true,
            canPublishData = true,
            isHost = false,
            metadata,
        } = options;

        const token = new AccessToken(this.apiKey, this.apiSecret, {
            identity: participantIdentity,
            name: participantName,
            metadata,
        });

        const grant: VideoGrant = {
            room: roomName,
            roomJoin: true,
            canPublish,
            canSubscribe,
            canPublishData,
            roomAdmin: isHost,
            roomCreate: isHost,
            roomList: isHost,
            roomRecord: isHost,
        };

        token.addGrant(grant);

        // Token valid for 1 hour
        return await token.toJwt();
    }

    /**
     * Create a room (optional - rooms are auto-created)
     */
    async createRoom(
        roomName: string,
        options: {
            emptyTimeout?: number;
            maxParticipants?: number;
            metadata?: string;
        } = {}
    ) {
        const { emptyTimeout = 300, maxParticipants = 100, metadata } = options;

        return this.roomService.createRoom({
            name: roomName,
            emptyTimeout,
            maxParticipants,
            metadata,
        });
    }

    /**
     * List all active rooms
     */
    async listRooms() {
        return this.roomService.listRooms();
    }

    /**
     * Get a specific room
     */
    async getRoom(roomName: string) {
        const rooms = await this.roomService.listRooms([roomName]);
        return rooms[0];
    }

    /**
     * Delete a room
     */
    async deleteRoom(roomName: string): Promise<void> {
        await this.roomService.deleteRoom(roomName);
    }

    /**
     * List participants in a room
     */
    async listParticipants(roomName: string) {
        return this.roomService.listParticipants(roomName);
    }

    /**
     * Remove a participant from a room
     */
    async removeParticipant(roomName: string, identity: string): Promise<void> {
        await this.roomService.removeParticipant(roomName, identity);
    }

    /**
     * Mute/unmute a participant's track
     */
    async mutePublishedTrack(
        roomName: string,
        identity: string,
        trackSid: string,
        muted: boolean
    ): Promise<void> {
        await this.roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
    }

    /**
     * Update participant metadata
     */
    async updateParticipant(
        roomName: string,
        identity: string,
        metadata?: string,
        permission?: {
            canPublish?: boolean;
            canSubscribe?: boolean;
            canPublishData?: boolean;
        }
    ) {
        return this.roomService.updateParticipant(roomName, identity, metadata, permission);
    }

    /**
     * Start room recording (composite egress)
     */
    async startRecording(roomName: string): Promise<any> {
        try {
            const egress = await this.egressClient.startRoomCompositeEgress(
                roomName,
                {
                    filepath: `/tmp/recordings/${roomName}-${Date.now()}.mp4`,
                } as any
            );
            return egress;
        } catch (error) {
            console.error("Failed to start recording:", error);
            return null;
        }
    }

    /**
     * Stop recording
     */
    async stopRecording(egressId: string): Promise<void> {
        await this.egressClient.stopEgress(egressId);
    }

    /**
     * List active egress operations
     */
    async listEgress(roomName?: string): Promise<any[]> {
        return this.egressClient.listEgress({ roomName }) as any;
    }

    /**
     * Send data to all participants in a room
     */
    async sendData(
        roomName: string,
        data: Uint8Array,
        options: {
            destinationIdentities?: string[];
            topic?: string;
        } = {}
    ): Promise<void> {
        await this.roomService.sendData(
            roomName,
            data,
            DataPacket_Kind.RELIABLE,
            options
        );
    }
}
