"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Participant {
    id: string;
    role: string;
    user: { id: string; name: string | null } | null;
    guestName: string | null;
}

interface BreakoutRoom {
    id: string;
    name: string;
    roomName: string;
    endsAt: string | null;
    participants: Participant[];
}

interface Props {
    meetingId: string;
    isOpen: boolean;
    onClose: () => void;
    allParticipants: { id: string; name: string }[];
}

export function BreakoutRoomPanel({ meetingId, isOpen, onClose, allParticipants }: Props) {
    const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    // Create form state
    const [newRoomCount, setNewRoomCount] = useState(2);
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [autoAssign, setAutoAssign] = useState(true);

    // Drag-assign state: which room is being dragged into
    const [dragTarget, setDragTarget] = useState<string | null>(null);

    const apiBase = "/api/v1";

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms`, { credentials: "include" });
            if (res.ok) setRooms(await res.json());
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchRooms();
    }, [isOpen, meetingId]);

    const handleCreate = async () => {
        setIsCreating(true);
        const names = Array.from({ length: newRoomCount }, (_, i) => `Room ${i + 1}`);
        try {
            const res = await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ names, durationMinutes, autoAssign }),
            });
            if (res.ok) setRooms(await res.json());
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        const res = await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms/${roomId}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (res.ok || res.status === 204) {
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
        }
    };

    const handleAssign = async (roomId: string, participantIds: string[]) => {
        const res = await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms/${roomId}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ participantIds }),
        });
        if (res.ok) setRooms(await res.json());
    };

    const handleStartAll = async () => {
        setIsStarting(true);
        try {
            await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms/start`, {
                method: "POST",
                credentials: "include",
            });
        } finally {
            setIsStarting(false);
        }
    };

    const handleEndAll = async () => {
        setIsEnding(true);
        try {
            const res = await fetch(`${apiBase}/meetings/${meetingId}/breakout-rooms/end`, {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) setRooms([]);
        } finally {
            setIsEnding(false);
        }
    };

    const unassignedParticipants = allParticipants.filter(
        (p) => !rooms.some((r) => r.participants.some((rp) => rp.id === p.id))
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 250 }}
                    className="fixed right-0 top-0 h-full w-80 bg-gray-950 border-l border-white/10 z-40 flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                        <div>
                            <h2 className="text-white font-semibold text-sm">Breakout Rooms</h2>
                            <p className="text-gray-500 text-xs mt-0.5">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* Create rooms section */}
                        {rooms.length === 0 && (
                            <div className="p-4 space-y-4 border-b border-white/5">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Create Rooms</p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-400">Number of rooms</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setNewRoomCount(Math.max(1, newRoomCount - 1))}
                                                className="w-6 h-6 rounded bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors flex items-center justify-center"
                                            >−</button>
                                            <span className="text-white text-sm w-6 text-center">{newRoomCount}</span>
                                            <button
                                                onClick={() => setNewRoomCount(Math.min(20, newRoomCount + 1))}
                                                className="w-6 h-6 rounded bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors flex items-center justify-center"
                                            >+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-400">Duration (min)</label>
                                        <select
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                            className="bg-gray-800 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                        >
                                            {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                                                <option key={m} value={m}>{m} min</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-400">Auto-assign participants</label>
                                        <button
                                            onClick={() => setAutoAssign(!autoAssign)}
                                            className={`relative inline-flex h-4 w-8 rounded-full transition-colors ${autoAssign ? "bg-primary-600" : "bg-gray-700"}`}
                                        >
                                            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform mt-0.5 ${autoAssign ? "translate-x-4" : "translate-x-0.5"}`} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? "Creating…" : `Create ${newRoomCount} Room${newRoomCount > 1 ? "s" : ""}`}
                                </button>
                            </div>
                        )}

                        {/* Unassigned participants */}
                        {rooms.length > 0 && unassignedParticipants.length > 0 && (
                            <div className="p-4 border-b border-white/5">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Unassigned ({unassignedParticipants.length})</p>
                                <div className="space-y-1">
                                    {unassignedParticipants.map((p) => (
                                        <div
                                            key={p.id}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData("participantId", p.id)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-900 cursor-grab active:cursor-grabbing"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                                                {(p.name ?? "?")[0].toUpperCase()}
                                            </div>
                                            <span className="text-xs text-gray-300 truncate">{p.name ?? "Guest"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Room list */}
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-20 bg-gray-900 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {rooms.map((room) => (
                                    <div
                                        key={room.id}
                                        onDragOver={(e) => { e.preventDefault(); setDragTarget(room.id); }}
                                        onDragLeave={() => setDragTarget(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const pid = e.dataTransfer.getData("participantId");
                                            if (pid) handleAssign(room.id, [pid]);
                                            setDragTarget(null);
                                        }}
                                        className={`rounded-xl border transition-colors p-3 space-y-2 ${dragTarget === room.id ? "border-primary-500 bg-primary-500/10" : "border-white/5 bg-gray-900/50"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-white">{room.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                {room.endsAt && (
                                                    <span className="text-xs text-gray-500">
                                                        {Math.max(0, Math.round((new Date(room.endsAt).getTime() - Date.now()) / 60000))}m left
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {room.participants.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {room.participants.map((p) => (
                                                    <span key={p.id} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                                                        {p.user?.name ?? p.guestName ?? "Guest"}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-600 italic">Drag participants here</p>
                                        )}
                                    </div>
                                ))}

                                {rooms.length > 0 && (
                                    <button
                                        onClick={handleCreate}
                                        className="w-full py-1.5 border border-dashed border-white/10 hover:border-white/20 text-gray-500 hover:text-gray-300 text-xs rounded-lg transition-colors"
                                    >
                                        + Add More Rooms
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    {rooms.length > 0 && (
                        <div className="p-4 border-t border-white/10 space-y-2">
                            <button
                                onClick={handleStartAll}
                                disabled={isStarting}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isStarting ? "Starting…" : "Open All Rooms"}
                            </button>
                            <button
                                onClick={handleEndAll}
                                disabled={isEnding}
                                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isEnding ? "Closing…" : "Close All & Return"}
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
