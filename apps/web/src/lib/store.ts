import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setAuth: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setAuth: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

interface MeetingState {
    currentMeeting: {
        id: string;
        title: string;
        roomName: string;
    } | null;
    participants: Map<string, ParticipantState>;
    isRecording: boolean;
    activeSpeakerId: string | null;
    setCurrentMeeting: (meeting: { id: string; title: string; roomName: string } | null) => void;
    updateParticipant: (id: string, state: Partial<ParticipantState>) => void;
    removeParticipant: (id: string) => void;
    setRecording: (isRecording: boolean) => void;
    setActiveSpeaker: (id: string | null) => void;
    reset: () => void;
}

interface ParticipantState {
    id: string;
    name: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    connectionQuality: "excellent" | "good" | "poor" | "lost";
}

export const useMeetingStore = create<MeetingState>((set) => ({
    currentMeeting: null,
    participants: new Map(),
    isRecording: false,
    activeSpeakerId: null,
    setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
    updateParticipant: (id, state) =>
        set((prev) => {
            const participants = new Map(prev.participants);
            const existing = participants.get(id) || {
                id,
                name: "",
                isMuted: true,
                isVideoOn: false,
                isScreenSharing: false,
                isHandRaised: false,
                connectionQuality: "good" as const,
            };
            participants.set(id, { ...existing, ...state });
            return { participants };
        }),
    removeParticipant: (id) =>
        set((prev) => {
            const participants = new Map(prev.participants);
            participants.delete(id);
            return { participants };
        }),
    setRecording: (isRecording) => set({ isRecording }),
    setActiveSpeaker: (id) => set({ activeSpeakerId: id }),
    reset: () =>
        set({
            currentMeeting: null,
            participants: new Map(),
            isRecording: false,
            activeSpeakerId: null,
        }),
}));
