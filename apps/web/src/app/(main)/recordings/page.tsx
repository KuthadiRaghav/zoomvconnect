"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/lib/store";

interface Transcript {
    summary: string | null;
    actionItems: unknown[] | null;
    keywords: string[];
}

interface Recording {
    id: string;
    meetingId: string;
    status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
    videoUrl: string | null;
    duration: number | null;
    createdAt: string;
    meeting: {
        title: string;
        scheduledStart: string | null;
    };
    transcript?: Transcript | null;
}

export default function RecordingsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [summaryModal, setSummaryModal] = useState<{ recording: Recording; transcript: Transcript } | null>(null);
    const [summarizing, setSummarizing] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        fetch("/api/v1/recordings", { credentials: "include" })
            .then((res) => {
                if (res.status === 401) { router.push("/login"); return null; }
                return res.json();
            })
            .then((data) => {
                if (data) setRecordings(data.items ?? data);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [isAuthenticated, router]);

    const filteredRecordings = useMemo(() => {
        return recordings
            .filter((rec) =>
                rec.meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
            });
    }, [recordings, searchQuery, sortOrder]);

    const handleSummarize = async (rec: Recording) => {
        setSummarizing(rec.id);
        try {
            const res = await fetch(`/api/v1/recordings/${rec.id}/summarize`, {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) {
                const transcript: Transcript = await res.json();
                setRecordings((prev) =>
                    prev.map((r) => (r.id === rec.id ? { ...r, transcript } : r))
                );
                setSummaryModal({ recording: rec, transcript });
            }
        } catch { /* silent */ }
        setSummarizing(null);
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1 }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Recording Studio</h1>
                    <p className="text-gray-400">Manage and watch your past meetings.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search recordings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 bg-gray-900 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                        <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                        className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full rounded-2xl" />
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filteredRecordings.length > 0 ? (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <AnimatePresence>
                        {filteredRecordings.map((rec) => (
                            <motion.div
                                key={rec.id}
                                variants={item}
                                layout
                                whileHover={{ y: -5 }}
                                className="group relative bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary-900/10 transition-all"
                            >
                                {/* Thumbnail / Placeholder */}
                                <div className="aspect-video bg-gray-800 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-110 transition-transform duration-500" />

                                    {rec.status === "READY" && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                            <a
                                                href={rec.videoUrl || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:scale-110 transition-transform"
                                            >
                                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            </a>
                                        </div>
                                    )}

                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md border ${rec.status === "READY" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                            rec.status === "PROCESSING" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                                "bg-red-500/20 text-red-400 border-red-500/30"
                                            }`}>
                                            {rec.status}
                                        </span>
                                    </div>

                                    {rec.duration && (
                                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
                                            {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, "0")}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-primary-400 transition-colors">
                                        {rec.meeting.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span>{new Date(rec.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                                        <span>•</span>
                                        <span>{new Date(rec.createdAt).toLocaleTimeString(undefined, { timeStyle: "short" })}</span>
                                    </div>

                                    {/* AI Summary actions */}
                                    <div className="flex gap-2">
                                        {rec.transcript?.summary ? (
                                            <button
                                                onClick={() => setSummaryModal({ recording: rec, transcript: rec.transcript! })}
                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg border border-primary-500/20 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                View Summary
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSummarize(rec)}
                                                disabled={summarizing === rec.id || rec.status !== "READY"}
                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg border border-violet-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {summarizing === rec.id ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                                        Summarizing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        AI Summary
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24"
                >
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No recordings found</h3>
                    <p className="text-gray-400">Try adjusting your search or filters.</p>
                </motion.div>
            )}

            {/* AI Summary Modal */}
            <AnimatePresence>
                {summaryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSummaryModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 bg-violet-500 rounded-full" />
                                        <span className="text-xs text-violet-400 font-bold uppercase tracking-wider">AI Summary</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white">{summaryModal.recording.meeting.title}</h2>
                                </div>
                                <button
                                    onClick={() => setSummaryModal(null)}
                                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {summaryModal.transcript.summary && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
                                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                                        {summaryModal.transcript.summary}
                                    </p>
                                </div>
                            )}

                            {Array.isArray(summaryModal.transcript.actionItems) && summaryModal.transcript.actionItems.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Action Items</h3>
                                    <ul className="space-y-2">
                                        {(summaryModal.transcript.actionItems as string[]).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                <div className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-3 h-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {summaryModal.transcript.keywords?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Keywords</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {summaryModal.transcript.keywords.map((kw) => (
                                            <span key={kw} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-white/10">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
