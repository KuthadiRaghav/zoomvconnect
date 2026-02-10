"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { WeekView } from "@/components/dashboard/WeekView";

interface Meeting {
    id: string;
    title: string;
    scheduledStart: string | Date;
    scheduledEnd: string | Date;
    status: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState("Guest");

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }

        // Fetch user profile
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.name) setUserName(data.name);
            })
            .catch(console.error);

        // Fetch meetings
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setMeetings(data.items || []);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setIsLoading(false);
            });
    }, [router]);

    const handleNewMeeting = async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/meetings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: "Instant Meeting",
                    type: "INSTANT",
                }),
            });

            const meeting = await response.json();
            router.push(`/meeting/${meeting.id}`);
        } catch (error) {
            console.error("Failed to create meeting:", error);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {userName}</h1>
                    <p className="text-gray-400">Here's your schedule for the week.</p>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <motion.div variants={item}>
                    <button
                        onClick={handleNewMeeting}
                        className="w-full flex flex-col items-start p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl relative overflow-hidden group shadow-lg shadow-blue-900/20 hover:shadow-2xl transition-all"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white border border-white/20"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </motion.div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white">New Meeting</h3>
                            <p className="text-blue-100/70 text-sm mt-1">Start instant</p>
                        </div>
                    </button>
                </motion.div>

                {[
                    { title: "Join", subtitle: "Via code", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", href: "/join", color: "text-emerald-400 group-hover:text-emerald-300" },
                    { title: "Schedule", subtitle: "Plan ahead", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", href: "/schedule", color: "text-purple-400 group-hover:text-purple-300" },
                    { title: "Recordings", subtitle: "Past sessions", icon: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z", href: "/recordings", color: "text-orange-400 group-hover:text-orange-300" }
                ].map((action) => (
                    <motion.div variants={item} key={action.title}>
                        <Link
                            href={action.href}
                            className="block h-full p-6 bg-gray-900/50 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-3xl transition-all hover:bg-gray-800/50 group"
                        >
                            <div className="flex flex-col h-full justify-between">
                                <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-400 group-hover:bg-gray-700 transition-colors">
                                    <svg className={`w-6 h-6 ${action.color} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:translate-x-1 transition-transform">{action.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{action.subtitle}</p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {/* Calendar Week View */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                {isLoading ? (
                    <div className="w-full h-64 bg-gray-900/50 rounded-3xl animate-pulse" />
                ) : (
                    <WeekView meetings={meetings} />
                )}
            </motion.div>
        </div>
    );
}
