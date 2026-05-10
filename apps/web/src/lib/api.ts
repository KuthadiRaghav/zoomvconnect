// All requests use the Next.js rewrite proxy (/api → backend) so cookies are
// sent automatically by the browser — no Authorization header needed.
const API_BASE = "/api/v1";

interface ApiOptions {
    method?: string;
    body?: unknown;
}

class ApiError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body } = options;

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    // Attempt silent token refresh on 401 (once), then retry
    if (response.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
        const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        if (refreshed.ok) {
            const retry = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
                credentials: "include",
            });
            if (retry.ok) {
                return retry.json() as Promise<T>;
            }
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data.error?.code || "UNKNOWN",
            data.error?.message || data.message || "An error occurred"
        );
    }

    return data;
}

// Auth
export const authApi = {
    login: (email: string, password: string) =>
        request<{ message: string }>("/auth/login", {
            method: "POST",
            body: { email, password },
        }),

    register: (email: string, password: string, name: string) =>
        request<{ message: string }>("/auth/register", {
            method: "POST",
            body: { email, password, name },
        }),

    refresh: () =>
        request<{ message: string }>("/auth/refresh", { method: "POST" }),

    logout: () =>
        request<void>("/auth/logout", { method: "POST" }),
};

// Meetings
export const meetingsApi = {
    list: (params?: { status?: string; page?: number }) =>
        request<{
            items: Meeting[];
            total: number;
            page: number;
            hasMore: boolean;
        }>(`/meetings${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`),

    get: (id: string) =>
        request<Meeting>(`/meetings/${id}`),

    create: (data: CreateMeetingData) =>
        request<Meeting>("/meetings", { method: "POST", body: data }),

    update: (id: string, data: Partial<CreateMeetingData>) =>
        request<Meeting>(`/meetings/${id}`, { method: "PATCH", body: data }),

    delete: (id: string) =>
        request<void>(`/meetings/${id}`, { method: "DELETE" }),

    join: (id: string, passcode?: string) =>
        request<JoinResponse>(`/meetings/${id}/join`, {
            method: "POST",
            body: { passcode },
        }),

    end: (id: string) =>
        request<void>(`/meetings/${id}/end`, { method: "POST" }),

    startRecording: (id: string) =>
        request<{ id: string }>(`/meetings/${id}/recording/start`, { method: "POST" }),

    stopRecording: (id: string, recordingId: string) =>
        request<void>(`/meetings/${id}/recording/${recordingId}/stop`, { method: "POST" }),

    getOccurrences: (id: string) =>
        request<MeetingOccurrence[]>(`/meetings/${id}/occurrences`),
};

// Recordings
export const recordingsApi = {
    list: (params?: { page?: number }) =>
        request<{
            items: Recording[];
            total: number;
            page: number;
            hasMore: boolean;
        }>(`/recordings${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`),

    get: (id: string) =>
        request<Recording>(`/recordings/${id}`),

    delete: (id: string) =>
        request<void>(`/recordings/${id}`, { method: "DELETE" }),

    getTranscript: (id: string) =>
        request<Transcript>(`/recordings/${id}/transcript`),
};

// Users
export const usersApi = {
    getProfile: () =>
        request<User>("/users/me"),

    updateProfile: (data: { name?: string; avatarUrl?: string }) =>
        request<User>("/users/me", { method: "PATCH", body: data }),

    getSettings: () =>
        request<UserSettings>("/users/me/settings"),

    updateSettings: (data: Partial<UserSettings>) =>
        request<UserSettings>("/users/me/settings", { method: "PATCH", body: data }),
};

// Types
interface Meeting {
    id: string;
    title: string;
    description: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    type: string;
    status: string;
    passcode: string | null;
    waitingRoom: boolean;
    hostId: string;
    roomName: string;
}

interface RecurrenceRule {
    frequency: "daily" | "weekly" | "monthly";
    interval?: number;
    count?: number;
}

interface CreateMeetingData {
    title: string;
    description?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    type?: string;
    passcode?: string;
    waitingRoom?: boolean;
    recurrenceRule?: RecurrenceRule;
}

interface MeetingOccurrence {
    id: string;
    title: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    status: string;
    roomName: string;
}

export type { Meeting, RecurrenceRule, MeetingOccurrence };

interface JoinResponse {
    meeting: { id: string; title: string; roomName: string };
    participant: { id: string; name: string; role: string };
    token: string;
    livekitUrl: string;
}

interface Recording {
    id: string;
    meetingId: string;
    status: string;
    videoUrl: string | null;
    audioUrl: string | null;
    duration: number | null;
    createdAt: string;
}

interface Transcript {
    id: string;
    segments: Array<{ start: number; end: number; speaker: string; text: string }>;
    summary: string | null;
    actionItems: string[] | null;
}

interface User {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

interface UserSettings {
    defaultMicOn: boolean;
    defaultCameraOn: boolean;
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
}

export { ApiError };
