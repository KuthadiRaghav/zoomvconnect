import {
    Room,
    RoomEvent,
    RemoteParticipant,
    LocalParticipant,
    Track,
    TrackPublication,
    ConnectionState,
    LocalTrackPublication,
    RemoteTrackPublication,
} from "livekit-client";
import type { RoomClientOptions, ParticipantState, RoomEventHandlers } from "./types";

export class RoomClient {
    private room: Room;
    private options: RoomClientOptions;
    private eventHandlers: Partial<RoomEventHandlers> = {};

    constructor(options: RoomClientOptions) {
        this.options = options;
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: {
                    width: 1280,
                    height: 720,
                    frameRate: 30,
                },
            },
            audioCaptureDefaults: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.room
            .on(RoomEvent.Connected, () => {
                this.eventHandlers.onConnected?.();
            })
            .on(RoomEvent.Disconnected, (reason) => {
                this.eventHandlers.onDisconnected?.(reason);
            })
            .on(RoomEvent.ParticipantConnected, (participant) => {
                this.eventHandlers.onParticipantConnected?.(this.mapParticipant(participant));
            })
            .on(RoomEvent.ParticipantDisconnected, (participant) => {
                this.eventHandlers.onParticipantDisconnected?.(participant.identity);
            })
            .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                this.eventHandlers.onTrackSubscribed?.(track, publication, participant);
            })
            .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                this.eventHandlers.onTrackUnsubscribed?.(track, publication, participant);
            })
            .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
                const speakerIds = speakers.map((s) => s.identity);
                this.eventHandlers.onActiveSpeakersChanged?.(speakerIds);
            })
            .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
                this.eventHandlers.onConnectionQualityChanged?.(
                    participant.identity,
                    quality
                );
            })
            .on(RoomEvent.DataReceived, (payload, participant) => {
                const data = JSON.parse(new TextDecoder().decode(payload));
                this.eventHandlers.onDataReceived?.(data, participant?.identity);
            });
    }

    async connect(token: string): Promise<void> {
        await this.room.connect(this.options.serverUrl, token);
    }

    async disconnect(): Promise<void> {
        await this.room.disconnect();
    }

    async enableCamera(enabled: boolean): Promise<void> {
        await this.room.localParticipant.setCameraEnabled(enabled);
    }

    async enableMicrophone(enabled: boolean): Promise<void> {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
    }

    async enableScreenShare(enabled: boolean): Promise<void> {
        await this.room.localParticipant.setScreenShareEnabled(enabled);
    }

    async sendData(data: unknown, reliable = true): Promise<void> {
        const encoder = new TextEncoder();
        const payload = encoder.encode(JSON.stringify(data));
        await this.room.localParticipant.publishData(
            payload,
            reliable ? { reliable: true } : { reliable: false }
        );
    }

    getLocalParticipant(): LocalParticipant {
        return this.room.localParticipant;
    }

    getRemoteParticipants(): RemoteParticipant[] {
        return Array.from(this.room.remoteParticipants.values());
    }

    getAllParticipants(): ParticipantState[] {
        const local = this.mapLocalParticipant(this.room.localParticipant);
        const remote = this.getRemoteParticipants().map((p) => this.mapParticipant(p));
        return [local, ...remote];
    }

    getConnectionState(): ConnectionState {
        return this.room.state;
    }

    on<K extends keyof RoomEventHandlers>(
        event: K,
        handler: RoomEventHandlers[K]
    ): this {
        this.eventHandlers[event] = handler;
        return this;
    }

    private mapParticipant(participant: RemoteParticipant): ParticipantState {
        return {
            identity: participant.identity,
            name: participant.name || participant.identity,
            isMuted: !participant.isMicrophoneEnabled,
            isVideoOn: participant.isCameraEnabled,
            isScreenSharing: participant.isScreenShareEnabled,
            connectionQuality: participant.connectionQuality,
        };
    }

    private mapLocalParticipant(participant: LocalParticipant): ParticipantState {
        return {
            identity: participant.identity,
            name: participant.name || "You",
            isMuted: !participant.isMicrophoneEnabled,
            isVideoOn: participant.isCameraEnabled,
            isScreenSharing: participant.isScreenShareEnabled,
            connectionQuality: participant.connectionQuality,
            isLocal: true,
        };
    }
}
