"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PreJoinScreenProps {
    meetingId: string;
    meetingTitle?: string;
    onJoin: (settings: JoinSettings) => void;
}

interface JoinSettings {
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
}

export function PreJoinScreen({ meetingId, meetingTitle, onJoin }: PreJoinScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function initDevices() {
            try {
                // Request permissions with mobile-friendly constraints
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user" }, // Default to front camera on mobile
                    audio: true,
                });

                // Get device list
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter((d) => d.kind === "audioinput");
                const videoInputs = devices.filter((d) => d.kind === "videoinput");

                setAudioDevices(audioInputs);
                setVideoDevices(videoInputs);

                if (audioInputs.length) setSelectedAudioDevice(audioInputs[0].deviceId);
                if (videoInputs.length) setSelectedVideoDevice(videoInputs[0].deviceId);

                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (error: any) {
                console.error("Failed to access media devices:", error);
                if (error.name === "NotAllowedError") {
                    alert("Camera and microphone access denied. Please allow access in your browser settings to join the meeting.");
                } else if (error.name === "NotFoundError") {
                    alert("No camera or microphone found. Please connect a device.");
                } else {
                    alert(`Failed to access media devices: ${error.message || "Unknown error"}`);
                }
            } finally {
                setIsLoading(false);
            }
        }

        initDevices();

        return () => {
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    useEffect(() => {
        if (stream) {
            stream.getVideoTracks().forEach((track) => {
                track.enabled = videoEnabled;
            });
            stream.getAudioTracks().forEach((track) => {
                track.enabled = audioEnabled;
            });
        }
    }, [audioEnabled, videoEnabled, stream]);

    const handleJoin = () => {
        stream?.getTracks().forEach((track) => track.stop());
        onJoin({
            audioEnabled,
            videoEnabled,
            audioDeviceId: selectedAudioDevice,
            videoDeviceId: selectedVideoDevice,
        });
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {meetingTitle || "Join Meeting"}
                    </h1>
                    <p className="text-gray-400">Meeting ID: {meetingId}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Video preview */}
                    <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${!videoEnabled ? "hidden" : ""}`}
                                />
                                {!videoEnabled && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
                                            <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Toggle buttons */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            <button
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                className={`p-3 rounded-full ${audioEnabled ? "bg-gray-700" : "bg-red-600"
                                    }`}
                            >
                                {audioEnabled ? (
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={() => setVideoEnabled(!videoEnabled)}
                                className={`p-3 rounded-full ${videoEnabled ? "bg-gray-700" : "bg-red-600"
                                    }`}
                            >
                                {videoEnabled ? (
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Microphone
                            </label>
                            <select
                                value={selectedAudioDevice}
                                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {audioDevices.map((device) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Camera
                            </label>
                            <select
                                value={selectedVideoDevice}
                                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                {videoDevices.map((device) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleJoin}
                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
                        >
                            Join Meeting
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
