import type {
    Track,
    TrackPublication,
    RemoteParticipant,
    ConnectionQuality,
    DisconnectReason,
} from "livekit-client";

export interface RoomClientOptions {
    serverUrl: string;
}

export interface ParticipantState {
    identity: string;
    name: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    connectionQuality: ConnectionQuality;
    isLocal?: boolean;
}

export interface RoomEventHandlers {
    onConnected: () => void;
    onDisconnected: (reason?: DisconnectReason) => void;
    onParticipantConnected: (participant: ParticipantState) => void;
    onParticipantDisconnected: (identity: string) => void;
    onTrackSubscribed: (
        track: Track,
        publication: TrackPublication,
        participant: RemoteParticipant
    ) => void;
    onTrackUnsubscribed: (
        track: Track,
        publication: TrackPublication,
        participant: RemoteParticipant
    ) => void;
    onActiveSpeakersChanged: (speakerIds: string[]) => void;
    onConnectionQualityChanged: (identity: string, quality: ConnectionQuality) => void;
    onDataReceived: (data: unknown, senderIdentity?: string) => void;
}
