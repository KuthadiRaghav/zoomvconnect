"use client";

import { useState, useCallback } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

type BGMode = "none" | "blur" | "image";

interface BgOption {
    id: string;
    label: string;
    mode: BGMode;
    imageSrc?: string;
    gradient?: string;
}

const BG_OPTIONS: BgOption[] = [
    { id: "none", label: "None", mode: "none" },
    { id: "blur", label: "Blur", mode: "blur" },
    { id: "office", label: "Office", mode: "image", gradient: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" },
    { id: "beach", label: "Beach", mode: "image", gradient: "linear-gradient(180deg,#87CEEB 50%,#f4d03f 50%,#e67e22 100%)" },
    { id: "forest", label: "Forest", mode: "image", gradient: "linear-gradient(180deg,#1e8449 0%,#196f3d 60%,#0e4024 100%)" },
    { id: "city", label: "City Night", mode: "image", gradient: "linear-gradient(180deg,#0d1117 0%,#1a1a2e 40%,#162447 100%)" },
];

interface VirtualBackgroundPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VirtualBackgroundPanel({ isOpen, onClose }: VirtualBackgroundPanelProps) {
    const { localParticipant } = useLocalParticipant();
    const [active, setActive] = useState<string>("none");
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyBackground = useCallback(
        async (option: BgOption) => {
            if (applying) return;
            setApplying(true);
            setError(null);

            try {
                const pub = localParticipant.getTrackPublication(Track.Source.Camera);
                const track = pub?.track;

                if (!track) {
                    setError("Camera is not active");
                    setApplying(false);
                    return;
                }

                if (option.mode === "none") {
                    await (track as any).stopProcessor?.();
                } else if (option.mode === "blur") {
                    const { BackgroundBlur } = await import("@livekit/track-processors");
                    await (track as any).setProcessor(BackgroundBlur(15));
                } else if (option.mode === "image" && option.gradient) {
                    // Render gradient to a canvas and use as virtual background image
                    const canvas = document.createElement("canvas");
                    canvas.width = 1280;
                    canvas.height = 720;
                    const ctx = canvas.getContext("2d")!;
                    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    // Parse the gradient stops from the CSS string as a rough approximation
                    // Use a solid fill derived from the gradient's dominant colors
                    const img = new Image();
                    const svgUrl = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'><defs><style>rect{background:${encodeURIComponent(option.gradient)}}</style></defs><foreignObject width='100%' height='100%'><div xmlns='http://www.w3.org/1999/xhtml' style='width:1280px;height:720px;background:${encodeURIComponent(option.gradient)}'></div></foreignObject></svg>`;

                    const { VirtualBackground } = await import("@livekit/track-processors");
                    // Use blob URL of a rendered gradient image
                    const bgCanvas = document.createElement("canvas");
                    bgCanvas.width = 1280;
                    bgCanvas.height = 720;
                    const bgCtx = bgCanvas.getContext("2d")!;
                    // Simple solid color from gradient (use mid-stop color as fallback)
                    bgCtx.fillStyle = extractDominantColor(option.gradient);
                    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
                    const blob = await new Promise<Blob>((resolve) => bgCanvas.toBlob((b) => resolve(b!)));
                    const url = URL.createObjectURL(blob);
                    await (track as any).setProcessor(VirtualBackground(url));
                }

                setActive(option.id);
            } catch (err) {
                setError("Virtual backgrounds require the track-processors package. Run pnpm install.");
                console.error(err);
            }

            setApplying(false);
        },
        [localParticipant, applying]
    );

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold">Virtual Background</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {error && (
                <p className="text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2 mb-3 border border-amber-400/20">
                    {error}
                </p>
            )}

            <div className="grid grid-cols-3 gap-2">
                {BG_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => applyBackground(opt)}
                        disabled={applying}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            active === opt.id
                                ? "border-primary-500 shadow-lg shadow-primary-500/20"
                                : "border-white/10 hover:border-white/30"
                        }`}
                    >
                        <div
                            className="w-full h-14 flex items-center justify-center"
                            style={{
                                background:
                                    opt.mode === "none"
                                        ? "#1f2937"
                                        : opt.mode === "blur"
                                        ? "rgba(99,102,241,0.3)"
                                        : opt.gradient,
                            }}
                        >
                            {opt.mode === "none" && (
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            )}
                            {opt.mode === "blur" && (
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-300 text-center py-1 bg-black/40">{opt.label}</p>
                        {active === opt.id && (
                            <div className="absolute top-1 right-1 w-3 h-3 bg-primary-500 rounded-full flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {applying && (
                <p className="text-xs text-gray-400 text-center mt-3 animate-pulse">Applying background...</p>
            )}
        </div>
    );
}

function extractDominantColor(gradient: string): string {
    const match = gradient.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : "#1a1a2e";
}
