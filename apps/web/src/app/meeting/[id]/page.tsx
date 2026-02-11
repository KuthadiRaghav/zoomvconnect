"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PreJoin from "@/components/meeting/PreJoin";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";

interface JoinCredentials {
    token: string;
    livekitUrl: string;
    meeting: {
        id: string;
        title: string;
    };
}

export default function MeetingPage() {
    const params = useParams();
    const router = useRouter();
    const meetingId = params.id as string;

    const [isJoined, setIsJoined] = useState(false);
    const [credentials, setCredentials] = useState<JoinCredentials | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mediaSettings, setMediaSettings] = useState({ audio: true, video: true });

    const handleJoin = async (settings: { audio: boolean; video: boolean }) => {
        setMediaSettings(settings);
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("accessToken");

            // Require login for creating/joining meetings
            if (!token) {
                router.push(`/login`);
                return;
            }

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            };

            let actualMeetingId = meetingId;

            // If this is a new meeting, create it first
            if (meetingId === "new") {
                const createRes = await fetch("/api/v1/meetings", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        title: "Instant Meeting",
                        type: "INSTANT",
                    }),
                });

                if (!createRes.ok) {
                    const data = await createRes.json();
                    throw new Error(data.message || "Failed to create meeting");
                }

                const created = await createRes.json();
                actualMeetingId = created.id;
            }

            // Now join the meeting
            const response = await fetch(`/api/v1/meetings/${actualMeetingId}/join`, {
                method: "POST",
                headers,
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to join meeting");
            }

            const data = await response.json();
            setCredentials(data);
            setIsJoined(true);
            setIsLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to join meeting");
            setIsLoading(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Unable to Join</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-semibold text-white mb-2">Joining Meeting...</h2>
                    <p className="text-gray-400">Connecting you to the room</p>
                </div>
            </div>
        );
    }

    if (!isJoined || !credentials) {
        return (
            <PreJoin
                user={{ name: "You" }}
                meetingTitle={meetingId}
                onJoin={handleJoin}
                onCancel={() => router.push("/dashboard")}
            />
        );
    }

    return (
        <MeetingRoom
            token={credentials.token}
            serverUrl={credentials.livekitUrl}
            meetingId={credentials.meeting.id}
            meetingTitle={credentials.meeting.title}
            audioEnabled={mediaSettings.audio}
            videoEnabled={mediaSettings.video}
        />
    );
}
