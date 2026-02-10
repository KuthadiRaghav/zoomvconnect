"use client";

import { useEffect, useRef, useState } from "react";

interface PreJoinProps {
    user: { name: string; email?: string };
    meetingTitle?: string;
    onJoin: (settings: { audio: boolean; video: boolean }) => void;
    onCancel: () => void;
}

export default function PreJoin({ user, meetingTitle, onJoin, onCancel }: PreJoinProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [error, setError] = useState("");
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                if (mounted) {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }
            } catch (err) {
                console.error("Failed to access media devices:", err);
                if (mounted) setError("Could not access camera or microphone. Please check permissions.");
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach((track) => (track.enabled = !videoEnabled));
            setVideoEnabled(!videoEnabled);
        }
    };

    const toggleAudio = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach((track) => (track.enabled = !audioEnabled));
            setAudioEnabled(!audioEnabled);
        }
    };

    const handleJoin = () => {
        // Stop the local preview stream so LiveKit can take over
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
        onJoin({ audio: audioEnabled, video: videoEnabled });
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-900/50 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl flex flex-col md:flex-row gap-8">
                {/* Video Preview */}
                <div className="flex-1 relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-white/5 group">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${videoEnabled ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {!videoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={toggleAudio}
                            className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-400'}`}
                        >
                            {audioEnabled ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                            )}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-full transition-colors ${videoEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-400'}`}
                        >
                            {videoEnabled ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="md:w-80 flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Ready to join?</h2>
                        <p className="text-gray-400 mb-8">{meetingTitle || "Meeting"}</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    </div>
                                    <span className="text-gray-300">Microphone</span>
                                </div>
                                <span className={`text-sm ${audioEnabled ? 'text-green-400' : 'text-gray-500'}`}>{audioEnabled ? 'On' : 'Off'}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </div>
                                    <span className="text-gray-300">Camera</span>
                                </div>
                                <span className={`text-sm ${videoEnabled ? 'text-green-400' : 'text-gray-500'}`}>{videoEnabled ? 'On' : 'Off'}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mt-8">
                        <button
                            onClick={handleJoin}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-900/40 transform hover:scale-[1.02] transition-all"
                        >
                            Join Now
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
