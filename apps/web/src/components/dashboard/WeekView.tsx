"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Meeting {
    id: string;
    title: string;
    scheduledStart: string | Date;
    scheduledEnd: string | Date;
}

interface WeekViewProps {
    meetings: Meeting[];
}

export function WeekView({ meetings }: WeekViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const getMeetingsForDay = (day: Date) => {
        return meetings.filter((meeting) =>
            isSameDay(new Date(meeting.scheduledStart), day)
        );
    };

    return (
        <div className="w-full bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Schedule</h2>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span className="capitalize">{format(startDate, "MMMM yyyy")}</span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
                {weekDays.map((day, index) => {
                    const dayMeetings = getMeetingsForDay(day);
                    const isCurrentDay = isToday(day);

                    return (
                        <div key={index} className="flex flex-col gap-3">
                            {/* Day Header */}
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-2xl transition-all",
                                    isCurrentDay
                                        ? "bg-primary-600 text-white shadow-lg shadow-primary-900/20"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <span className="text-xs font-medium uppercase opacity-70">
                                    {format(day, "EEE")}
                                </span>
                                <span className="text-lg font-bold">
                                    {format(day, "d")}
                                </span>
                            </div>

                            {/* Meetings Column */}
                            <div className="flex flex-col gap-2 min-h-[200px] p-2 bg-black/20 rounded-2xl border border-white/5">
                                {dayMeetings.length > 0 ? (
                                    dayMeetings.map((meeting) => (
                                        <motion.div
                                            key={meeting.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.02 }}
                                            className="p-2 bg-gray-800/80 rounded-xl border-l-2 border-primary-500 text-xs cursor-pointer hover:bg-gray-800 shadow-sm group"
                                        >
                                            <p className="font-semibold text-white truncate group-hover:text-primary-300 transition-colors">
                                                {meeting.title}
                                            </p>
                                            <p className="text-gray-500 mt-1">
                                                {format(new Date(meeting.scheduledStart), "HH:mm")}
                                            </p>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-1 h-1 rounded-full bg-gray-800" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
