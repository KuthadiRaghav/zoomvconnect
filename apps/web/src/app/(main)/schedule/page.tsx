"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { meetingsApi } from "@/lib/api";

type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly";

interface FormState {
    title: string;
    description: string;
    scheduledStart: string;
    durationMinutes: number;
    waitingRoom: boolean;
    passcode: string;
    enablePasscode: boolean;
    recurrence: RecurrenceFreq;
    recurrenceInterval: number;
    recurrenceCount: number;
}

function addMinutes(isoLocal: string, minutes: number): string {
    const d = new Date(isoLocal);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString().slice(0, 16);
}

function localNowPlus(minutes: number): string {
    const d = new Date(Date.now() + minutes * 60000);
    // Shift to local ISO without timezone offset
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function SchedulePage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState<FormState>({
        title: "",
        description: "",
        scheduledStart: localNowPlus(60),
        durationMinutes: 60,
        waitingRoom: false,
        passcode: "",
        enablePasscode: false,
        recurrence: "none",
        recurrenceInterval: 1,
        recurrenceCount: 4,
    });

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) { router.push("/login"); return; }

        setIsLoading(true);
        setError("");

        try {
            const startDate = new Date(form.scheduledStart);
            if (isNaN(startDate.getTime())) throw new Error("Invalid start time");

            const endDate = new Date(startDate.getTime() + form.durationMinutes * 60000);

            await meetingsApi.create({
                title: form.title,
                description: form.description || undefined,
                scheduledStart: startDate.toISOString(),
                scheduledEnd: endDate.toISOString(),
                type: form.recurrence !== "none" ? "RECURRING" : "SCHEDULED",
                waitingRoom: form.waitingRoom,
                passcode: form.enablePasscode && form.passcode ? form.passcode : undefined,
                ...(form.recurrence !== "none" && {
                    recurrenceRule: {
                        frequency: form.recurrence,
                        interval: form.recurrenceInterval,
                        count: form.recurrenceCount,
                    },
                }),
            } as Parameters<typeof meetingsApi.create>[0]);

            setSuccess(true);
            setTimeout(() => router.push("/dashboard"), 1800);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to schedule meeting");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Meeting Scheduled!</h2>
                    <p className="text-gray-400">Redirecting to dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-6">
            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-1">Schedule Meeting</h1>
                <p className="text-gray-400 text-sm mb-8">Set up a one-time or recurring meeting.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Topic */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Topic *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => set("title", e.target.value)}
                            placeholder="Meeting topic"
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors placeholder:text-gray-600"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            placeholder="Optional description or agenda"
                            rows={3}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors placeholder:text-gray-600 resize-none"
                        />
                    </div>

                    {/* Start time + Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start Time *</label>
                            <input
                                type="datetime-local"
                                value={form.scheduledStart}
                                onChange={(e) => set("scheduledStart", e.target.value)}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none [color-scheme:dark] transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Duration</label>
                            <select
                                value={form.durationMinutes}
                                onChange={(e) => set("durationMinutes", Number(e.target.value))}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors cursor-pointer"
                            >
                                {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                                    <option key={m} value={m}>
                                        {m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">Recurrence</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(["none", "daily", "weekly", "monthly"] as RecurrenceFreq[]).map((freq) => (
                                <button
                                    key={freq}
                                    type="button"
                                    onClick={() => set("recurrence", freq)}
                                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${form.recurrence === freq
                                        ? "bg-primary-600 border-primary-500 text-white"
                                        : "bg-gray-900/50 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                                        }`}
                                >
                                    {freq === "none" ? "None" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                                </button>
                            ))}
                        </div>

                        {form.recurrence !== "none" && (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        Every
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={form.recurrenceInterval}
                                            onChange={(e) => set("recurrenceInterval", Number(e.target.value))}
                                            className="w-20 bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        />
                                        <span className="text-gray-400 text-sm">
                                            {form.recurrence === "daily" ? "day(s)" : form.recurrence === "weekly" ? "week(s)" : "month(s)"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Occurrences</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={52}
                                        value={form.recurrenceCount}
                                        onChange={(e) => set("recurrenceCount", Number(e.target.value))}
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Security */}
                    <div className="space-y-3 border border-white/5 rounded-xl p-4 bg-gray-900/30">
                        <p className="text-sm font-medium text-gray-300">Security</p>

                        <div className="flex items-center justify-between">
                            <label htmlFor="waitingRoom" className="text-sm text-gray-400 cursor-pointer">
                                Enable Waiting Room
                            </label>
                            <button
                                type="button"
                                id="waitingRoom"
                                onClick={() => set("waitingRoom", !form.waitingRoom)}
                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.waitingRoom ? "bg-primary-600" : "bg-gray-700"}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.waitingRoom ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="enablePasscode" className="text-sm text-gray-400 cursor-pointer">
                                Require Passcode
                            </label>
                            <button
                                type="button"
                                id="enablePasscode"
                                onClick={() => set("enablePasscode", !form.enablePasscode)}
                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.enablePasscode ? "bg-primary-600" : "bg-gray-700"}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.enablePasscode ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                        </div>

                        {form.enablePasscode && (
                            <input
                                type="text"
                                value={form.passcode}
                                onChange={(e) => set("passcode", e.target.value)}
                                placeholder="Enter passcode (4–20 characters)"
                                minLength={4}
                                maxLength={20}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm placeholder:text-gray-600"
                            />
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-primary-900/20"
                        >
                            {isLoading ? "Scheduling…" : form.recurrence !== "none" ? "Schedule Series" : "Schedule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
