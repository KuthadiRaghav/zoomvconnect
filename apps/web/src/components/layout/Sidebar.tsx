"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const SidebarItem = ({
    href,
    icon,
    label,
    active,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
}) => {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                ? "bg-primary-600 shadow-lg shadow-primary-900/50 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
        >
            <div className={`w-5 h-5 ${active ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                {icon}
            </div>
            <span className="font-medium">{label}</span>
            {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
        </Link>
    );
};

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (path: string) => pathname === path;

    const handleLogout = () => {
        // ... logout logic ...
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.push("/login");
    };

    return (
        <aside
            className={`w-64 h-screen fixed left-0 top-0 bg-gray-950/80 backdrop-blur-2xl border-r border-white/5 flex flex-col p-6 z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "hidden lg:flex"
                }`}
        >
            {/* Logo */}
            <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        VConnect
                    </span>
                </div>
                {/* Close button for mobile */}
                <button
                    onClick={onClose}
                    className="lg:hidden p-1 text-gray-400 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {/* ... nav items ... */}
                <SidebarItem
                    href="/dashboard"
                    active={isActive("/dashboard")}
                    label="Dashboard"
                    icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                    }
                />
                <SidebarItem
                    href="/schedule"
                    active={isActive("/schedule")}
                    label="Schedule"
                    icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    }
                />
                <SidebarItem
                    href="/join"
                    active={isActive("/join")}
                    label="Join Meeting"
                    icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                    }
                />
                <SidebarItem
                    href="/recordings"
                    active={isActive("/recordings")}
                    label="Recordings"
                    icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                        </svg>
                    }
                />
            </nav>

            {/* Bottom Section */}
            <div className="pt-6 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border-2 border-gray-900 group-hover:border-white/20 transition-colors" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">My Profile</p>
                        <p className="text-xs text-gray-500 truncate">Sign out</p>
                    </div>
                </button>
            </div>
        </aside>
    );
}
