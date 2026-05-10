"use client";

import { useState, useEffect, useCallback } from "react";

interface PollResult {
    label: string;
    count: number;
    percentage: number;
}

interface Poll {
    id: string;
    question: string;
    options: string[];
    isOpen: boolean;
    closedAt: string | null;
    createdAt: string;
    totalVotes: number;
    results: PollResult[];
}

interface PollPanelProps {
    meetingId: string;
    isHost: boolean;
    isOpen: boolean;
    onClose: () => void;
}

export function PollPanel({ meetingId, isHost, isOpen, onClose }: PollPanelProps) {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set());
    const [showCreate, setShowCreate] = useState(false);
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [creating, setCreating] = useState(false);

    const fetchPolls = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/meetings/${meetingId}/polls`, {
                credentials: "include",
            });
            if (res.ok) setPolls(await res.json());
        } catch { /* silent */ }
    }, [meetingId]);

    useEffect(() => {
        if (!isOpen) return;
        fetchPolls();
        const id = setInterval(fetchPolls, 5000);
        return () => clearInterval(id);
    }, [isOpen, fetchPolls]);

    const handleVote = async (pollId: string, optionIndex: number) => {
        try {
            const res = await fetch(`/api/v1/meetings/${meetingId}/polls/${pollId}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ optionIndex }),
            });
            if (res.ok) {
                setVotedPollIds((prev) => new Set([...prev, pollId]));
                fetchPolls();
            }
        } catch { /* silent */ }
    };

    const handleClose = async (pollId: string) => {
        try {
            await fetch(`/api/v1/meetings/${meetingId}/polls/${pollId}/close`, {
                method: "POST",
                credentials: "include",
            });
            fetchPolls();
        } catch { /* silent */ }
    };

    const handleCreate = async () => {
        const validOptions = options.filter((o) => o.trim());
        if (!question.trim() || validOptions.length < 2) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/v1/meetings/${meetingId}/polls`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ question: question.trim(), options: validOptions }),
            });
            if (res.ok) {
                setQuestion("");
                setOptions(["", ""]);
                setShowCreate(false);
                fetchPolls();
            }
        } catch { /* silent */ }
        setCreating(false);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20 flex flex-col pt-16 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                <h2 className="text-white font-semibold text-sm">Polls & Q&amp;A</h2>
                <div className="flex items-center gap-2">
                    {isHost && (
                        <button
                            onClick={() => setShowCreate(!showCreate)}
                            className="text-xs px-2 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                        >
                            {showCreate ? "Cancel" : "+ New Poll"}
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Create Poll Form */}
            {showCreate && (
                <div className="p-4 border-b border-white/10 bg-gray-800/50 flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Ask a question..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 mb-3 outline-none border border-white/10 focus:border-primary-500 placeholder-gray-500"
                    />
                    <div className="space-y-2 mb-3">
                        {options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder={`Option ${i + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                        const next = [...options];
                                        next[i] = e.target.value;
                                        setOptions(next);
                                    }}
                                    className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none border border-white/10 focus:border-primary-500 placeholder-gray-500"
                                />
                                {options.length > 2 && (
                                    <button
                                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {options.length < 10 && (
                            <button
                                onClick={() => setOptions([...options, ""])}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                + Add option
                            </button>
                        )}
                        <button
                            onClick={handleCreate}
                            disabled={creating || !question.trim() || options.filter((o) => o.trim()).length < 2}
                            className="ml-auto text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            {creating ? "Launching..." : "Launch Poll"}
                        </button>
                    </div>
                </div>
            )}

            {/* Polls List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {polls.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center mt-8">
                        {isHost ? "Create a poll to get started" : "No polls yet"}
                    </p>
                ) : (
                    polls.map((poll) => (
                        <PollCard
                            key={poll.id}
                            poll={poll}
                            isHost={isHost}
                            hasVoted={votedPollIds.has(poll.id)}
                            onVote={(idx) => handleVote(poll.id, idx)}
                            onClose={() => handleClose(poll.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function PollCard({
    poll,
    isHost,
    hasVoted,
    onVote,
    onClose,
}: {
    poll: Poll;
    isHost: boolean;
    hasVoted: boolean;
    onVote: (idx: number) => void;
    onClose: () => void;
}) {
    const showResults = hasVoted || !poll.isOpen;

    return (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-white/5">
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-white text-sm font-medium leading-snug">{poll.question}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {poll.isOpen ? (
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 font-bold uppercase">
                            Live
                        </span>
                    ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full font-bold uppercase">
                            Closed
                        </span>
                    )}
                    {isHost && poll.isOpen && (
                        <button
                            onClick={onClose}
                            className="text-[10px] text-red-400 hover:text-red-300"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            {showResults ? (
                <div className="space-y-2">
                    {poll.results.map((r, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>{r.label}</span>
                                <span>{r.percentage}% ({r.count})</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${r.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    <p className="text-[11px] text-gray-500 mt-2">{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {poll.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onVote(i)}
                            className="w-full text-left text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 border border-white/5 hover:border-primary-500/50 transition-all"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
