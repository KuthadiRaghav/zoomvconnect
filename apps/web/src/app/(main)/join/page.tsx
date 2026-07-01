"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MeetingPreview {
    id: string;
    title: string;
    roomName: string;
    host: { name: string | null };
    requiresPasscode: boolean;
}

type Step = "lookup" | "passcode" | "joining";

export default function JoinPage() {
    const router = useRouter();
    const [alias, setAlias] = useState("");
    const [passcode, setPasscode] = useState("");
    const [step, setStep] = useState<Step>("lookup");
    const [meeting, setMeeting] = useState<MeetingPreview | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!alias.trim()) return;

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(
                `/api/v1/meetings/lookup?alias=${encodeURIComponent(alias.trim())}`,
                { credentials: "include" }
            );

            if (res.status === 401) { router.push("/login"); return; }
            if (res.status === 404) throw new Error("Meeting not found. Check the ID and try again.");
            if (!res.ok) throw new Error("Failed to look up meeting.");

            const data: MeetingPreview = await res.json();
            setMeeting(data);

            // If passcode required, go to passcode step; otherwise join directly
            if (data.requiresPasscode) {
                setStep("passcode");
            } else {
                await joinMeeting(data.id, "");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const joinMeeting = async (meetingId: string, pc: string) => {
        setStep("joining");
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/v1/meetings/${meetingId}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ passcode: pc || undefined }),
            });

            if (res.status === 401) { router.push("/login"); return; }
            if (res.status === 403) throw new Error("Incorrect passcode.");
            if (res.status === 400) throw new Error("Meeting has already ended.");
            if (!res.ok) throw new Error("Failed to join meeting.");

            router.push(`/meeting/${meetingId}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to join.");
            setStep(meeting?.requiresPasscode ? "passcode" : "lookup");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasscodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!meeting) return;
        await joinMeeting(meeting.id, passcode);
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-4">
            <div className="w-full max-w-md">

                {/* Step: lookup */}
                {step === "lookup" && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-1">Join a Meeting</h1>
                            <p className="text-gray-400 text-sm">Enter a meeting ID or room name.</p>
                        </div>

                        <form onSubmit={handleLookup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Meeting ID or Room Name
                                </label>
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={(e) => setAlias(e.target.value)}
                                    placeholder="e.g. alpha-bravo-charlie"
                                    className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !alias.trim()}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/20"
                            >
                                {isLoading ? "Looking up…" : "Continue"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step: passcode */}
                {step === "passcode" && meeting && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6">
                        {/* Meeting preview */}
                        <div className="bg-gray-900/60 rounded-xl p-4 flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-semibold truncate">{meeting.title}</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    Hosted by {meeting.host?.name ?? "Unknown"} · <span className="font-mono">{meeting.roomName}</span>
                                </p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Enter Passcode</h2>
                            <p className="text-gray-400 text-sm">This meeting requires a passcode to join.</p>
                        </div>

                        <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="Meeting passcode"
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono tracking-widest text-center text-lg placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-600"
                                autoFocus
                                required
                            />

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setStep("lookup"); setError(""); setPasscode(""); }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !passcode}
                                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-primary-900/20"
                                >
                                    {isLoading ? "Joining…" : "Join"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step: joining */}
                {step === "joining" && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl text-center space-y-4">
                        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-white font-medium">Joining meeting…</p>
                        {meeting && (
                            <p className="text-gray-400 text-sm">{meeting.title}</p>
                        )}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
