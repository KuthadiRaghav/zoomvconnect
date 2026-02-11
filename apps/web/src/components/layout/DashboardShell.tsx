"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-primary-500/30">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content */}
            <main className={`min-h-screen transition-all duration-300 ${isSidebarOpen ? '' : ''
                } lg:pl-64 pl-0`}>

                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between p-4 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <span className="text-lg font-bold text-white">VConnect</span>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">V</span>
                    </div>
                </header>

                <div className="p-4 lg:p-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
