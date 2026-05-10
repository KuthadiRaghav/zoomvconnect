"use client";

import { useLiveCaptions } from "@/lib/useLiveCaptions";

interface CaptionsOverlayProps {
    enabled: boolean;
}

export function CaptionsOverlay({ enabled }: CaptionsOverlayProps) {
    const segments = useLiveCaptions(enabled);

    if (!enabled || segments.length === 0) return null;

    // Show only the most recent 3 segments
    const visible = segments.slice(-3);

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none">
            <div className="space-y-1">
                {visible.map((seg) => (
                    <div
                        key={seg.id}
                        className="flex items-start gap-2 bg-black/75 backdrop-blur-sm rounded-lg px-4 py-2 mx-auto max-w-fit"
                    >
                        <span className="text-primary-400 text-xs font-semibold whitespace-nowrap pt-0.5 shrink-0">
                            {seg.speakerName}:
                        </span>
                        <span
                            className={`text-sm leading-snug ${
                                seg.final ? "text-white" : "text-gray-300 italic"
                            }`}
                        >
                            {seg.text}
                            {!seg.final && (
                                <span className="inline-flex gap-0.5 ml-1">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                </span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
