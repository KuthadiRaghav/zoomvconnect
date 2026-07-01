"use client";

import { useParticipants, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Participant, ParticipantEvent, RoomEvent } from "livekit-client";
import { useState, useEffect } from "react";

interface ParticipantsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isHost: boolean;
}

export function ParticipantsPanel({ isOpen, onClose, isHost }: ParticipantsPanelProps) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const [search, setSearch] = useState("");

    if (!isOpen) return null;

    const allParticipants = [localParticipant, ...participants.filter((p) => p.identity !== localParticipant.identity)];
    const filtered = search.trim()
        ? allParticipants.filter((p) => (p.name || p.identity).toLowerCase().includes(search.toLowerCase()))
        : allParticipants;

    const handleMuteAll = () => {
        // Sends a mute request via LiveKit (remote participants can accept or reject)
        participants.forEach((p) => {
            if (p.identity !== localParticipant.identity) {
                room.localParticipant.publishData(
                    new TextEncoder().encode(JSON.stringify({ type: "MUTE_REQUEST", target: p.identity })),
                    { reliable: true }
                );
            }
        });
    };

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                    <h2 className="text-white font-semibold">Participants</h2>
                    <p className="text-gray-400 text-xs mt-0.5">{allParticipants.length} in meeting</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/5">
                <div className="relative">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search participants…"
                        className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 pl-8 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Host controls */}
            {isHost && participants.length > 0 && (
                <div className="px-3 py-2 border-b border-white/5">
                    <button
                        onClick={handleMuteAll}
                        className="w-full py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Mute all participants
                    </button>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filtered.map((participant) => (
                    <ParticipantRow
                        key={participant.identity}
                        participant={participant}
                        isLocal={participant.identity === localParticipant.identity}
                        isHost={isHost}
                    />
                ))}
                {filtered.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">No participants found.</p>
                )}
            </div>
        </div>
    );
}

function ParticipantRow({
    participant,
    isLocal,
    isHost,
}: {
    participant: Participant;
    isLocal: boolean;
    isHost: boolean;
}) {
    const [, forceUpdate] = useState(0);
    const meta = participant.metadata ? (() => { try { return JSON.parse(participant.metadata); } catch { return {}; } })() : {};
    const role: string = meta.role ?? "ATTENDEE";

    // Re-render on track/permission changes
    useEffect(() => {
        const cb = () => forceUpdate((n) => n + 1);
        participant.on(ParticipantEvent.TrackMuted, cb);
        participant.on(ParticipantEvent.TrackUnmuted, cb);
        participant.on(ParticipantEvent.ParticipantMetadataChanged, cb);
        return () => {
            participant.off(ParticipantEvent.TrackMuted, cb);
            participant.off(ParticipantEvent.TrackUnmuted, cb);
            participant.off(ParticipantEvent.ParticipantMetadataChanged, cb);
        };
    }, [participant]);

    const isMuted = !participant.isMicrophoneEnabled;
    const isCameraOff = !participant.isCameraEnabled;
    const isHandRaised = meta.handRaised === true;
    const displayName = participant.name || participant.identity;

    const roleColor = role === "HOST" ? "text-primary-400" : role === "COHOST" ? "text-blue-400" : "text-gray-500";
    const roleLabel = role === "HOST" ? "Host" : role === "COHOST" ? "Co-host" : null;

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/40 to-accent-600/40 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white">
                {displayName[0]?.toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm text-white truncate">
                        {displayName}{isLocal && <span className="text-gray-500"> (you)</span>}
                    </span>
                    {isHandRaised && (
                        <span title="Hand raised">✋</span>
                    )}
                </div>
                {roleLabel && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${roleColor}`}>
                        {roleLabel}
                    </span>
                )}
            </div>

            {/* Status icons */}
            <div className="flex items-center gap-1.5">
                {isMuted ? (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
                {isCameraOff ? (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </div>
        </div>
    );
}
