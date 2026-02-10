// ===========================================
// Shared TypeScript Types
// ===========================================

// User types
export interface User {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

export interface UserSession {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

// Meeting types
export type MeetingType = "INSTANT" | "SCHEDULED" | "RECURRING" | "PERSONAL_ROOM";
export type MeetingStatus = "SCHEDULED" | "WAITING" | "IN_PROGRESS" | "ENDED" | "CANCELLED";
export type ParticipantRole = "HOST" | "COHOST" | "ATTENDEE";

export interface Meeting {
    id: string;
    title: string;
    description: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    type: MeetingType;
    status: MeetingStatus;
    passcode: string | null;
    waitingRoom: boolean;
    hostId: string;
    roomName: string;
    createdAt: string;
}

export interface Participant {
    id: string;
    meetingId: string;
    userId: string | null;
    guestName: string | null;
    role: ParticipantRole;
    joinedAt: string | null;
}

// WebRTC types
export interface ParticipantState {
    participantId: string;
    identity: string;
    name: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isSpeaking: boolean;
    connectionQuality: "excellent" | "good" | "poor" | "lost";
}

export interface MeetingState {
    meetingId: string;
    status: MeetingStatus;
    participants: ParticipantState[];
    activeSpeakerId: string | null;
    isRecording: boolean;
    breakoutRooms: BreakoutRoom[];
}

export interface BreakoutRoom {
    id: string;
    name: string;
    participantIds: string[];
    endsAt: string | null;
}

// Chat types
export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    recipientId?: string;
    timestamp: number;
}

// Recording types
export type RecordingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface Recording {
    id: string;
    meetingId: string;
    status: RecordingStatus;
    videoUrl: string | null;
    audioUrl: string | null;
    duration: number | null;
    createdAt: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// WebSocket Event types
export type ClientEventType =
    | "room:join"
    | "room:leave"
    | "media:toggle-audio"
    | "media:toggle-video"
    | "media:start-screenshare"
    | "media:stop-screenshare"
    | "participant:raise-hand"
    | "participant:reaction"
    | "chat:message"
    | "breakout:assign";

export type ServerEventType =
    | "room:joined"
    | "room:participant-joined"
    | "room:participant-left"
    | "media:track-subscribed"
    | "media:track-unsubscribed"
    | "media:active-speaker"
    | "participant:state-changed"
    | "chat:message-received"
    | "meeting:state-changed"
    | "error";

export interface WebSocketMessage<T = unknown> {
    type: ClientEventType | ServerEventType;
    payload: T;
    timestamp: number;
}

// Reaction types
export type ReactionType = "thumbs-up" | "thumbs-down" | "clap" | "heart" | "laugh" | "surprised";
