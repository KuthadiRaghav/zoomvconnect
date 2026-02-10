"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";

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
}

export default function RecordingsPage() {
    const router = useRouter();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings/recordings/list`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setRecordings(data);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setIsLoading(false);
            });
    }, [router]);

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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
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
                                    {/* Gradient Placeholder if no thumb */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-110 transition-transform duration-500" />

                                    {/* Play Overlay */}
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

                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md border ${rec.status === "READY" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                                rec.status === "PROCESSING" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                                    "bg-red-500/20 text-red-400 border-red-500/30"
                                            }`}>
                                            {rec.status}
                                        </span>
                                    </div>

                                    {/* Duration Badge */}
                                    {rec.duration && (
                                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
                                            {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-primary-400 transition-colors">
                                        {rec.meeting.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span>{new Date(rec.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                        <span>•</span>
                                        <span>{new Date(rec.createdAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}</span>
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
        </div>
    );
}
