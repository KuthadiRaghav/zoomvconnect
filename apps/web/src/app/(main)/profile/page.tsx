"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";

interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

interface UserSettings {
    defaultMicOn: boolean;
    defaultCameraOn: boolean;
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
}

type Tab = "profile" | "meeting" | "notifications";

export default function ProfilePage() {
    const router = useRouter();
    const { isAuthenticated, user, setAuth } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>("profile");

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Profile form state
    const [name, setName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    // Settings form state
    const [defaultMicOn, setDefaultMicOn] = useState(false);
    const [defaultCameraOn, setDefaultCameraOn] = useState(false);
    const [theme, setTheme] = useState("system");
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }

        Promise.all([
            fetch("/api/v1/users/me", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/v1/users/me/settings", { credentials: "include" }).then((r) => r.json()),
        ]).then(([p, s]) => {
            setProfile(p);
            setName(p.name ?? "");
            setAvatarUrl(p.avatarUrl ?? "");
            setSettings(s);
            setDefaultMicOn(s.defaultMicOn);
            setDefaultCameraOn(s.defaultCameraOn);
            setTheme(s.theme);
            setEmailNotifications(s.emailNotifications);
            setPushNotifications(s.pushNotifications);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [isAuthenticated, router]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/v1/users/me", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim() || undefined,
                    avatarUrl: avatarUrl.trim() || undefined,
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setAuth({ ...user!, name: updated.name, avatarUrl: updated.avatarUrl });
                showSaved();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/v1/users/me/settings", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ defaultMicOn, defaultCameraOn, theme, emailNotifications, pushNotifications }),
            });
            if (res.ok) {
                setSettings(await res.json());
                showSaved();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const showSaved = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const tabs: { id: Tab; label: string }[] = [
        { id: "profile", label: "Profile" },
        { id: "meeting", label: "Meeting Defaults" },
        { id: "notifications", label: "Notifications" },
    ];

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-1">Profile & Settings</h1>
                <p className="text-gray-400 text-sm">Manage your account and meeting preferences.</p>
            </motion.div>

            {/* Avatar preview */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                className="flex items-center gap-5 p-5 bg-gray-900/50 border border-white/5 rounded-2xl"
            >
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl font-bold text-white">
                            {name ? name[0].toUpperCase() : profile?.email[0].toUpperCase()}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-white font-semibold text-lg">{name || "No name set"}</p>
                    <p className="text-gray-400 text-sm">{profile?.email}</p>
                </div>
                {saved && (
                    <div className="ml-auto flex items-center gap-1.5 text-green-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                    </div>
                )}
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-900/50 rounded-xl border border-white/5">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === t.id
                                ? "bg-primary-600 text-white shadow"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
            >
                {activeTab === "profile" && (
                    <div className="space-y-5">
                        <div className="p-6 bg-gray-900/50 border border-white/5 rounded-2xl space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    maxLength={100}
                                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Avatar URL</label>
                                <input
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <p className="text-xs text-gray-500 mt-1.5">Enter a URL to an image hosted online.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                <input
                                    value={profile?.email ?? ""}
                                    disabled
                                    className="w-full bg-gray-800/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1.5">Email cannot be changed.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSaving ? "Saving…" : "Save Profile"}
                        </button>
                    </div>
                )}

                {activeTab === "meeting" && (
                    <div className="space-y-5">
                        <div className="p-6 bg-gray-900/50 border border-white/5 rounded-2xl space-y-5">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Default Device State</h3>
                            <Toggle
                                label="Start with microphone on"
                                description="Your mic will be enabled when you join a meeting."
                                checked={defaultMicOn}
                                onChange={setDefaultMicOn}
                            />
                            <Toggle
                                label="Start with camera on"
                                description="Your camera will be enabled when you join a meeting."
                                checked={defaultCameraOn}
                                onChange={setDefaultCameraOn}
                            />
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-white/5 rounded-2xl space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Appearance</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                                <select
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                >
                                    <option value="system">System default</option>
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSaving ? "Saving…" : "Save Preferences"}
                        </button>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="space-y-5">
                        <div className="p-6 bg-gray-900/50 border border-white/5 rounded-2xl space-y-5">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Notification Preferences</h3>
                            <Toggle
                                label="Email notifications"
                                description="Receive meeting reminders and invites via email."
                                checked={emailNotifications}
                                onChange={setEmailNotifications}
                            />
                            <Toggle
                                label="Push notifications"
                                description="Receive in-app push notifications for meeting events."
                                checked={pushNotifications}
                                onChange={setPushNotifications}
                            />
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSaving ? "Saving…" : "Save Notification Settings"}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

function Toggle({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    checked ? "bg-primary-600" : "bg-gray-700"
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        checked ? "translate-x-5" : "translate-x-0"
                    }`}
                />
            </button>
        </div>
    );
}
