"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SchedulePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        scheduledStart: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // Now + 1h
        waitingRoom: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const startDate = new Date(formData.scheduledStart);
            if (isNaN(startDate.getTime())) {
                throw new Error("Invalid start time");
            }

            const res = await fetch("/api/v1/meetings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    scheduledStart: startDate.toISOString(),
                    type: "SCHEDULED",
                    waitingRoom: formData.waitingRoom,
                }),
            });

            if (!res.ok) throw new Error("Failed to schedule meeting");

            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            alert("Failed to schedule meeting");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-6">
            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-6">Schedule Meeting</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Topic
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Meeting Topic"
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                            rows={3}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Start Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.scheduledStart}
                            onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none [color-scheme:dark] transition-colors"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="waitingRoom"
                            checked={formData.waitingRoom}
                            onChange={(e) => setFormData({ ...formData, waitingRoom: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-900/50 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="waitingRoom" className="text-sm text-gray-300">
                            Enable Waiting Room
                        </label>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-primary-900/20"
                        >
                            {isLoading ? "Scheduling..." : "Schedule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
