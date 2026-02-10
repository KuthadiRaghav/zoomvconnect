const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiOptions {
    method?: string;
    body?: unknown;
    token?: string;
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
    const { method = "GET", body, token } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data.error?.code || "UNKNOWN",
            data.error?.message || "An error occurred"
        );
    }

    return data;
}

// Auth
export const authApi = {
    login: (email: string, password: string) =>
        request<{ accessToken: string; refreshToken: string }>("/auth/login", {
            method: "POST",
            body: { email, password },
        }),

    register: (email: string, password: string, name: string) =>
        request<{ accessToken: string; refreshToken: string }>("/auth/register", {
            method: "POST",
            body: { email, password, name },
        }),

    refresh: (refreshToken: string) =>
        request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
        }),

    logout: (refreshToken: string, token: string) =>
        request<void>("/auth/logout", {
            method: "POST",
            body: { refreshToken },
            token,
        }),
};

// Meetings
export const meetingsApi = {
    list: (token: string, params?: { status?: string; page?: number }) =>
        request<{
            items: Meeting[];
            total: number;
            page: number;
            hasMore: boolean;
        }>(`/meetings${params ? `?${new URLSearchParams(params as any)}` : ""}`, {
            token,
        }),

    get: (id: string, token: string) =>
        request<Meeting>(`/meetings/${id}`, { token }),

    create: (data: CreateMeetingData, token: string) =>
        request<Meeting>("/meetings", {
            method: "POST",
            body: data,
            token,
        }),

    update: (id: string, data: Partial<CreateMeetingData>, token: string) =>
        request<Meeting>(`/meetings/${id}`, {
            method: "PATCH",
            body: data,
            token,
        }),

    delete: (id: string, token: string) =>
        request<void>(`/meetings/${id}`, {
            method: "DELETE",
            token,
        }),

    join: (id: string, passcode?: string, token?: string) =>
        request<JoinResponse>(`/meetings/${id}/join`, {
            method: "POST",
            body: { passcode },
            token,
        }),

    end: (id: string, token: string) =>
        request<void>(`/meetings/${id}/end`, {
            method: "POST",
            token,
        }),

    startRecording: (id: string, token: string) =>
        request<{ id: string }>(`/meetings/${id}/recording/start`, {
            method: "POST",
            token,
        }),

    stopRecording: (id: string, recordingId: string, token: string) =>
        request<void>(`/meetings/${id}/recording/${recordingId}/stop`, {
            method: "POST",
            token,
        }),
};

// Recordings
export const recordingsApi = {
    list: (token: string, params?: { page?: number }) =>
        request<{
            items: Recording[];
            total: number;
            page: number;
            hasMore: boolean;
        }>(`/recordings${params ? `?${new URLSearchParams(params as any)}` : ""}`, {
            token,
        }),

    get: (id: string, token: string) =>
        request<Recording>(`/recordings/${id}`, { token }),

    delete: (id: string, token: string) =>
        request<void>(`/recordings/${id}`, {
            method: "DELETE",
            token,
        }),

    getTranscript: (id: string, token: string) =>
        request<Transcript>(`/recordings/${id}/transcript`, { token }),
};

// Users
export const usersApi = {
    getProfile: (token: string) =>
        request<User>("/users/me", { token }),

    updateProfile: (data: { name?: string; avatarUrl?: string }, token: string) =>
        request<User>("/users/me", {
            method: "PATCH",
            body: data,
            token,
        }),

    getSettings: (token: string) =>
        request<UserSettings>("/users/me/settings", { token }),

    updateSettings: (data: Partial<UserSettings>, token: string) =>
        request<UserSettings>("/users/me/settings", {
            method: "PATCH",
            body: data,
            token,
        }),
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

interface CreateMeetingData {
    title: string;
    description?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    type?: string;
    passcode?: string;
    waitingRoom?: boolean;
}

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
