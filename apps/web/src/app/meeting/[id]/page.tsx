"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PreJoin from "@/components/meeting/PreJoin";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { WaitingRoomLobby } from "@/components/meeting/WaitingRoomLobby";
import { useAuthStore } from "@/lib/store";

interface JoinResult {
    status: "admitted" | "waiting";
    token?: string;
    livekitUrl?: string;
    meeting: { id: string; title: string; roomName: string };
    participant: { id: string; name: string; role: string };
}

interface MediaSettings { audio: boolean; video: boolean }

type PageState = "prejoin" | "loading" | "waiting" | "meeting" | "error";

export default function MeetingPage() {
    const params = useParams();
    const router = useRouter();
    const meetingId = params.id as string;
    const { isAuthenticated } = useAuthStore();

    const [pageState, setPageState] = useState<PageState>("prejoin");
    const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
    const [mediaSettings, setMediaSettings] = useState<MediaSettings>({ audio: true, video: true });
    const [error, setError] = useState<string | null>(null);
    const [resolvedMeetingId, setResolvedMeetingId] = useState(meetingId);

    useEffect(() => {
        if (!isAuthenticated) router.push("/login");
    }, [isAuthenticated, router]);

    const handleJoin = async (settings: MediaSettings) => {
        setMediaSettings(settings);
        setPageState("loading");
        setError(null);

        try {
            if (!isAuthenticated) { router.push("/login"); return; }

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            let actualMeetingId = meetingId;

            if (meetingId === "new") {
                const createRes = await fetch("/api/v1/meetings", {
                    method: "POST",
                    headers,
                    credentials: "include",
                    body: JSON.stringify({ title: "Instant Meeting", type: "INSTANT" }),
                });
                if (!createRes.ok) throw new Error((await createRes.json()).message || "Failed to create meeting");
                actualMeetingId = (await createRes.json()).id;
                setResolvedMeetingId(actualMeetingId);
            }

            const response = await fetch(`/api/v1/meetings/${actualMeetingId}/join`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({}),
            });

            if (!response.ok) throw new Error((await response.json()).message || "Failed to join meeting");

            const data: JoinResult = await response.json();
            setJoinResult(data);
            setPageState(data.status === "waiting" ? "waiting" : "meeting");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to join meeting");
            setPageState("error");
        }
    };

    // Called by WaitingRoomLobby once the host admits us and we re-join to get a token
    const handleAdmitted = (token: string, livekitUrl: string) => {
        if (!joinResult) return;
        setJoinResult((prev) => prev ? { ...prev, status: "admitted", token, livekitUrl } : prev);
        setPageState("meeting");
    };

    const handleDenied = () => {
        setError("The host has declined your request to join this meeting.");
        setPageState("error");
    };

    if (pageState === "error") {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Unable to Join</h1>
                    <p className="text-gray-400 max-w-xs">{error}</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (pageState === "loading") {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <h2 className="text-xl font-semibold text-white">Joining Meeting…</h2>
                    <p className="text-gray-400 text-sm">Connecting you to the room</p>
                </div>
            </div>
        );
    }

    if (pageState === "waiting" && joinResult) {
        return (
            <WaitingRoomLobby
                meetingId={joinResult.meeting.id}
                participantId={joinResult.participant.id}
                meetingTitle={joinResult.meeting.title}
                onAdmitted={handleAdmitted}
                onDenied={handleDenied}
            />
        );
    }

    if (pageState === "meeting" && joinResult?.token) {
        return (
            <MeetingRoom
                token={joinResult.token}
                serverUrl={joinResult.livekitUrl!}
                meetingId={joinResult.meeting.id}
                meetingTitle={joinResult.meeting.title}
                audioEnabled={mediaSettings.audio}
                videoEnabled={mediaSettings.video}
            />
        );
    }

    return (
        <PreJoin
            user={{ name: "You" }}
            meetingTitle={meetingId === "new" ? "Starting New Meeting" : `Meeting: ${meetingId}`}
            onJoin={handleJoin}
            onCancel={() => router.push("/dashboard")}
        />
    );
}
