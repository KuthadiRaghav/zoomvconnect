// ===========================================
// Application Constants
// ===========================================

// API configuration
export const API_VERSION = "v1";
export const API_BASE_PATH = `/api/${API_VERSION}`;

// Rate limits
export const RATE_LIMITS = {
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 10,
    },
    API: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 100,
    },
    WEBSOCKET: {
        MAX_CONNECTIONS_PER_USER: 5,
        MAX_MESSAGES_PER_SECOND: 10,
    },
} as const;

// Meeting limits
export const MEETING_LIMITS = {
    MAX_PARTICIPANTS: 1000,
    MAX_BREAKOUT_ROOMS: 50,
    MAX_CHAT_MESSAGE_LENGTH: 2000,
    MAX_RECORDING_DURATION: 24 * 60 * 60, // 24 hours in seconds
    WAITING_ROOM_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const;

// Media configuration
export const MEDIA_CONFIG = {
    VIDEO: {
        WIDTH: 1280,
        HEIGHT: 720,
        FRAME_RATE: 30,
        MAX_BITRATE: 2500000, // 2.5 Mbps
    },
    AUDIO: {
        SAMPLE_RATE: 48000,
        CHANNELS: 1,
        MAX_BITRATE: 64000, // 64 Kbps
    },
    SCREEN_SHARE: {
        WIDTH: 1920,
        HEIGHT: 1080,
        FRAME_RATE: 15,
        MAX_BITRATE: 4000000, // 4 Mbps
    },
} as const;

// JWT configuration
export const JWT_CONFIG = {
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
    LIVEKIT_TOKEN_EXPIRES_IN: "1h",
} as const;

// WebSocket events
export const WS_EVENTS = {
    // Client -> Server
    ROOM_JOIN: "room:join",
    ROOM_LEAVE: "room:leave",
    MEDIA_TOGGLE_AUDIO: "media:toggle-audio",
    MEDIA_TOGGLE_VIDEO: "media:toggle-video",
    MEDIA_START_SCREENSHARE: "media:start-screenshare",
    MEDIA_STOP_SCREENSHARE: "media:stop-screenshare",
    PARTICIPANT_RAISE_HAND: "participant:raise-hand",
    PARTICIPANT_REACTION: "participant:reaction",
    CHAT_MESSAGE: "chat:message",
    BREAKOUT_ASSIGN: "breakout:assign",

    // Server -> Client
    ROOM_JOINED: "room:joined",
    ROOM_PARTICIPANT_JOINED: "room:participant-joined",
    ROOM_PARTICIPANT_LEFT: "room:participant-left",
    MEDIA_TRACK_SUBSCRIBED: "media:track-subscribed",
    MEDIA_TRACK_UNSUBSCRIBED: "media:track-unsubscribed",
    MEDIA_ACTIVE_SPEAKER: "media:active-speaker",
    PARTICIPANT_STATE_CHANGED: "participant:state-changed",
    CHAT_MESSAGE_RECEIVED: "chat:message-received",
    MEETING_STATE_CHANGED: "meeting:state-changed",
    ERROR: "error",
} as const;

// Error codes
export const ERROR_CODES = {
    // Auth errors
    INVALID_CREDENTIALS: "AUTH_001",
    TOKEN_EXPIRED: "AUTH_002",
    TOKEN_INVALID: "AUTH_003",
    UNAUTHORIZED: "AUTH_004",

    // Meeting errors
    MEETING_NOT_FOUND: "MEET_001",
    MEETING_ENDED: "MEET_002",
    MEETING_FULL: "MEET_003",
    INVALID_PASSCODE: "MEET_004",
    NOT_ALLOWED: "MEET_005",

    // Media errors
    MEDIA_ERROR: "MEDIA_001",
    DEVICE_NOT_FOUND: "MEDIA_002",
    PERMISSION_DENIED: "MEDIA_003",

    // General errors
    VALIDATION_ERROR: "GEN_001",
    INTERNAL_ERROR: "GEN_002",
    RATE_LIMITED: "GEN_003",
} as const;
