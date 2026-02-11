import Link from "next/link";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-lg sm:text-xl font-bold text-white">ZoomVconnect</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link
                            href="/login"
                            className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors hidden xs:block"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="px-3 py-2 sm:px-4 sm:py-2 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-500 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center">
                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                            Video Meetings
                            <br />
                            <span className="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
                                Made Simple
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                            Connect with anyone, anywhere. High-quality video conferencing
                            for teams of all sizes with enterprise-grade security.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/meeting/new"
                                className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-xl text-lg font-semibold hover:bg-primary-500 transition-all hover:scale-105"
                            >
                                Start a Meeting
                            </Link>
                            <Link
                                href="/join"
                                className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white rounded-xl text-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
                            >
                                Join a Meeting
                            </Link>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="mt-32 grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                            title="Up to 1000 Participants"
                            description="Host large meetings and webinars with crystal-clear audio and video quality."
                        />
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            }
                            title="Enterprise Security"
                            description="End-to-end encryption, waiting rooms, and role-based access controls."
                        />
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            title="Recording & Transcription"
                            description="Automatically record meetings and get AI-powered transcripts and summaries."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary-500/50 transition-all">
            <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400">{description}</p>
        </div>
    );
}
