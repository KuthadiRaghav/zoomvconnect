import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useState } from "react";
import clsx from "clsx";

interface MeetingControlsProps {
    onLeave: () => void;
    onEnd?: () => void;
    onToggleChat: () => void;
    isChatOpen: boolean;
    isRecording: boolean;
    onToggleRecording: () => void;
    isHost: boolean;
}

export function MeetingControls({
    onLeave,
    onEnd,
    onToggleChat,
    isChatOpen,
    isRecording,
    onToggleRecording,
    isHost,
}: MeetingControlsProps) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();

    // Local state for toggles (livekit handles actual state, but we need force update sometimes or just use their hooks)
    // Actually, we should use their hooks or manual track management
    const [isMicOn, setIsMicOn] = useState(localParticipant.isMicrophoneEnabled);
    const [isCamOn, setIsCamOn] = useState(localParticipant.isCameraEnabled);
    const [isScreenShareOn, setIsScreenShareOn] = useState(localParticipant.isScreenShareEnabled);

    const toggleMic = async () => {
        const newState = !isMicOn;
        await localParticipant.setMicrophoneEnabled(newState);
        setIsMicOn(newState);
    };

    const toggleCam = async () => {
        const newState = !isCamOn;
        await localParticipant.setCameraEnabled(newState);
        setIsCamOn(newState);
    };

    const toggleScreenShare = async () => {
        const newState = !isScreenShareOn;
        await localParticipant.setScreenShareEnabled(newState);
        setIsScreenShareOn(newState);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[95vw] sm:max-w-fit overflow-x-auto no-scrollbar px-4 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl min-w-max mx-auto">
                {/* Mic */}
                <ControlButton
                    onClick={toggleMic}
                    isActive={isMicOn}
                    activeClass="bg-gray-700 text-white hover:bg-gray-600"
                    inactiveClass="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    label={isMicOn ? "Mute" : "Unmute"}
                >
                    {isMicOn ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                    )}
                </ControlButton>

                {/* Camera */}
                <ControlButton
                    onClick={toggleCam}
                    isActive={isCamOn}
                    activeClass="bg-gray-700 text-white hover:bg-gray-600"
                    inactiveClass="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    label={isCamOn ? "Stop Video" : "Start Video"}
                >
                    {isCamOn ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                    )}
                </ControlButton>

                {/* Screen Share */}
                <ControlButton
                    onClick={toggleScreenShare}
                    isActive={isScreenShareOn}
                    activeClass="bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    inactiveClass="bg-gray-700 text-white hover:bg-gray-600"
                    label="Share Screen"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </ControlButton>

                <div className="w-px h-8 bg-gray-700 mx-2" />

                {/* Record (Host only) */}
                {isHost && (
                    <ControlButton
                        onClick={onToggleRecording}
                        isActive={isRecording}
                        activeClass="bg-red-500/10 text-red-500 animate-pulse border border-red-500/50"
                        inactiveClass="bg-gray-700 text-white hover:bg-gray-600"
                        label={isRecording ? "Stop Recording" : "Record"}
                    >
                        <div className={clsx("w-3 h-3 rounded-full", isRecording ? "bg-red-500" : "bg-white group-hover:bg-red-400")} />
                    </ControlButton>
                )}

                {/* Chat */}
                <ControlButton
                    onClick={onToggleChat}
                    isActive={isChatOpen}
                    activeClass="bg-primary-600 text-white"
                    inactiveClass="bg-gray-700 text-white hover:bg-gray-600"
                    label="Chat"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </ControlButton>

                <div className="w-px h-8 bg-gray-700 mx-2" />

                {/* End / Leave */}
                {isHost ? (
                    <div className="flex gap-2">
                        <ControlButton
                            onClick={onEnd!}
                            isActive={false}
                            activeClass=""
                            inactiveClass="bg-red-600 text-white hover:bg-red-500"
                            label="End for All"
                        >
                            <span className="text-xs font-bold text-white px-1">END</span>
                        </ControlButton>
                        <ControlButton
                            onClick={onLeave}
                            isActive={false}
                            activeClass=""
                            inactiveClass="bg-gray-700 text-white hover:bg-gray-600"
                            label="Leave"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </ControlButton>
                    </div>
                ) : (
                    <ControlButton
                        onClick={onLeave}
                        isActive={false}
                        activeClass=""
                        inactiveClass="bg-red-600 text-white hover:bg-red-500"
                        label="Leave Meeting"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </ControlButton>
                )}
            </div>
        </div>
    );
}

interface ControlButtonProps {
    onClick: () => void;
    isActive: boolean;
    activeClass: string;
    inactiveClass: string;
    children: React.ReactNode;
    label?: string;
}

function ControlButton({ onClick, isActive, activeClass, inactiveClass, children, label }: ControlButtonProps) {
    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={clsx(
                    "p-2 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-center touch-manipulation",
                    isActive ? activeClass : inactiveClass
                )}
                title={label}
            >
                {children}
            </button>
            {label && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {label}
                </div>
            )}
        </div>
    );
}
