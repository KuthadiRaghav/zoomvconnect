"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    LiveKitRoom,
    VideoConference,
    GridLayout,
    ParticipantTile,
    useTracks,
    RoomAudioRenderer,
    ControlBar,
    Chat,
    useLocalParticipant,
    FocusLayout,
    CarouselLayout,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import { MeetingControls } from "./MeetingControls";

interface MeetingRoomProps {
    token: string;
    serverUrl: string;
    meetingId: string;
    meetingTitle: string;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
}

export function MeetingRoom({
    token,
    serverUrl,
    meetingId,
    meetingTitle,
    audioEnabled = true,
    videoEnabled = true,
}: MeetingRoomProps) {
    const router = useRouter();
    const [showChat, setShowChat] = useState(false);

    const handleDisconnect = () => {
        router.push("/dashboard");
    };

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={videoEnabled}
            audio={audioEnabled}
            onDisconnected={handleDisconnect}
            onError={(error) => {
                console.error("LiveKit error:", error);
            }}
            data-lk-theme="default"
            className="h-screen flex flex-col bg-gray-950 text-white"
        >
            <ActiveMeeting
                meetingId={meetingId}
                meetingTitle={meetingTitle}
                onLeave={handleDisconnect}
            />
        </LiveKitRoom>
    );
}

function ActiveMeeting({ meetingId, meetingTitle, onLeave }: { meetingId: string; meetingTitle: string; onLeave: () => void }) {
    const { localParticipant } = useLocalParticipant();
    const [showChat, setShowChat] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    // Determine if host based on metadata
    const metadata = localParticipant?.metadata ? JSON.parse(localParticipant.metadata) : {};
    const isHost = metadata.role === "HOST" || metadata.role === "COHOST";

    // Track recording status - ideally this should be synced with room metadata or API
    // For now, simple state or check room metadata if available

    const handleToggleRecording = async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
            if (isRecording && recordingId) {
                // Stop recording
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings/${meetingId}/recording/${recordingId}/stop`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsRecording(false);
                setRecordingId(null);
            } else {
                // Start recording
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings/${meetingId}/recording/start`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setIsRecording(true);
                    setRecordingId(data.id);
                }
            }
        } catch (error) {
            console.error("Recording error:", error);
            alert("Failed to toggle recording");
        }
    };

    const handleEndMeeting = async () => {
        if (!confirm("Are you sure you want to end this meeting for everyone?")) return;

        const token = localStorage.getItem("accessToken");
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings/${meetingId}/end`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            // onDisconnected will handle redirect
        } catch (error) {
            console.error("Failed to end meeting:", error);
        }
    };

    // Separate tracks for layout
    const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });

    // Get camera tracks with placeholder - this ensures ALL participants show up
    // withPlaceholder: true creates a placeholder track for participants without camera
    const cameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );

    // Check if local user is sharing
    const isScreenSharing = localParticipant.isScreenShareEnabled;

    return (
        <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Glass Header */}
            <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white drop-shadow-md">{meetingTitle}</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-white/70 text-xs font-medium tracking-wide">{meetingId}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Screen Share Indicator */}
                    {isScreenSharing && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/20 backdrop-blur-md rounded-full border border-green-500/30 shadow-lg shadow-green-900/20 animate-pulse">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-green-200 text-xs font-bold uppercase tracking-wider">You are sharing</span>
                        </div>
                    )}

                    {isRecording && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 backdrop-blur-md rounded-full border border-red-500/30">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-200 text-xs font-bold uppercase tracking-wider">REC</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Layout Area - Using LiveKit VideoConference for reliable multi-participant display */}
            <div className="flex-1 pt-16 pb-20">
                <VideoConference />
            </div>

            {/* Chat Panel - Slide over */}
            {showChat && (
                <div className="w-96 bg-gray-900/90 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20 transition-all">
                    <Chat />
                </div>
            )}

            {/* Controls */}
            <MeetingControls
                onLeave={onLeave}
                onEnd={isHost ? handleEndMeeting : undefined}
                onToggleChat={() => setShowChat(!showChat)}
                isChatOpen={showChat}
                isRecording={isRecording}
                onToggleRecording={handleToggleRecording}
                isHost={isHost}
            />

            {/* Audio */}
            <RoomAudioRenderer />
        </div>
    );
}

function PaginatedGrid({ tracks }: { tracks: any[] }) {
    const [page, setPage] = useState(0);
    const pageSize = 9;
    const totalPages = Math.ceil(tracks.length / pageSize);

    // Reset page if tracks change and we are out of bounds
    const safePage = page >= totalPages && totalPages > 0 ? totalPages - 1 : page;

    const visibleTracks = tracks.slice(safePage * pageSize, (safePage + 1) * pageSize);

    return (
        <div className="flex-1 h-full w-full relative group">
            <GridLayout tracks={visibleTracks} className="h-full w-full">
                <ParticipantTile />
            </GridLayout>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <>
                    {safePage > 0 && (
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-all opacity-0 group-hover:opacity-100 z-50"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {safePage < totalPages - 1 && (
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-all opacity-0 group-hover:opacity-100 z-50"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Page Indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === safePage ? "bg-white w-4" : "bg-white/30 hover:bg-white/50"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
