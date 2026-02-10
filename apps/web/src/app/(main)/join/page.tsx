"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
    const router = useRouter();
    const [alias, setAlias] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!alias.trim()) return;

        setIsLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("accessToken");
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings/lookup?alias=${encodeURIComponent(alias)}`, {
                headers,
            });

            if (!res.ok) {
                if (res.status === 404) throw new Error("Meeting not found");
                throw new Error("Failed to lookup meeting");
            }

            const meeting = await res.json();
            router.push(`/meeting/${meeting.id}`);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-2">Join Meeting</h1>
                <p className="text-gray-400 mb-6">Enter a meeting ID or alias</p>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Meeting ID or Alias
                        </label>
                        <input
                            type="text"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            placeholder="e.g. alpha-bravo-charlie"
                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
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
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/20"
                    >
                        {isLoading ? "Looking up..." : "Join"}
                    </button>
                </form>
            </div>
        </div>
    );
}
