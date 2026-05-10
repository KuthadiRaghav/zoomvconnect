"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WaitingParticipant {
    id: string;
    user: { id: string; name: string | null; email: string; avatarUrl: string | null } | null;
    guestName: string | null;
    createdAt: string;
}

interface Props {
    meetingId: string;
    isOpen: boolean;
    onClose: () => void;
}

const POLL_MS = 4000;

export function WaitingRoomPanel({ meetingId, isOpen, onClose }: Props) {
    const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [admitting, setAdmitting] = useState<Set<string>>(new Set());
    const [denying, setDenying] = useState<Set<string>>(new Set());
    const [isAdmittingAll, setIsAdmittingAll] = useState(false);

    const fetchWaiting = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/meetings/${meetingId}/waiting-room`, { credentials: "include" });
            if (res.ok) setWaiting(await res.json());
        } catch { /* ignore */ }
    }, [meetingId]);

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        fetchWaiting().finally(() => setIsLoading(false));
        const id = setInterval(fetchWaiting, POLL_MS);
        return () => clearInterval(id);
    }, [isOpen, fetchWaiting]);

    const admit = async (participantId: string) => {
        setAdmitting((s) => new Set(s).add(participantId));
        try {
            await fetch(`/api/v1/meetings/${meetingId}/waiting-room/${participantId}/admit`, {
                method: "POST",
                credentials: "include",
            });
            setWaiting((prev) => prev.filter((p) => p.id !== participantId));
        } finally {
            setAdmitting((s) => { const n = new Set(s); n.delete(participantId); return n; });
        }
    };

    const deny = async (participantId: string) => {
        setDenying((s) => new Set(s).add(participantId));
        try {
            await fetch(`/api/v1/meetings/${meetingId}/waiting-room/${participantId}/deny`, {
                method: "POST",
                credentials: "include",
            });
            setWaiting((prev) => prev.filter((p) => p.id !== participantId));
        } finally {
            setDenying((s) => { const n = new Set(s); n.delete(participantId); return n; });
        }
    };

    const admitAll = async () => {
        setIsAdmittingAll(true);
        try {
            await fetch(`/api/v1/meetings/${meetingId}/waiting-room/admit-all`, {
                method: "POST",
                credentials: "include",
            });
            setWaiting([]);
        } finally {
            setIsAdmittingAll(false);
        }
    };

    const displayName = (p: WaitingParticipant) => p.user?.name ?? p.guestName ?? "Guest";

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
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {waiting.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                                        {waiting.length > 9 ? "9+" : waiting.length}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-sm">Waiting Room</h2>
                                <p className="text-gray-500 text-xs">{waiting.length} waiting</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Admit All */}
                    {waiting.length > 1 && (
                        <div className="px-4 py-3 border-b border-white/5">
                            <button
                                onClick={admitAll}
                                disabled={isAdmittingAll}
                                className="w-full py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isAdmittingAll ? "Admitting all…" : `Admit All (${waiting.length})`}
                            </button>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading && waiting.length === 0 ? (
                            <div className="p-4 space-y-3">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : waiting.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                                <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-400 text-sm font-medium">No one waiting</p>
                                <p className="text-gray-600 text-xs mt-1">Participants will appear here.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                <AnimatePresence>
                                    {waiting.map((p) => (
                                        <motion.div
                                            key={p.id}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                            className="bg-gray-900/60 border border-white/5 rounded-xl p-3 flex items-center gap-3"
                                        >
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-primary-600/20 flex items-center justify-center shrink-0 text-primary-400 font-semibold text-sm">
                                                {displayName(p)[0]?.toUpperCase() ?? "?"}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{displayName(p)}</p>
                                                {p.user?.email && (
                                                    <p className="text-gray-500 text-xs truncate">{p.user.email}</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => admit(p.id)}
                                                    disabled={admitting.has(p.id)}
                                                    className="px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                    title="Admit"
                                                >
                                                    {admitting.has(p.id) ? "…" : "Admit"}
                                                </button>
                                                <button
                                                    onClick={() => deny(p.id)}
                                                    disabled={denying.has(p.id)}
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Deny"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
