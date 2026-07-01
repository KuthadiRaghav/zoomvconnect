"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
    meetingId: string;
    participantId: string;
    meetingTitle: string;
    onAdmitted: (token: string, livekitUrl: string) => void;
    onDenied: () => void;
}

const POLL_INTERVAL_MS = 3000;

export function WaitingRoomLobby({ meetingId, participantId, meetingTitle, onAdmitted, onDenied }: Props) {
    const [waitSeconds, setWaitSeconds] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => setWaitSeconds((s) => s + 1), 1000);

        const poll = async () => {
            try {
                const statusRes = await fetch(
                    `/api/v1/meetings/${meetingId}/waiting-room/${participantId}/status`,
                    { credentials: "include" }
                );

                if (statusRes.status === 404) {
                    // Participant was denied — removed from DB
                    onDenied();
                    return;
                }

                if (!statusRes.ok) return;
                const { isWaiting } = await statusRes.json();

                if (!isWaiting) {
                    // Re-call join to get the token now that we've been admitted
                    const joinRes = await fetch(`/api/v1/meetings/${meetingId}/join`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({}),
                    });
                    if (joinRes.ok) {
                        const data = await joinRes.json();
                        if (data.token) {
                            onAdmitted(data.token, data.livekitUrl);
                        }
                    }
                }
            } catch {
                // Network error — keep polling
            }
        };

        pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
        poll(); // immediate first check

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [meetingId, participantId, onAdmitted, onDenied]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="text-center space-y-8 max-w-md w-full">
                {/* Animated waiting indicator */}
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-2 border-primary-500/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-primary-500/50 animate-ping" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute inset-0 rounded-full bg-primary-600/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Waiting for Host</h1>
                    <p className="text-gray-400">
                        The host will let you in soon.
                    </p>
                    <p className="text-sm text-gray-500 font-medium">{meetingTitle}</p>
                </div>

                {/* Wait timer */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-400 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Waiting for {formatTime(waitSeconds)}
                </div>

                {/* Status dots */}
                <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>

                <p className="text-xs text-gray-600">
                    This page checks automatically every few seconds.
                </p>
            </div>
        </div>
    );
}
